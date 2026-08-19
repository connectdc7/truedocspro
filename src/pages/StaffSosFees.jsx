import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { US_STATES } from '../lib/countries'

export default function StaffSosFees() {
  const [edits, setEdits] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [savingState, setSavingState] = useState(null)
  const [savedState, setSavedState] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('sos_fees').select('*')
    const map = {}
    ;(data ?? []).forEach((f) => {
      map[f.state] = f.fee_cents
    })
    const initialEdits = {}
    US_STATES.forEach((s) => {
      initialEdits[s] = map[s] != null && map[s] > 0 ? (map[s] / 100).toFixed(2) : ''
    })
    setEdits(initialEdits)
    setLoading(false)
  }

  const saveFee = async (state) => {
    const raw = edits[state]
    const cents = raw ? Math.round(parseFloat(raw) * 100) : 0
    setSavingState(state)
    const { error } = await supabase
      .from('sos_fees')
      .upsert({ state, fee_cents: cents, updated_at: new Date().toISOString() })
    setSavingState(null)
    if (!error) {
      setSavedState(state)
      setTimeout(() => setSavedState(null), 1500)
    }
  }

  const filtered = US_STATES.filter((s) => s.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <Link to="/staff" className="font-mono text-xs uppercase tracking-widest text-[var(--slate)] hover:text-[var(--wax)]">
            ← Staff dashboard
          </Link>
          <h1 className="font-display mt-2 text-3xl font-semibold text-[var(--ink)]">Secretary of State fee schedule</h1>
          <p className="mt-1 text-sm text-[var(--slate)]">
            Set the Secretary of State authentication fee for each state. Clients see and are charged this
            the moment they select where their document originates from. Leave blank to quote manually instead.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <input
          type="text"
          placeholder="Search states…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-white/60 px-4 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
        />

        {loading && <p className="mt-8 font-mono text-sm text-[var(--slate)]">Loading…</p>}

        <div className="mt-6 overflow-hidden rounded-xl border border-[var(--line)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--parchment-dim)] font-mono text-xs uppercase tracking-wide text-[var(--slate)]">
              <tr>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Fee</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((state) => (
                <tr key={state} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 text-[var(--ink)]">{state}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--slate)]">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={edits[state] ?? ''}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [state]: e.target.value }))}
                        className="w-24 rounded-lg border border-[var(--line)] bg-white/70 px-2 py-1.5 text-sm outline-none focus:border-[var(--wax)]"
                      />
                      <button
                        onClick={() => saveFee(state)}
                        disabled={savingState === state}
                        className="rounded-full border border-[var(--ink)]/25 px-3 py-1.5 text-xs text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors disabled:opacity-50"
                      >
                        {savingState === state ? '…' : 'Save'}
                      </button>
                      {savedState === state && <span className="font-mono text-xs text-[var(--brass)]">✓</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  )
}
