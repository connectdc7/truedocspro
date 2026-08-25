// supabase/functions/notify-new-message/index.ts
//
// Called right after a message is inserted on an order's message
// thread. If a client sent it, emails the assigned staff member (or
// an admin, if unassigned). If staff sent it, emails the client.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { order_id, sender, message } = await req.json()
    if (!order_id || !sender || !message) {
      return new Response(JSON.stringify({ error: 'order_id, sender, and message are required' }), {
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

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('document_name, user_id, assigned_to, profiles ( email, full_name )')
      .eq('id', order_id)
      .single()
    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'Email is not configured yet (missing RESEND_API_KEY)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'True Doc Pros <onboarding@resend.dev>'
    const siteUrl = Deno.env.get('SITE_URL') || 'https://truedocpros.com'

    let toEmail = null
    let toFirstName = 'there'
    let link = ''
    let heading = ''

    if (sender === 'client') {
      let staffEmail = null
      let staffName = null
      if (order.assigned_to) {
        const { data: staffProfile } = await supabaseAdmin
          .from('profiles')
          .select('email, full_name')
          .eq('id', order.assigned_to)
          .single()
        staffEmail = staffProfile?.email
        staffName = staffProfile?.full_name
      }
      if (!staffEmail) {
        const { data: adminProfile } = await supabaseAdmin
          .from('profiles')
          .select('email, full_name')
          .eq('is_admin', true)
          .limit(1)
          .single()
        staffEmail = adminProfile?.email
        staffName = adminProfile?.full_name
      }
      toEmail = staffEmail
      toFirstName = staffName ? staffName.split(' ')[0] : 'there'
      link = `${siteUrl}/staff/orders/${order_id}`
      heading = `New message about ${order.document_name}`
    } else {
      toEmail = order.profiles ? order.profiles.email : null
      toFirstName = order.profiles && order.profiles.full_name ? order.profiles.full_name.split(' ')[0] : 'there'
      link = `${siteUrl}/portal/orders/${order_id}`
      heading = `New reply about ${order.document_name}`
    }

    if (!toEmail) {
      return new Response(JSON.stringify({ error: 'Recipient email not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #0F1B33;">
        <h2 style="font-family: Georgia, serif;">${heading}</h2>
        <p>Hi ${toFirstName},</p>
        <p style="padding: 14px 16px; background: #F2F4F7; border-radius: 10px; white-space: pre-wrap;">${message}</p>
        <p style="margin-top: 24px;">
          <a href="${link}"
             style="background:#0F1B33;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">
            View and reply
          </a>
        </p>
        <p style="margin-top:12px;font-size:12px;color:#57616F;">— True Doc Pros</p>
        <div style="text-align:center; margin-top:20px;"><img src="https://truedocpros.com/email-seal.png" width="56" height="56" alt="True Doc Pros" style="display:inline-block;" /></div>
      </div>
    `

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject: heading,
        html,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      return new Response(JSON.stringify({ error: `Email failed to send: ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
