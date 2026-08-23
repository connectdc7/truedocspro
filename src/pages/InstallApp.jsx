import { useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout'
import QRCode from 'qrcode'
import useDocumentHead from '../lib/useDocumentHead'

function detectPlatform() {
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

export default function InstallApp() {
  useDocumentHead({
    title: 'Get the App',
    description: 'Install True Doc Pros on your phone to submit documents, track status, and download completed copies.',
    path: '/app',
  })
  const canvasRef = useRef(null)
  const [platform, setPlatform] = useState('desktop')
  const [url, setUrl] = useState('')

  useEffect(() => {
    setPlatform(detectPlatform())
    const currentUrl = window.location.origin + '/portal'
    setUrl(currentUrl)
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, currentUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#16233F', light: '#F5F1E6' },
      })
    }
  }, [])

  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--wax)]">Get the app</p>
        <h1 className="font-display mt-3 text-4xl font-semibold text-[var(--ink)]">
          True Doc Pros, on your phone.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[var(--slate)]">
          Submit documents, pay, track status, and download completed copies — no app store needed.
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-[var(--line)] bg-white/40 p-8 text-center">
          <canvas ref={canvasRef} className="rounded-lg" />
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Scan with your phone camera</p>
            <p className="mt-1 break-all font-mono text-xs text-[var(--slate)]">{url}</p>
          </div>
        </div>

        <div className="mt-10 space-y-8">
          <PlatformBlock
            active={platform === 'ios'}
            title="On iPhone (Safari)"
            steps={[
              'Open the link above in Safari (not Chrome — Safari is required for this step on iPhone).',
              'Tap the Share icon (square with an arrow pointing up) at the bottom of the screen.',
              'Scroll down and tap "Add to Home Screen."',
              'Tap "Add" in the top right. The True Doc Pros icon now appears on your home screen like any other app.',
            ]}
          />
          <PlatformBlock
            active={platform === 'android'}
            title="On Android (Chrome)"
            steps={[
              'Open the link above in Chrome.',
              'Tap the three-dot menu in the top right.',
              'Tap "Add to Home screen," then "Install."',
              'The True Doc Pros icon now appears on your home screen and opens full-screen like any other app.',
            ]}
          />
          <PlatformBlock
            active={platform === 'desktop'}
            title="On a computer"
            steps={[
              'Open the link above in Chrome or Edge.',
              'Click the install icon in the address bar (or the ⋮ menu → "Install True Doc Pros").',
              'The app opens in its own window, separate from your browser tabs.',
            ]}
          />
        </div>
      </section>
    </Layout>
  )
}

function PlatformBlock({ active, title, steps }) {
  return (
    <div className={`rounded-xl border p-6 transition-colors ${active ? 'border-[var(--wax)] bg-[var(--wax)]/5' : 'border-[var(--line)]'}`}>
      <h3 className="font-display text-lg font-semibold text-[var(--ink)]">
        {title} {active && <span className="ml-2 font-mono text-xs uppercase text-[var(--wax)]">(your device)</span>}
      </h3>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-[var(--slate)]">
            <span className="font-mono text-[var(--brass)]">{i + 1}.</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  )
}
