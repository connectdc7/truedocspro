// supabase/functions/subscriber-welcome/index.ts
//
// Called right after someone subscribes to the blog. Sends a short
// welcome email confirming they're on the list, with a preview of the
// 3 most recent posts.

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

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'Email is not configured yet (missing RESEND_API_KEY)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'True Doc Pros <onboarding@resend.dev>'
    const siteUrl = Deno.env.get('SITE_URL') || 'https://truedocpros.com'

    // Grab the 3 most recent published posts to preview in the email
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: recentPosts } = await supabaseAdmin
      .from('posts')
      .select('title, slug, excerpt')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(3)

    const postsHtml =
      recentPosts && recentPosts.length > 0
        ? `
        <p style="margin-top: 32px; font-family: monospace; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; color: #C9A227;">
          Recent posts to check out
        </p>
        ${recentPosts
          .map(
            (post) => `
          <div style="margin-top: 14px; padding: 14px 16px; border: 1px solid #E1E4EA; border-radius: 10px;">
            <a href="${siteUrl}/blog/${post.slug}" style="color: #0F1B33; font-weight: 600; text-decoration: none;">
              ${post.title}
            </a>
            ${post.excerpt ? `<p style="margin: 6px 0 0; font-size: 13px; color: #57616F;">${post.excerpt}</p>` : ''}
          </div>
        `
          )
          .join('')}
      `
        : ''

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #0F1B33;">
        <h2 style="font-family: Georgia, serif;">You're subscribed!</h2>
        <p>Thanks for subscribing to the True Doc Pros blog — you'll get an email whenever we publish
        something new on apostille, notary, and immigration news.</p>
        <p style="margin-top: 24px;">
          <a href="${siteUrl}/blog"
             style="background:#0F1B33;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">
            Read the blog
          </a>
        </p>
        ${postsHtml}
        <p style="margin-top:24px;font-size:12px;color:#57616F;">— True Doc Pros</p>
      </div>
    `

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: "You're subscribed to the True Doc Pros blog",
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
