// supabase/functions/stripe-webhook/index.ts
//
// Stripe calls this automatically whenever a payment completes.
// It verifies the request really came from Stripe, then marks the
// matching order as paid. This is the only trustworthy place payment
// status gets set — never set from the browser.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  const body = await req.text()

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-06-20',
  })

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.order_id

    if (orderId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId)
        .eq('stripe_checkout_session_id', session.id)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
