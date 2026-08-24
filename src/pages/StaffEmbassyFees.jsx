import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { NON_HAGUE_COUNTRIES } from '../lib/countries'

export default function StaffEmbassyFees() {
  const [fees, setFees] = useState({}) // { "Country|personal": cents, ... }
  const [edits, setEdits] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [savingKey, setSavingKey] = useState(null)
  const [savedKey, setSavedKey] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('embassy_fees').select('*')
    const map = {}
    ;(data ?? []).forEach((f) => {
      map[`${f.country}|${f.document_type}`] = f.fee_cents
    })
    setFees(map)
    const initialEdits = {}
    NON_HAGUE_COUNTRIES.forEach((c) => {
      initialEdits[`${c}|personal`] = map[`${c}|personal`] != null ? (map[`${c}|personal`] / 100).toFixed(2) : ''
      initialEdits[`${c}|business`] = map[`${c}|business`] != null ? (map[`${c}|business`] / 100).toFixed(2) : ''
    })
    setEdits(initialEdits)
    setLoading(false)
  }

  const saveFee = async (country, docType) => {
    const key = `${country}|${docType}`
    const raw = edits[key]
    const cents = raw ? Math.round(parseFloat(raw) * 100) : 0
    setSavingKey(key)
    const { error } = await supabase
      .from('embassy_fees')
      .upsert({ country, document_type: docType, fee_cents: cents, updated_at: new Date().toISOString() })
    setSavingKey(null)
    if (!error) {
      setFees((prev) => ({ ...prev, [key]: cents }))
      setSavedKey(key)
      setTimeout(() => setSavedKey(null), 1500)
    }
  }

  const filtered = NON_HAGUE_COUNTRIES.filter((c) => c.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <Link to="/staff" className="font-mono text-xs uppercase tracking-widest text-[var(--slate)] hover:text-[var(--wax)]">
            ← Staff dashboard
          </Link>
          <h1 className="font-display mt-2 text-3xl font-semibold text-[var(--ink)]">Embassy fee schedule</h1>
          <p className="mt-1 text-sm text-[var(--slate)]">
            Set the embassy legalization fee for each non-Hague country, separately for personal and business
            documents. Clients see and are charged whatever's entered here the moment they select that country.
            Leave a fee blank/zero if you'd rather quote it manually after they submit.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <input
          type="text"
          placeholder="Search countries…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-white/60 px-4 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
        />

        {loading && <p className="mt-8 font-mono text-sm text-[var(--slate)]">Loading…</p>}

        <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--parchment-dim)] font-mono text-xs uppercase tracking-wide text-[var(--slate)]">
              <tr>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Personal document fee</th>
                <th className="px-4 py-3">Business document fee</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((country) => (
                <tr key={country} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 text-[var(--ink)]">{country}</td>
                  {['personal', 'business'].map((docType) => {
                    const key = `${country}|${docType}`
                    return (
                      <td key={docType} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[var(--slate)]">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={edits[key] ?? ''}
                            onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                            className="w-24 rounded-lg border border-[var(--line)] bg-white/70 px-2 py-1.5 text-sm outline-none focus:border-[var(--wax)]"
                          />
                          <button
                            onClick={() => saveFee(country, docType)}
                            disabled={savingKey === key}
                            className="rounded-full border border-[var(--ink)]/25 px-3 py-1.5 text-xs text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors disabled:opacity-50"
                          >
                            {savingKey === key ? '…' : 'Save'}
                          </button>
                          {savedKey === key && <span className="font-mono text-xs text-[var(--brass)]">✓</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  )
}
