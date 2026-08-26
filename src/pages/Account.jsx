import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import useDocumentHead from '../lib/useDocumentHead'
import TwoStepSetup from '../components/TwoStepSetup'

export default function Account() {
  useDocumentHead({ title: 'Account', description: 'Manage your True Doc Pros account.', path: '/account' })
  const { user, profile, isStaff, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingContact, setSavingContact] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)
  const [contactError, setContactError] = useState('')

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setPhone(profile.phone || '')
    }
  }, [profile])

  const handleSaveContact = async (e) => {
    e.preventDefault()
    setSavingContact(true)
    setContactError('')
    setContactSaved(false)
    const { error } = await supabase.rpc('update_own_contact_info', {
      new_full_name: fullName || null,
      new_phone: phone || null,
    })
    setSavingContact(false)
    if (error) {
      setContactError(error.message)
    } else {
      setContactSaved(true)
      refreshProfile()
      setTimeout(() => setContactSaved(false), 3000)
    }
  }

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError('')
    setSaved(false)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <Layout>
      <section className="mx-auto max-w-md px-6 py-16">
        <Link to="/portal" className="font-mono text-xs uppercase tracking-widest text-[var(--slate)] hover:text-[var(--wax)]">
          ← My documents
        </Link>
        <h1 className="font-display mt-4 text-3xl font-semibold text-[var(--ink)]">Account</h1>
        <p className="mt-1 text-sm text-[var(--slate)]">{user?.email}</p>
        {isStaff && profile?.title && (
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[var(--brass)]">{profile.title}</p>
        )}

        <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Contact info</p>
          <form onSubmit={handleSaveContact} className="mt-4 space-y-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
              />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="phone">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
              />
            </div>
            {contactError && <p className="text-sm text-[var(--wax)]">{contactError}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingContact}
                className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-60"
              >
                {savingContact ? 'Saving…' : 'Save contact info'}
              </button>
              {contactSaved && <p className="font-mono text-xs text-[var(--brass)]">Saved.</p>}
            </div>
            {isStaff && (
              <p className="text-xs text-[var(--slate)]">
                Your job title is set by an admin from the Team page and can't be edited here.
              </p>
            )}
          </form>
        </div>

        <TwoStepSetup />

        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Change password</p>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="password">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
              />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
              />
            </div>
            {error && <p className="text-sm text-[var(--wax)]">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Update password'}
              </button>
              {saved && <p className="font-mono text-xs text-[var(--brass)]">Saved.</p>}
            </div>
          </form>
        </div>
      </section>
    </Layout>
  )
}
