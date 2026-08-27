// supabase/functions/submit-contact-message/index.ts
//
// Verifies the Cloudflare Turnstile token server-side before saving a
// contact message — this is the actual bot-protection gate. A token
// that only gets checked client-side can be faked by a script; this
// one can't, since it's re-verified directly with Cloudflare.
//
// If TURNSTILE_SECRET_KEY isn't set yet, verification is skipped so
// the form keeps working while you're setting things up — but you
// should add the secret key as soon as Turnstile is configured.

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
    const { name, email, message, captchaToken } = await req.json()
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'name, email, and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY')
    if (secretKey) {
      if (!captchaToken) {
        return new Response(JSON.stringify({ error: 'Please complete the verification check.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secretKey, response: captchaToken }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyData.success) {
        return new Response(JSON.stringify({ error: 'Verification failed — please try again.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: insertError } = await supabaseAdmin.from('contact_messages').insert({ name, email, message })
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
