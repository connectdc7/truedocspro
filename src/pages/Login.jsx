import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { hashCode } from '../lib/backupCodes'
import { useAuth } from '../lib/AuthContext'
import useDocumentHead from '../lib/useDocumentHead'

export default function Login() {
  useDocumentHead({ title: 'Log In', description: 'Log in to your True Doc Pros portal.', path: '/login' })
  const { needsMfaVerification, markMfaVerifiedViaBackupCode, refreshMfaStatus } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [idleMessage, setIdleMessage] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/portal'

  // Two-step verification state
  const [step, setStep] = useState('password') // 'password' | 'verify'
  const [factorId, setFactorId] = useState(null)
  const [challengeId, setChallengeId] = useState(null)
  const [code, setCode] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem('idle_logout')) {
      setIdleMessage(true)
      sessionStorage.removeItem('idle_logout')
    }
  }, [])

  useEffect(() => {
    if (!needsMfaVerification) return
    let active = true
    async function startChallenge() {
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const verified = factorsData?.totp?.find((f) => f.status === 'verified')
      if (!verified) return
      const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: verified.id })
      if (active && challenge) {
        setFactorId(verified.id)
        setChallengeId(challenge.id)
        setStep('verify')
      }
    }
    startChallenge()
    return () => { active = false }
  }, [needsMfaVerification])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setLoading(false)
      setError(signInError.message)
      return
    }

    // Check whether this account has two-step verification enabled
    const { data: levelData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (levelData && levelData.nextLevel === 'aal2' && levelData.currentLevel !== 'aal2') {
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const verified = factorsData?.totp?.find((f) => f.status === 'verified')
      if (verified) {
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: verified.id })
        setLoading(false)
        if (challengeError) {
          setError(challengeError.message)
          return
        }
        setFactorId(verified.id)
        setChallengeId(challenge.id)
        setStep('verify')
        return
      }
    }

    setLoading(false)
    navigate(from, { replace: true })
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setVerifying(true)
    setVerifyError('')

    if (useBackupCode) {
      const { data: userData } = await supabase.auth.getUser()
      const hash = await hashCode(code)
      const { data: match } = await supabase
        .from('mfa_backup_codes')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('code_hash', hash)
        .eq('used', false)
        .maybeSingle()

      if (!match) {
        setVerifying(false)
        setVerifyError('That backup code is invalid or has already been used.')
        return
      }
      await supabase.from('mfa_backup_codes').update({ used: true }).eq('id', match.id)
      setVerifying(false)
      markMfaVerifiedViaBackupCode()
      navigate(from, { replace: true })
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.trim(),
    })
    if (verifyError) {
      setVerifying(false)
      setVerifyError('Incorrect code — please try again.')
      return
    }
    await refreshMfaStatus()
    setVerifying(false)
    navigate(from, { replace: true })
  }

  if (step === 'verify') {
    return (
      <Layout>
        <section className="mx-auto max-w-md px-6 py-20">
          <h1 className="font-display text-3xl font-semibold text-[var(--ink)] text-center">Verify it's you</h1>
          <p className="mt-2 text-center text-sm text-[var(--slate)]">
            {useBackupCode
              ? 'Enter one of your backup codes.'
              : 'Enter the 6-digit code from your authenticator app.'}
          </p>

          <form onSubmit={handleVerify} className="mt-8 space-y-5">
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
              className="w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-[var(--wax)]"
            />
            {verifyError && <p className="text-center text-sm text-[var(--wax)]">{verifyError}</p>}
            <button
              type="submit"
              disabled={verifying || !code.trim()}
              className="w-full rounded-full bg-[var(--ink)] px-6 py-3.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-60"
            >
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--slate)]">
            <button
              type="button"
              onClick={() => { setUseBackupCode((v) => !v); setCode(''); setVerifyError('') }}
              className="text-[var(--wax)] hover:underline"
            >
              {useBackupCode ? 'Use my authenticator app instead' : "Lost your phone? Use a backup code"}
            </button>
          </p>
        </section>
      </Layout>
    )
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
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="password">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-[var(--wax)] hover:underline">
                Forgot password?
              </Link>
            </div>
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
