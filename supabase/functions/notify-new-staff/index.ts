// supabase/functions/notify-new-staff/index.ts
//
// Called from the Team page when someone is promoted to staff.
// Sends a welcome email. Requires RESEND_API_KEY (same as notify-client).

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
    const { profile_id } = await req.json()
    if (!profile_id) {
      return new Response(JSON.stringify({ error: 'profile_id is required' }), {
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

    const { data: newStaff } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', profile_id)
      .single()

    if (!newStaff?.email) {
      return new Response(JSON.stringify({ error: 'New staff member not found' }), {
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
    const firstName = newStaff.full_name?.split(' ')[0] || 'there'

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #16233F;">
        <h2 style="font-family: Georgia, serif;">Congratulations, and welcome to the TDP Team!</h2>
        <p>Hi ${firstName},</p>
        <p>Congratulations, and welcome to the TDP Team. You are an asset to the team — don't hesitate to
        reach out with any questions.</p>
        <p>Log back in to your TDP portal to see the Staff tab and begin helping your team.</p>
        <p style="margin-top: 24px;">
          <a href="${siteUrl}/login"
             style="background:#16233F;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">
            Log in
          </a>
        </p>
        <p style="margin-top:24px;font-size:12px;color:#5C6470;">— True Doc Pros</p>
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
        to: newStaff.email,
        subject: 'Welcome to the True Doc Pros team!',
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
