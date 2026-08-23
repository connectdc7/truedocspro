// supabase/functions/invite-staff/index.ts
//
// Called from the Team page's "Invite by email" form. Works whether or
// not that email already has an account:
//   - New email: creates the account and sends Supabase's built-in
//     invite email (a link to set a password and log in).
//   - Existing email: just promotes their existing account to staff.
// Either way, is_staff gets set to true and our own welcome email
// (via Resend) goes out.

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
    const { email, full_name, title } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
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

    // Does a profile with this email already exist?
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    let profileId = existing?.id

    if (!profileId) {
      // Brand new person — create their account and send Supabase's
      // built-in invite email (sets password, then logs them in)
      const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${Deno.env.get('SITE_URL') || 'https://truedocpros.com'}/login`,
        data: {
          full_name: full_name || null,
          title: title || null,
        },
      })
      if (inviteError || !invited?.user) {
        return new Response(JSON.stringify({ error: `Could not invite: ${inviteError?.message}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      profileId = invited.user.id
    }

    // The handle_new_user trigger creates the profile row automatically
    // when the auth user is created — this should already exist, but
    // retry briefly in case of a timing gap.
    let updateError = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          is_staff: true,
          ...(full_name ? { full_name } : {}),
          ...(title ? { title } : {}),
        })
        .eq('id', profileId)
      updateError = error
      if (!error) break
      await new Promise((r) => setTimeout(r, 400))
    }

    if (updateError) {
      return new Response(JSON.stringify({ error: `Could not update profile: ${updateError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send our own welcome email (best-effort — don't fail the whole
    // request if this part has trouble)
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'True Doc Pros <onboarding@resend.dev>'
      const siteUrl = Deno.env.get('SITE_URL') || 'https://truedocpros.com'
      const firstName = full_name?.split(' ')[0] || 'there'
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
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to: email, subject: 'Welcome to the True Doc Pros team!', html }),
      })
    }

    return new Response(JSON.stringify({ success: true, new_account: !existing }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
