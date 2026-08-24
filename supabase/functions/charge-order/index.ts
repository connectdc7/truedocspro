// supabase/functions/charge-order/index.ts
//
// Called from the staff order page's "Take payment" button. Computes
// the order's current total (handling fee + expedited surcharge + SOS
// fee + embassy fee + any additional fees), charges the client's saved
// card off-session, marks everything paid, and emails an invoice with
// a steps-to-completion timeline.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRICE_CENTS: Record<string, number> = { notary: 2500, apostille: 8500, embassy: 15000 }
const EXPEDITE_CENTS: Record<string, number> = { notary: 1500, apostille: 4000, embassy: 7500 }
const SERVICE_LABEL: Record<string, string> = { notary: 'Notary', apostille: 'Apostille', embassy: 'Embassy legalization' }

function completionSteps(service: string): { steps: string[]; note: string } {
  if (service === 'apostille') {
    return {
      steps: ['Notary (if needed)', 'Secretary of State', 'Completed'],
      note: 'Timeline varies depending on Secretary of State processing times.',
    }
  }
  if (service === 'embassy') {
    return {
      steps: ['Notary (if needed)', 'Secretary of State', 'U.S. State Department', 'Embassy Legalization', 'Completed'],
      note: 'Timeline varies depending on Secretary of State, U.S. State Department, and embassy processing times.',
    }
  }
  return { steps: ['Notary', 'Completed'], note: '' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { order_id } = await req.json()
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), {
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

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_staff')
      .eq('id', userData.user.id)
      .single()
    if (!callerProfile?.is_staff) {
      return new Response(JSON.stringify({ error: 'Staff access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, profiles ( email, full_name, stripe_customer_id, card_last4, card_exp_month, card_exp_year )')
      .eq('id', order_id)
      .single()
    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (order.payment_status === 'paid') {
      return new Response(JSON.stringify({ error: 'This order has already been paid.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const customerId = order.profiles?.stripe_customer_id
    if (!customerId || !order.profiles?.card_last4) {
      return new Response(JSON.stringify({ error: 'This client has no payment method on file.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const now = new Date()
    const expYear = order.profiles.card_exp_year
    const expMonth = order.profiles.card_exp_month
    if (!expYear || !expMonth || expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
      return new Response(JSON.stringify({ error: "This client's card on file has expired." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const items: { label: string; amount: number }[] = []
    const basePrice = PRICE_CENTS[order.service] ?? 0
    items.push({ label: `${SERVICE_LABEL[order.service]} handling fee`, amount: basePrice / 100 })
    if (order.is_expedited) {
      const expedite = EXPEDITE_CENTS[order.service] ?? 0
      items.push({ label: 'Expedited processing', amount: expedite / 100 })
    }
    if (order.arrived_notarized) {
      items.push({ label: 'Notary fee (waived — arrived pre-notarized)', amount: 0 })
    }
    if (order.sos_fee_cents > 0) {
      items.push({ label: `Secretary of State fee${order.origin_state ? ` (${order.origin_state})` : ''}`, amount: order.sos_fee_cents / 100 })
    }
    if (order.embassy_fee_cents > 0) {
      items.push({ label: `Embassy fee${order.destination_country ? ` (${order.destination_country})` : ''}`, amount: order.embassy_fee_cents / 100 })
    }

    const { data: unpaidFees } = await supabaseAdmin
      .from('order_fees')
      .select('*')
      .eq('order_id', order_id)
      .eq('paid', false)
    ;(unpaidFees ?? []).forEach((fee) => {
      items.push({ label: fee.description, amount: fee.amount_cents / 100 })
    })

    const totalDollars = items.reduce((sum, item) => sum + item.amount, 0)
    const totalCents = Math.round(totalDollars * 100)

    if (totalCents <= 0) {
      return new Response(JSON.stringify({ error: 'Total is $0 — nothing to charge.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })

    const customer = await stripe.customers.retrieve(customerId)
    const defaultPaymentMethod =
      typeof customer !== 'string' && !customer.deleted
        ? (customer.invoice_settings?.default_payment_method as string | null)
        : null

    if (!defaultPaymentMethod) {
      return new Response(JSON.stringify({ error: 'No default payment method found for this customer.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let paymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: 'usd',
        customer: customerId,
        payment_method: defaultPaymentMethod,
        off_session: true,
        confirm: true,
        description: `${SERVICE_LABEL[order.service]} — ${order.document_name}`,
        metadata: { order_id },
      })
    } catch (stripeErr) {
      const message = stripeErr instanceof Error ? stripeErr.message : String(stripeErr)
      return new Response(JSON.stringify({ error: `Card charge failed: ${message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (paymentIntent.status !== 'succeeded') {
      return new Response(JSON.stringify({ error: `Charge did not complete (status: ${paymentIntent.status}).` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabaseAdmin
      .from('orders')
      .update({ payment_status: 'paid', amount_cents: totalCents, stripe_checkout_session_id: paymentIntent.id })
      .eq('id', order_id)
    if (unpaidFees && unpaidFees.length > 0) {
      await supabaseAdmin.from('order_fees').update({ paid: true }).eq('order_id', order_id).eq('paid', false)
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'True Doc Pros <onboarding@resend.dev>'
      const siteUrl = Deno.env.get('SITE_URL') || 'https://truedocpros.com'
      const firstName = order.profiles?.full_name?.split(' ')[0] || 'there'
      const { steps, note } = completionSteps(order.service)

      const rowsHtml = items
        .map(
          (item) => `
          <tr>
            <td style="padding:6px 0; font-size:14px; color:#0F1B33;">${item.label}</td>
            <td style="padding:6px 0; font-size:14px; color:#0F1B33; text-align:right;">$${item.amount.toFixed(2)}</td>
          </tr>
        `
        )
        .join('')

      const stepsHtml = steps
        .map(
          (step, i) => `
          <span style="display:inline-block; background:#F2F4F7; border:1px solid #E1E4EA; border-radius:999px; padding:6px 12px; font-size:12px; color:#0F1B33; margin:3px 3px 3px 0;">
            ${i + 1}. ${step}
          </span>
        `
        )
        .join('')

      const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #0F1B33;">
          <h2 style="font-family: Georgia, serif;">Payment confirmed</h2>
          <p>Hi ${firstName},</p>
          <p>We've charged your card on file for <strong>${order.document_name}</strong> and begun processing.</p>
          <table style="width:100%; border-collapse:collapse; margin-top:16px;">
            ${rowsHtml}
            <tr>
              <td style="padding:10px 0; font-size:15px; font-weight:700; border-top:1px solid #E1E4EA;">Total charged</td>
              <td style="padding:10px 0; font-size:15px; font-weight:700; text-align:right; border-top:1px solid #E1E4EA;">$${totalDollars.toFixed(2)}</td>
            </tr>
          </table>

          <p style="margin-top:24px; font-family: monospace; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; color: #C9A227;">
            Steps to completion
          </p>
          <div style="margin-top:8px;">${stepsHtml}</div>
          ${note ? `<p style="margin-top:10px; font-size:12px; color:#57616F;">${note}</p>` : ''}

          <p style="margin-top: 24px;">
            <a href="${siteUrl}/portal/orders/${order_id}"
               style="background:#0F1B33;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">
              View your order
            </a>
          </p>
          <p style="margin-top:12px;font-size:12px;color:#57616F;">— True Doc Pros</p>
          <div style="text-align:center; margin-top:20px;"><img src="https://truedocpros.com/email-seal.png" width="56" height="56" alt="True Doc Pros" style="display:inline-block;" /></div>
        </div>
      `

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: order.profiles.email,
          subject: `Payment confirmed — ${order.document_name}`,
          html,
        }),
      })
    }

    return new Response(JSON.stringify({ success: true, charged_cents: totalCents }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
