// supabase/functions/request-password-reset/index.ts
//
// Sends the password reset link via our own Resend connection instead
// of Supabase's built-in email system — which is capped at just 2
// emails/hour with custom SMTP off. Uses generateLink to create the
// secure reset link without Supabase sending any email itself.
//
// Never reveals whether an email exists — always returns success,
// same as before, to avoid leaking which addresses have accounts.

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
    const { email } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const siteUrl = Deno.env.get('SITE_URL') || 'https://truedocpros.com'

    const { data: linked, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    })

    // Don't reveal whether the account exists — just return success
    // either way, unless something went genuinely wrong sending mail.
    if (linkError || !linked?.properties?.action_link) {
      return new Response(JSON.stringify({ sent: true }), {
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
    const resetLink = linked.properties.action_link

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #0F1B33;">
        <h2 style="font-family: Georgia, serif;">Reset your password</h2>
        <p>We received a request to reset the password for your True Doc Pros account.</p>
        <p style="margin-top: 24px;">
          <a href="${resetLink}"
             style="background:#0F1B33;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">
            Set a new password
          </a>
        </p>
        <p style="margin-top:24px;font-size:12px;color:#57616F;">
          If you didn't request this, you can safely ignore this email — your password won't be changed.
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
        to: email,
        subject: 'Reset your True Doc Pros password',
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
