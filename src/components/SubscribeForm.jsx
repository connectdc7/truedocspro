import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function SubscribeForm({ compact = false }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    const { error } = await supabase.from('subscribers').insert({ email })
    if (error) {
      // Unique violation just means they're already subscribed — treat as success
      if (error.code === '23505') {
        setStatus('done')
      } else {
        setStatus('error')
        setErrorMsg(error.message)
      }
    } else {
      setStatus('done')
      setEmail('')
      // Best-effort — don't block the subscribe confirmation on this
      supabase.functions.invoke('subscriber-welcome', { body: { email } })
    }
  }

  if (status === 'done') {
    return (
      <p className="font-mono text-sm text-[var(--brass)]">
        You're subscribed — we'll email you when there's a new update.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'flex gap-2' : 'flex flex-col gap-3 sm:flex-row'}>
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded-full border border-[var(--line)] bg-white/70 px-4 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-60 whitespace-nowrap"
      >
        {status === 'sending' ? 'Subscribing…' : 'Subscribe free'}
      </button>
      {status === 'error' && <p className="text-xs text-[var(--wax)]">{errorMsg}</p>}
    </form>
  )
}
