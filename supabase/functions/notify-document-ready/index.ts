// supabase/functions/notify-document-ready/index.ts
//
// Called from the staff order page after uploading a completed
// document. Emails the client a link straight to their order, where
// they can view and download it.

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
    const { order_id } = await req.json()
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), {
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

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('document_name, user_id, profiles ( email, full_name )')
      .eq('id', order_id)
      .single()
    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clientEmail = order.profiles?.email
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
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'True Doc Pros <onboarding@resend.dev>'
    const siteUrl = Deno.env.get('SITE_URL') || 'https://truedocpros.com'
    const firstName = order.profiles?.full_name?.split(' ')[0] || 'there'
    const orderUrl = `${siteUrl}/portal/orders/${order_id}`

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #0F1B33;">
        <h2 style="font-family: Georgia, serif;">Your document is ready</h2>
        <p>Hi ${firstName},</p>
        <p><strong>${order.document_name}</strong> has been completed and is ready to view and download
        from your portal.</p>
        <p style="margin-top: 24px;">
          <a href="${orderUrl}"
             style="background:#0F1B33;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">
            View and download
          </a>
        </p>
        <p style="margin-top:24px;font-size:12px;color:#57616F;">
          Documents remain accessible in your portal for 30 days after completion.
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
        to: clientEmail,
        subject: `Your document is ready — ${order.document_name}`,
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
