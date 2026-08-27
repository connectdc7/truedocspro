import { useEffect, useRef } from 'react'

let scriptPromise = null
function loadTurnstileScript() {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile)
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.turnstile)
    script.onerror = reject
    document.head.appendChild(script)
  })
  return scriptPromise
}

// Renders nothing (and blocks nothing) if no site key is configured yet —
// so the site keeps working normally until Cloudflare Turnstile is set up.
export default function Turnstile({ onVerify }) {
  const containerRef = useRef(null)
  const widgetId = useRef(null)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey) return
    let cancelled = false
    loadTurnstileScript().then((turnstile) => {
      if (cancelled || !containerRef.current || !turnstile) return
      widgetId.current = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        'expired-callback': () => onVerify(''),
        'error-callback': () => onVerify(''),
      })
    })
    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  if (!siteKey) return null
  return <div ref={containerRef} className="mt-3" />
}
