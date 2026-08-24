// supabase/functions/create-setup-intent/index.ts
//
// Called from the client's Account page when they add or update their
// payment method. Creates (or reuses) a Stripe Customer for this user,
// then creates a SetupIntent so the browser can securely collect and
// save a card without charging it. usage: 'off_session' means we can
// later charge this card automatically, without the client present.

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
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: profile?.full_name || undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabaseAdmin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      payment_method_types: ['card'],
    })

    return new Response(JSON.stringify({ client_secret: setupIntent.client_secret }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
