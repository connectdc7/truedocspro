// supabase/functions/save-card-details/index.ts
//
// Called right after the browser confirms a SetupIntent. Verifies it
// actually succeeded and belongs to this user, sets the resulting card
// as the customer's default payment method (so we know which one to
// charge later), and saves the display details (brand/last4/expiry)
// so the site can show what's on file and check expiry before letting
// someone submit a document.

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
    const { setup_intent_id } = await req.json()
    if (!setup_intent_id) {
      return new Response(JSON.stringify({ error: 'setup_intent_id is required' }), {
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
    const user = userData.user

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No Stripe customer on file' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id, { expand: ['payment_method'] })

    if (setupIntent.customer !== profile.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'This card does not belong to you' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (setupIntent.status !== 'succeeded') {
      return new Response(JSON.stringify({ error: 'Card setup did not complete successfully' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod
    const card = paymentMethod?.card
    if (!card) {
      return new Response(JSON.stringify({ error: 'No card details found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await stripe.customers.update(profile.stripe_customer_id, {
      invoice_settings: { default_payment_method: paymentMethod.id },
    })

    await supabaseAdmin
      .from('profiles')
      .update({
        card_brand: card.brand,
        card_last4: card.last4,
        card_exp_month: card.exp_month,
        card_exp_year: card.exp_year,
      })
      .eq('id', user.id)

    return new Response(JSON.stringify({ success: true, brand: card.brand, last4: card.last4 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
