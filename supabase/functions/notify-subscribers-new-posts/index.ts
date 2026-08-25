// supabase/functions/notify-subscribers-new-posts/index.ts
//
// Called from the staff blog list when publishing multiple posts at
// once. Sends every subscriber ONE combined email listing all of
// them, instead of a separate email per post — so publishing several
// posts in one sitting doesn't flood anyone's inbox.

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
    const { posts } = await req.json()
    if (!Array.isArray(posts) || posts.length === 0) {
      return new Response(JSON.stringify({ error: 'posts (a non-empty array) is required' }), {
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
      .select('is_admin')
      .eq('id', userData.user.id)
      .single()
    if (!callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: subscribers } = await supabaseAdmin.from('subscribers').select('email')
    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, total: 0 }), {
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

    const postsHtml = posts
      .map(function (post) {
        return (
          '<div style="margin-top: 14px; padding: 14px 16px; border: 1px solid #E1E4EA; border-radius: 10px;">' +
          '<a href="' + siteUrl + '/blog/' + post.slug + '" style="color: #0F1B33; font-weight: 600; text-decoration: none; font-family: Georgia, serif; font-size: 16px;">' +
          post.title +
          '</a>' +
          (post.excerpt ? '<p style="margin: 6px 0 0; font-size: 13px; color: #57616F;">' + post.excerpt + '</p>' : '') +
          '</div>'
        )
      })
      .join('')

    const subjectLine =
      posts.length === 1 ? 'New post: ' + posts[0].title : posts.length + ' new posts on the True Doc Pros blog'

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #0F1B33;">
        <p style="font-family: monospace; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; color: #C9A227;">
          ${posts.length === 1 ? 'New on the blog' : posts.length + ' new posts on the blog'}
        </p>
        <h2 style="font-family: Georgia, serif;">${posts.length === 1 ? posts[0].title : 'Fresh reading, all in one place'}</h2>
        ${postsHtml}
        <p style="margin-top: 24px;">
          <a href="${siteUrl}/blog"
             style="background:#0F1B33;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">
            Read on the blog
          </a>
        </p>
        <p style="margin-top:24px;font-size:12px;color:#57616F;">— True Doc Pros</p>
        <div style="text-align:center; margin-top:20px;"><img src="https://truedocpros.com/email-seal.png" width="56" height="56" alt="True Doc Pros" style="display:inline-block;" /></div>
      </div>
    `

    let sentCount = 0
    for (const sub of subscribers) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to: sub.email, subject: subjectLine, html }),
      })
      if (res.ok) sentCount++
    }

    return new Response(JSON.stringify({ sent: sentCount, total: subscribers.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
