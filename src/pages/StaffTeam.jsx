import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function StaffTeam() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [edits, setEdits] = useState({}) // { [id]: { full_name, title } }
  const [savingId, setSavingId] = useState(null)
  const [savedId, setSavedId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_staff', true)
      .order('is_admin', { ascending: false })
      .order('email', { ascending: true })
    if (error) setError(error.message)
    else {
      setProfiles(data)
      const initialEdits = {}
      data.forEach((p) => {
        initialEdits[p.id] = { full_name: p.full_name || '', title: p.title || '' }
      })
      setEdits(initialEdits)
    }
    setLoading(false)
  }

  const [promoteError, setPromoteError] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteTitle, setInviteTitle] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState(null) // { ok, message }

  const sendInvite = async (e) => {
    e.preventDefault()
    setInviting(true)
    setInviteResult(null)
    const { data, error } = await supabase.functions.invoke('invite-staff', {
      body: { email: inviteEmail, full_name: inviteName || undefined, title: inviteTitle || undefined },
    })
    setInviting(false)
    if (error || data?.error) {
      setInviteResult({ ok: false, message: data?.error || error.message })
    } else {
      setInviteResult({
        ok: true,
        message: data.new_account
          ? `Invite sent to ${inviteEmail} — they'll get an email to set up their login.`
          : `${inviteEmail} already had an account and is now staff.`,
      })
      setInviteEmail('')
      setInviteName('')
      setInviteTitle('')
      await load()
    }
  }

  const toggleStaff = async (profile) => {
    const promoting = !profile.is_staff
    // Removing staff access should also remove admin access, to avoid
    // an inconsistent "admin but not staff" state.
    const payload = promoting ? { is_staff: true } : { is_staff: false, is_admin: false }
    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', profile.id)
    if (!error) {
      if (promoting) {
        setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, ...payload } : p)))
        const { error: emailError } = await supabase.functions.invoke('notify-new-staff', {
          body: { profile_id: profile.id },
        })
        if (emailError) setPromoteError('Staff access granted, but the welcome email failed to send.')
      } else {
        // This list only shows current staff — once access is removed,
        // drop them from view immediately so the list stays clean.
        setProfiles((prev) => prev.filter((p) => p.id !== profile.id))
        const { error: removedEmailError } = await supabase.functions.invoke('notify-staff-removed', {
          body: { email: profile.email, full_name: profile.full_name },
        })
        if (removedEmailError) setPromoteError('Staff access removed, but the notification email failed to send.')
      }
    } else {
      setError(error.message)
    }
  }

  const toggleAdmin = async (profile) => {
    const promoting = !profile.is_admin
    // Promoting to admin should always also grant staff access
    const payload = promoting ? { is_admin: true, is_staff: true } : { is_admin: false }
    const { error } = await supabase.from('profiles').update(payload).eq('id', profile.id)
    if (!error) {
      setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, ...payload } : p)))
    } else {
      setError(error.message)
    }
  }

  const saveDetails = async (id) => {
    setSavingId(id)
    const { full_name, title } = edits[id]
    const { error } = await supabase.from('profiles').update({ full_name, title }).eq('id', id)
    setSavingId(null)
    if (!error) {
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, full_name, title } : p)))
      setSavedId(id)
      setTimeout(() => setSavedId(null), 2000)
    } else {
      setError(error.message)
    }
  }

  const filtered = profiles.filter((p) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return p.email?.toLowerCase().includes(q) || p.full_name?.toLowerCase().includes(q)
  })

  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <Link to="/staff" className="font-mono text-xs uppercase tracking-widest text-[var(--slate)] hover:text-[var(--wax)]">
            ← Staff dashboard
          </Link>
          <h1 className="font-display mt-2 text-3xl font-semibold text-[var(--ink)]">Team</h1>
          <p className="mt-1 text-sm text-[var(--slate)]">
            This list shows your current staff only — remove someone's access and they're dropped from
            this list right away. Regular staff only see and act on orders assigned to them; admins see
            and manage everything, including this page. To add someone, use the invite box below — it
            works whether or not they already have an account.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Invite a new staff member</p>
          <p className="mt-1 text-xs text-[var(--slate)]">
            Works with any email — if they don't have an account yet, we'll create one and send them a link
            to set up their login.
          </p>
          <form onSubmit={sendInvite} className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">Email</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">Name (optional)</label>
              <input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">Title (optional)</label>
              <input
                value={inviteTitle}
                onChange={(e) => setInviteTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
              />
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-full bg-[var(--wax)] px-5 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors disabled:opacity-50"
            >
              {inviting ? 'Sending…' : 'Invite'}
            </button>
          </form>
          {inviteResult && (
            <p className={`mt-3 text-sm ${inviteResult.ok ? 'text-[var(--brass)]' : 'text-[var(--wax)]'}`}>
              {inviteResult.message}
            </p>
          )}
        </div>

        <input
          type="text"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-8 w-full max-w-sm rounded-lg border border-[var(--line)] bg-white/60 px-4 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
        />

        {loading && <p className="mt-8 font-mono text-sm text-[var(--slate)]">Loading…</p>}
        {error && <p className="mt-4 text-sm text-[var(--wax)]">{error}</p>}
        {promoteError && <p className="mt-4 text-sm text-[var(--wax)]">{promoteError}</p>}

        <div className="mt-6 space-y-3">
          {filtered.map((p) => {
            const isSelf = p.id === user.id
            const edit = edits[p.id] || { full_name: '', title: '' }
            const dirty = edit.full_name !== (p.full_name || '') || edit.title !== (p.title || '')
            return (
              <div key={p.id} className="rounded-xl border border-[var(--line)] bg-white/40 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--ink)]">
                      {p.email} {isSelf && <span className="font-mono text-xs text-[var(--slate)]">(you)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.is_admin && (
                      <span className="rounded-full bg-[var(--ink)] px-3 py-1 font-mono text-xs uppercase tracking-wide text-[var(--parchment)]">
                        Admin
                      </span>
                    )}
                    <button
                      onClick={() => toggleStaff(p)}
                      disabled={isSelf}
                      title={isSelf ? "You can't remove your own staff access" : 'Remove this person from staff'}
                      className="rounded-full border border-[var(--ink)]/25 px-4 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Remove staff access
                    </button>
                    <button
                      onClick={() => toggleAdmin(p)}
                      disabled={isSelf && p.is_admin}
                      title={isSelf && p.is_admin ? "You can't remove your own admin access" : ''}
                      className="rounded-full border border-[var(--ink)]/25 px-4 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {p.is_admin ? 'Remove admin' : 'Make admin'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">Name</label>
                    <input
                      value={edit.full_name}
                      onChange={(e) =>
                        setEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], full_name: e.target.value } }))
                      }
                      placeholder="Full name"
                      className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2 text-sm outline-none focus:border-[var(--wax)]"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">Title</label>
                    <input
                      value={edit.title}
                      onChange={(e) =>
                        setEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], title: e.target.value } }))
                      }
                      placeholder="e.g. Office Manager"
                      className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2 text-sm outline-none focus:border-[var(--wax)]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveDetails(p.id)}
                      disabled={!dirty || savingId === p.id}
                      className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-40"
                    >
                      {savingId === p.id ? 'Saving…' : 'Save'}
                    </button>
                    {savedId === p.id && <span className="font-mono text-xs text-[var(--brass)]">Saved</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </Layout>
  )
}
