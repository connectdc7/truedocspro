import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import useDocumentHead from '../lib/useDocumentHead'

export default function Login() {
  useDocumentHead({ title: 'Log In', description: 'Log in to your True Docs Pro portal.', path: '/login' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [idleMessage, setIdleMessage] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/portal'

  useEffect(() => {
    if (sessionStorage.getItem('idle_logout')) {
      setIdleMessage(true)
      sessionStorage.removeItem('idle_logout')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <Layout>
      <section className="mx-auto max-w-md px-6 py-20">
        <h1 className="font-display text-3xl font-semibold text-[var(--ink)] text-center">Log in</h1>
        <p className="mt-2 text-center text-sm text-[var(--slate)]">Access your document portal.</p>

        {idleMessage && (
          <p className="mt-4 rounded-lg border border-[var(--brass)]/40 bg-[var(--brass)]/10 px-4 py-3 text-center text-sm text-[var(--brass)]">
            You were signed out after a few minutes of inactivity, for your security. Please log back in.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
            />
          </div>
          {error && <p className="text-sm text-[var(--wax)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--ink)] px-6 py-3.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--slate)]">
          New here?{' '}
          <Link to="/signup" className="text-[var(--wax)] hover:underline">Create an account</Link>
        </p>
      </section>
    </Layout>
  )
}
