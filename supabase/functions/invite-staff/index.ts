// supabase/functions/invite-staff/index.ts
//
// Called from the Team page's "Invite by email" form. Works whether or
// not that email already has an account:
//   - New email: creates the account via generateLink (this does NOT
//     send any email itself — it just creates the user and hands back
//     a secure setup link), then we email that link ourselves through
//     Resend, so it reliably comes from your own domain instead of
//     depending on Supabase's own email delivery.
//   - Existing email: just promotes their existing account to staff.
// Either way, is_staff gets set to true and a branded welcome email
// goes out via Resend.

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

    const siteUrl = Deno.env.get('SITE_URL') || 'https://truedocpros.com'

    // Does a profile with this email already exist?
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    let profileId = existing?.id
    let setupLink: string | null = null

    if (!profileId) {
      // Brand new person — create their account and get a secure setup
      // link, WITHOUT Supabase sending any email of its own.
      const { data: linked, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: `${siteUrl}/login`,
          data: {
            full_name: full_name || null,
            title: title || null,
          },
        },
      })
      if (linkError || !linked?.user) {
        return new Response(JSON.stringify({ error: `Could not invite: ${linkError?.message}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      profileId = linked.user.id
      setupLink = linked.properties?.action_link ?? null
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

    // Send the invite/welcome email ourselves via Resend — reliable,
    // and always comes from your own verified domain.
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'True Doc Pros <onboarding@resend.dev>'
      const firstName = full_name?.split(' ')[0] || 'there'

      const html = setupLink
        ? `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #0F1B33;">
          <h2 style="font-family: Georgia, serif;">Welcome to True Doc Pros</h2>
          <p>Hi ${firstName},</p>
          <p>You've been invited to join the <strong>True Doc Pros</strong> team${title ? ` as ${title}` : ''}.
          You are an asset to the team — don't hesitate to reach out with any questions.</p>
          <p style="margin-top: 24px;">
            <a href="${setupLink}"
               style="background:#0F1B33;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">
              Set up your account
            </a>
          </p>
          <p>Once you're in, you'll see a Staff tab in your portal to get started.</p>
          <p style="margin-top:24px;font-size:12px;color:#57616F;">— True Doc Pros</p>
        <div style="text-align:center; margin-top:20px;"><img src="https://truedocpros.com/email-seal.png" width="56" height="56" alt="True Doc Pros" style="display:inline-block;" /></div>
        </div>
      `
        : `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #0F1B33;">
          <h2 style="font-family: Georgia, serif;">Congratulations, and welcome to the TDP Team!</h2>
          <p>Hi ${firstName},</p>
          <p>Congratulations, and welcome to the TDP Team. You are an asset to the team — don't hesitate to
          reach out with any questions.</p>
          <p>Log back in to your TDP portal to see the Staff tab and begin helping your team.</p>
          <p style="margin-top: 24px;">
            <a href="${siteUrl}/login"
               style="background:#0F1B33;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">
              Log in
            </a>
          </p>
          <p style="margin-top:24px;font-size:12px;color:#57616F;">— True Doc Pros</p>
        <div style="text-align:center; margin-top:20px;"><img src="https://truedocpros.com/email-seal.png" width="56" height="56" alt="True Doc Pros" style="display:inline-block;" /></div>
        </div>
      `

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: setupLink ? "You've been invited to join the True Doc Pros team" : 'Welcome to the True Doc Pros team!',
          html,
        }),
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
