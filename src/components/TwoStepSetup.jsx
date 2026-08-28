import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { generateBackupCodes, hashCode } from '../lib/backupCodes'

export default function TwoStepSetup() {
  const [factor, setFactor] = useState(null)
  const [loading, setLoading] = useState(true)

  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [pendingFactorId, setPendingFactorId] = useState(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  const [newBackupCodes, setNewBackupCodes] = useState(null)

  const [confirmingAction, setConfirmingAction] = useState(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    setLoading(true)
    const { data } = await supabase.auth.mfa.listFactors()
    const verified = data?.totp?.find((f) => f.status === 'verified')
    setFactor(verified || null)
    setLoading(false)
  }

  const startEnroll = async () => {
    setError('')
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (enrollError) {
      setError(enrollError.message)
      return
    }
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setPendingFactorId(data.id)
    setEnrolling(true)
  }

  const confirmEnroll = async () => {
    if (!verifyCode.trim()) return
    setVerifying(true)
    setError('')
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: pendingFactorId })
    if (challengeError) {
      setVerifying(false)
      setError(challengeError.message)
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: challenge.id,
      code: verifyCode.trim(),
    })
    if (verifyError) {
      setVerifying(false)
      setError('Incorrect code — please try again.')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const codes = generateBackupCodes()
    const rows = await Promise.all(
      codes.map(async (code) => ({
        user_id: userData.user.id,
        code_hash: await hashCode(code),
      }))
    )
    await supabase.from('mfa_backup_codes').insert(rows)

    setVerifying(false)
    setEnrolling(false)
    setVerifyCode('')
    setNewBackupCodes(codes)
    await loadStatus()
  }

  const cancelEnroll = async () => {
    if (pendingFactorId) {
      await supabase.auth.mfa.unenroll({ factorId: pendingFactorId })
    }
    setEnrolling(false)
    setQrCode('')
    setSecret('')
    setPendingFactorId(null)
    setVerifyCode('')
    setError('')
  }

  const runConfirmedAction = async () => {
    if (!confirmCode.trim()) return
    setConfirming(true)
    setConfirmError('')
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id })
    if (challengeError) {
      setConfirming(false)
      setConfirmError(challengeError.message)
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code: confirmCode.trim(),
    })
    if (verifyError) {
      setConfirming(false)
      setConfirmError('Incorrect code — please try again.')
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    if (confirmingAction === 'disable') {
      await supabase.auth.mfa.unenroll({ factorId: factor.id })
      await supabase.from('mfa_backup_codes').delete().eq('user_id', userData.user.id)
      setConfirming(false)
      setConfirmingAction(null)
      setConfirmCode('')
      await loadStatus()
    } else if (confirmingAction === 'regenerate') {
      await supabase.from('mfa_backup_codes').delete().eq('user_id', userData.user.id)
      const codes = generateBackupCodes()
      const rows = await Promise.all(
        codes.map(async (code) => ({ user_id: userData.user.id, code_hash: await hashCode(code) }))
      )
      await supabase.from('mfa_backup_codes').insert(rows)
      setConfirming(false)
      setConfirmingAction(null)
      setConfirmCode('')
      setNewBackupCodes(codes)
    }
  }

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Two-step verification</p>
        <p className="mt-2 text-sm text-[var(--slate)]">Loading…</p>
      </div>
    )
  }

  if (newBackupCodes) {
    return (
      <div className="mt-6 rounded-2xl border border-[var(--wax)]/40 bg-[var(--wax)]/5 p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--wax)]">Save your backup codes</p>
        <p className="mt-2 text-sm text-[var(--ink)]">
          If you ever lose access to your authenticator app, use one of these codes to log in instead. Each works
          once. Save them somewhere safe — you won't be able to see them again after this.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-white/70 p-4 font-mono text-sm text-[var(--ink)]">
          {newBackupCodes.map((code) => (
            <span key={code}>{code}</span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setNewBackupCodes(null)}
          className="mt-4 rounded-full bg-[var(--ink)] px-6 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors"
        >
          I've saved these codes
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Two-step verification</p>
      <p className="mt-1 text-xs text-[var(--slate)]">
        Adds a second step at login using an authenticator app (like Google Authenticator or Authy), so a password
        alone isn't enough to sign in.
      </p>

      {factor ? (
        <div className="mt-4">
          <p className="text-sm text-[var(--brass)]">✓ Two-step verification is on.</p>

          {confirmingAction ? (
            <div className="mt-4 rounded-lg border border-[var(--line)] bg-white/70 p-4">
              <p className="text-sm text-[var(--ink)]">
                Enter a code from your authenticator app to confirm{' '}
                {confirmingAction === 'disable' ? 'turning this off' : 'generating new backup codes'}.
              </p>
              <input
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="6-digit code"
                className="mt-3 w-40 rounded-lg border border-[var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[var(--wax)]"
              />
              {confirmError && <p className="mt-2 text-sm text-[var(--wax)]">{confirmError}</p>}
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={runConfirmedAction}
                  disabled={confirming || !confirmCode.trim()}
                  className="rounded-full bg-[var(--ink)] px-5 py-2 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-50"
                >
                  {confirming ? 'Confirming…' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmingAction(null); setConfirmCode(''); setConfirmError('') }}
                  className="text-sm text-[var(--slate)] hover:text-[var(--wax)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setConfirmingAction('regenerate')}
                className="rounded-full border border-[var(--ink)]/25 px-5 py-2 text-sm font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
              >
                Generate new backup codes
              </button>
              <button
                type="button"
                onClick={() => setConfirmingAction('disable')}
                className="rounded-full border border-[var(--wax)]/40 px-5 py-2 text-sm font-medium text-[var(--wax)] hover:bg-[var(--wax)]/10 transition-colors"
              >
                Turn off
              </button>
            </div>
          )}
        </div>
      ) : enrolling ? (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">Step 1 — Get an authenticator app</p>
          <p className="mt-1 text-sm text-[var(--ink)]">
            The QR code below isn't a link — it's meant to be scanned by a dedicated authenticator app, which
            then generates your login codes. If you don't already have one, get one first:
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <a
              href="https://apps.apple.com/app/google-authenticator/id388497605"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
            >
              Google Authenticator — iPhone
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
            >
              Google Authenticator — Android
            </a>
            <a
              href="https://authy.com/download/"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
            >
              Authy — Desktop (Mac/Windows/Linux)
            </a>
            <a
              href="https://authy.com/download/"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
            >
              Authy — iPhone &amp; Android
            </a>
          </div>
          <p className="mt-2 text-xs text-[var(--slate)]">
            Already use 1Password, Bitwarden, or another password manager? Most of those work too — look for
            an "add authenticator" or "scan QR code" option.
          </p>

          <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">Step 2 — Scan this code</p>
          <p className="mt-1 text-sm text-[var(--ink)]">
            Once you have the app open, scan this with it — not your phone's regular camera.
          </p>
          {qrCode && (
            <div
              className="mt-3 h-40 w-40 rounded-lg border border-[var(--line)] bg-white p-2"
              dangerouslySetInnerHTML={{ __html: qrCode }}
            />
          )}
          <p className="mt-2 text-xs text-[var(--slate)]">Can't scan? Enter this code manually in the app instead:</p>
          <p className="mt-1 font-mono text-xs text-[var(--slate)] break-all">{secret}</p>

          <label className="mt-6 block font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">
            Step 3 — Enter the 6-digit code the app gives you
          </label>
          <input
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            placeholder="000000"
            className="mt-1 w-40 rounded-lg border border-[var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[var(--wax)]"
          />
          {error && <p className="mt-2 text-sm text-[var(--wax)]">{error}</p>}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={confirmEnroll}
              disabled={verifying || !verifyCode.trim()}
              className="rounded-full bg-[var(--ink)] px-6 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-50"
            >
              {verifying ? 'Verifying…' : 'Turn on'}
            </button>
            <button type="button" onClick={cancelEnroll} className="text-sm text-[var(--slate)] hover:text-[var(--wax)]">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEnroll}
          className="mt-4 rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors"
        >
          Set up two-step verification
        </button>
      )}
      {error && !enrolling && <p className="mt-2 text-sm text-[var(--wax)]">{error}</p>}
    </div>
  )
}
