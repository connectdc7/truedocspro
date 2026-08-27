import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import Turnstile from '../components/Turnstile'
import useDocumentHead from '../lib/useDocumentHead'

export default function Signup() {
  useDocumentHead({
    title: 'Create Your Account',
    description: 'Create a free account to submit documents and track notary, apostille, and embassy legalization status.',
    path: '/signup',
  })
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, captchaToken: captchaToken || undefined },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    // Best-effort — don't block navigation on this
    supabase.functions.invoke('notify-signup-welcome', { body: { email, full_name: fullName } })
    if (data.session) {
      navigate('/portal')
    } else {
      setNeedsConfirmation(true)
    }
  }

  if (needsConfirmation) {
    return (
      <Layout>
        <section className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="font-display text-2xl font-semibold text-[var(--ink)]">Check your email</h1>
          <p className="mt-3 text-sm text-[var(--slate)]">
            We sent a confirmation link to {email}. Confirm your address, then log in to reach your portal.
          </p>
          <Link to="/login" className="mt-6 inline-block text-sm text-[var(--wax)] hover:underline">
            Go to log in
          </Link>
        </section>
      </Layout>
    )
  }

  return (
    <Layout>
      <section className="mx-auto max-w-md px-6 py-20">
        <h1 className="font-display text-3xl font-semibold text-[var(--ink)] text-center">Create your account</h1>
        <p className="mt-2 text-center text-sm text-[var(--slate)]">
          Submit documents and track their status from one place.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
            />
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
            />
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
            />
            <p className="mt-1.5 text-xs text-[var(--slate)]">At least 10 characters.</p>
          </div>
          {error && <p className="text-sm text-[var(--wax)]">{error}</p>}
          <Turnstile onVerify={setCaptchaToken} />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--wax)] px-6 py-3.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--slate)]">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--wax)] hover:underline">Log in</Link>
        </p>
      </section>
    </Layout>
  )
}
