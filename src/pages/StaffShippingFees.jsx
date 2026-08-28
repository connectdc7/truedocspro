import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'

export default function StaffShippingFees() {
  const [fees, setFees] = useState([])
  const [edits, setEdits] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [savedKey, setSavedKey] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('shipping_fees').select('*').order('key')
    setFees(data ?? [])
    const initialEdits = {}
    ;(data ?? []).forEach((f) => {
      initialEdits[f.key] = f.fee_cents > 0 ? (f.fee_cents / 100).toFixed(2) : ''
    })
    setEdits(initialEdits)
    setLoading(false)
  }

  const saveFee = async (key) => {
    const raw = edits[key]
    const cents = raw ? Math.round(parseFloat(raw) * 100) : 0
    setSavingKey(key)
    const { error } = await supabase
      .from('shipping_fees')
      .update({ fee_cents: cents, updated_at: new Date().toISOString() })
      .eq('key', key)
    setSavingKey(null)
    if (!error) {
      setFees((prev) => prev.map((f) => (f.key === key ? { ...f, fee_cents: cents } : f)))
      setSavedKey(key)
      setTimeout(() => setSavedKey(null), 1500)
    }
  }

  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <Link to="/staff" className="font-mono text-xs uppercase tracking-widest text-[var(--slate)] hover:text-[var(--wax)]">
            ← Staff dashboard
          </Link>
          <h1 className="font-display mt-2 text-3xl font-semibold text-[var(--ink)]">Shipping fee defaults</h1>
          <p className="mt-1 text-sm text-[var(--slate)]">
            Set the default cost for each shipping leg. Staff see these as one-click starting points when
            billing a client for shipping — they're never charged automatically.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-10">
        {loading && <p className="font-mono text-sm text-[var(--slate)]">Loading…</p>}

        <div className="space-y-4">
          {fees.map((fee) => (
            <div key={fee.key} className="rounded-xl border border-[var(--line)] bg-white/40 p-5">
              <p className="text-sm font-medium text-[var(--ink)]">{fee.label}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-mono text-xs text-[var(--slate)]">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={edits[fee.key] ?? ''}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [fee.key]: e.target.value }))}
                  className="w-28 rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2 text-sm outline-none focus:border-[var(--wax)]"
                />
                <button
                  type="button"
                  onClick={() => saveFee(fee.key)}
                  disabled={savingKey === fee.key}
                  className="rounded-full border border-[var(--ink)]/25 px-4 py-2 text-xs text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors disabled:opacity-50"
                >
                  {savingKey === fee.key ? '…' : 'Save'}
                </button>
                {savedKey === fee.key && <span className="font-mono text-xs text-[var(--brass)]">✓</span>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  )
}
