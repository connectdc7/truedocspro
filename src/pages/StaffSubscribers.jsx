import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'

export default function StaffSubscribers() {
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setSubscribers(data)
    setLoading(false)
  }

  const filtered = subscribers.filter((s) =>
    s.email?.toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <Link to="/staff" className="font-mono text-xs uppercase tracking-widest text-[var(--slate)] hover:text-[var(--wax)]">
            ← Staff dashboard
          </Link>
          <h1 className="font-display mt-2 text-3xl font-semibold text-[var(--ink)]">
            Blog subscribers <span className="text-[var(--slate)]">({subscribers.length})</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--slate)]">
            Everyone subscribed to blog updates. They're emailed automatically whenever you publish a new post.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <input
          type="text"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-white/60 px-4 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
        />

        {loading && <p className="mt-8 font-mono text-sm text-[var(--slate)]">Loading…</p>}
        {error && <p className="mt-4 text-sm text-[var(--wax)]">{error}</p>}

        {!loading && filtered.length === 0 && (
          <p className="mt-8 font-mono text-sm text-[var(--slate)]">No subscribers yet.</p>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-[var(--line)]">
          {filtered.map((s) => (
            <Link
              key={s.id}
              to={`/staff/subscribers/${s.id}`}
              className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 last:border-0 hover:bg-white/40 transition-colors"
            >
              <span className="text-sm text-[var(--ink)]">{s.email}</span>
              <span className="font-mono text-xs text-[var(--slate)]">
                {new Date(s.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </Layout>
  )
}
