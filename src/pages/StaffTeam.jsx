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
      .order('is_staff', { ascending: false })
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

  const toggleStaff = async (profile) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_staff: !profile.is_staff })
      .eq('id', profile.id)
    if (!error) {
      setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, is_staff: !p.is_staff } : p)))
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
            Give staff access to accounts, and set each person's name and title. Anyone must have already
            created an account on the site before you can find them here.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <input
          type="text"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-white/60 px-4 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
        />

        {loading && <p className="mt-8 font-mono text-sm text-[var(--slate)]">Loading…</p>}
        {error && <p className="mt-4 text-sm text-[var(--wax)]">{error}</p>}

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
                    <span
                      className={`rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wide ${
                        p.is_staff ? 'bg-[var(--wax)]/15 text-[var(--wax)]' : 'bg-[var(--line)] text-[var(--slate)]'
                      }`}
                    >
                      {p.is_staff ? 'Staff' : 'Client'}
                    </span>
                    <button
                      onClick={() => toggleStaff(p)}
                      disabled={isSelf && p.is_staff}
                      title={isSelf && p.is_staff ? "You can't remove your own staff access" : ''}
                      className="rounded-full border border-[var(--ink)]/25 px-4 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {p.is_staff ? 'Remove staff access' : 'Make staff'}
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
