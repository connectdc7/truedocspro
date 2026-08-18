// supabase/functions/create-fee-checkout-session/index.ts
//
// Called when a client pays for additional fees staff added to their
// order (Secretary of State, embassy fees, etc.) — separate from the
// original service checkout.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fee_ids, success_url, cancel_url } = await req.json()
    if (!fee_ids || !Array.isArray(fee_ids) || fee_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'fee_ids is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch the fees along with their parent order, to confirm ownership
    const { data: fees, error: feesError } = await supabaseAdmin
      .from('order_fees')
      .select('*, orders!inner(id, user_id, document_name)')
      .in('id', fee_ids)

    if (feesError || !fees || fees.length !== fee_ids.length) {
      return new Response(JSON.stringify({ error: 'One or more fees not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (fees.some((f) => f.orders.user_id !== userData.user.id)) {
      return new Response(JSON.stringify({ error: 'Not authorized for one or more fees' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (fees.some((f) => f.paid)) {
      return new Response(JSON.stringify({ error: 'One or more fees are already paid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
    })

    const lineItems = fees.map((f) => ({
      price_data: {
        currency: 'usd',
        unit_amount: f.amount_cents,
        product_data: { name: `${f.description} — ${f.orders.document_name}` },
      },
      quantity: 1,
    }))

    const primaryOrderId = fees[0].orders.id

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: userData.user.email,
      line_items: lineItems,
      metadata: { fee_ids: fee_ids.join(',') },
      success_url: success_url || `${req.headers.get('origin')}/portal/orders/${primaryOrderId}?fees=success`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/portal/orders/${primaryOrderId}?fees=cancelled`,
    })

    const { error: updateError } = await supabaseAdmin
      .from('order_fees')
      .update({ stripe_checkout_session_id: session.id })
      .in('id', fee_ids)

    if (updateError) {
      return new Response(JSON.stringify({ error: `Could not save fees: ${updateError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
