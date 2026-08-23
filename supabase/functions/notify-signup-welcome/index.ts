// supabase/functions/notify-signup-welcome/index.ts
//
// Called right after a new client creates an account. Confirms the
// account was created and gives them a direct link to log in.
//
// Deliberately does NOT include their password — emailing a live
// password is a real security risk (email isn't secure storage), so
// this just confirms the email address used and links to login.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, full_name } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400,
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
    const firstName = full_name?.split(' ')[0] || 'there'

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #0F1B33;">
        <h2 style="font-family: Georgia, serif;">Welcome to True Doc Pros</h2>
        <p>Hi ${firstName},</p>
        <p>Your account has been created with the email address <strong>${email}</strong>. You can log in
        anytime using that email and the password you just chose.</p>
        <p>From your portal you can submit documents, track them through notarization, apostille, or
        embassy legalization, and download completed copies once they're ready.</p>
        <p style="margin-top: 24px;">
          <a href="${siteUrl}/login"
             style="background:#0F1B33;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">
            Log in to your portal
          </a>
        </p>
        <p style="margin-top:24px;font-size:12px;color:#57616F;">
          For your security, we never include your password in emails. If you ever forget it, use the
          "Forgot password?" link on the login page to reset it.
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
        subject: 'Welcome to True Doc Pros — your account is ready',
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
