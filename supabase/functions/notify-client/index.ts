// supabase/functions/notify-client/index.ts
//
// Called from the staff portal after a status change, a document
// request, or any other update worth telling the client about.
// Sends a plain, clear email via Resend. Requires the RESEND_API_KEY
// secret (and optionally RESEND_FROM_EMAIL) to be set in Supabase.

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
    const { order_id, subject, message } = await req.json()
    if (!order_id || !subject || !message) {
      return new Response(JSON.stringify({ error: 'order_id, subject, and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the caller is staff
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

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_staff')
      .eq('id', userData.user.id)
      .single()
    if (!profile?.is_staff) {
      return new Response(JSON.stringify({ error: 'Staff access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, profiles:user_id (email)')
      .eq('id', order_id)
      .single()

    const clientEmail = order?.profiles?.email
    if (!clientEmail) {
      return new Response(JSON.stringify({ error: 'Client email not found' }), {
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
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'True Docs Pro <onboarding@resend.dev>'

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #16233F;">
        <h2 style="font-family: Georgia, serif;">${subject}</h2>
        <p>${message.replace(/\n/g, '<br/>')}</p>
        <p style="margin-top: 24px;">
          <a href="${Deno.env.get('SITE_URL') || 'https://truedocpros.com'}/portal/orders/${order_id}"
             style="background:#16233F;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">
            View your document
          </a>
        </p>
        <p style="margin-top:24px;font-size:12px;color:#5C6470;">— True Docs Pro</p>
      </div>
    `

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: clientEmail,
        subject,
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
