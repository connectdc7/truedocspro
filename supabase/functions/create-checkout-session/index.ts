// supabase/functions/create-checkout-session/index.ts
//
// Called by the website right after a client submits a document.
// Verifies the order belongs to the logged-in client, then creates a
// Stripe Checkout session for the correct amount and returns its URL.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

const PRICE_CENTS: Record<string, number> = {
  notary: 2500,
  apostille: 8500,
  embassy: 15000,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { order_id, success_url, cancel_url } = await req.json()
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Identify the caller from their auth token
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: userData, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use the service role to look up (and later update) the order,
    // bypassing RLS, but only ever for a row that belongs to this user.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', userData.user.id)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (order.payment_status === 'paid') {
      return new Response(JSON.stringify({ error: 'Order is already paid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const amount = PRICE_CENTS[order.service] ?? 0
    if (amount <= 0) {
      return new Response(JSON.stringify({ error: 'Unknown service or price' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: userData.user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            product_data: {
              name: `${order.service.charAt(0).toUpperCase() + order.service.slice(1)} — ${order.document_name}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { order_id: order.id },
      success_url: success_url || `${req.headers.get('origin')}/portal/orders/${order.id}?payment=success`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/portal/orders/${order.id}?payment=cancelled`,
    })

    await supabaseAdmin
      .from('orders')
      .update({ amount_cents: amount, stripe_checkout_session_id: session.id })
      .eq('id', order.id)

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
