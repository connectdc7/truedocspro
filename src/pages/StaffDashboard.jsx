import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'

const SERVICE_LABEL = { notary: 'Notary', apostille: 'Apostille', embassy: 'Embassy legalization' }
const STATUS_LABEL = { received: 'Received', in_process: 'In process', ready: 'Ready', shipped: 'Shipped / Returned' }
const TABS = ['all', 'received', 'in_process', 'ready', 'shipped']

export default function StaffDashboard() {
  const [orders, setOrders] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    load()
    loadStaffList()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles:user_id (email), assignee:assigned_to (id, email, full_name)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setOrders(data)
    setLoading(false)
  }

  async function loadStaffList() {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('is_staff', true)
      .order('full_name', { ascending: true })
    setStaffList(data ?? [])
  }

  const assignOrder = async (orderId, staffId) => {
    const { error } = await supabase
      .from('orders')
      .update({ assigned_to: staffId || null })
      .eq('id', orderId)
    if (!error) {
      const assignee = staffId ? staffList.find((s) => s.id === staffId) : null
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, assigned_to: staffId || null, assignee } : o)))
    }
  }

  const filtered = useMemo(() => {
    let list = orders
    if (tab !== 'all') list = list.filter((o) => o.status === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (o) =>
          o.document_name?.toLowerCase().includes(q) ||
          o.profiles?.email?.toLowerCase().includes(q)
      )
    }
    return list
  }, [orders, tab, search])

  const counts = useMemo(() => {
    const c = { all: orders.length, received: 0, in_process: 0, ready: 0, shipped: 0 }
    orders.forEach((o) => { c[o.status] = (c[o.status] || 0) + 1 })
    return c
  }, [orders])

  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Staff</p>
            <h1 className="font-display mt-1 text-3xl font-semibold text-[var(--ink)]">All documents</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/staff/embassy-fees"
              className="rounded-full border border-[var(--ink)]/25 px-5 py-2.5 text-sm font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
            >
              Embassy fees
            </Link>
            <Link
              to="/staff/team"
              className="rounded-full border border-[var(--ink)]/25 px-5 py-2.5 text-sm font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
            >
              Team
            </Link>
            <Link
              to="/staff/blog"
              className="rounded-full border border-[var(--ink)]/25 px-5 py-2.5 text-sm font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
            >
              Manage blog
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors ${
                  tab === t
                    ? 'bg-[var(--ink)] text-[var(--parchment)]'
                    : 'border border-[var(--line)] text-[var(--slate)] hover:border-[var(--wax)]'
                }`}
              >
                {t === 'all' ? 'All' : STATUS_LABEL[t]} ({counts[t] ?? 0})
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by document or client email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-[var(--line)] bg-white/60 px-4 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
          />
        </div>

        {loading && <p className="mt-8 font-mono text-sm text-[var(--slate)]">Loading…</p>}
        {error && <p className="mt-8 text-sm text-[var(--wax)]">{error}</p>}

        {!loading && filtered.length === 0 && (
          <p className="mt-8 font-mono text-sm text-[var(--slate)]">No documents match.</p>
        )}

        <div className="mt-8 overflow-hidden rounded-xl border border-[var(--line)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--parchment-dim)] font-mono text-xs uppercase tracking-wide text-[var(--slate)]">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned to</th>
                <th className="px-4 py-3">Requested completion</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-[var(--line)] hover:bg-white/40">
                  <td className="px-4 py-3">
                    <Link to={`/staff/orders/${o.id}`} className="text-[var(--ink)] hover:text-[var(--wax)]">
                      {o.profiles?.email ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {o.document_name}
                    {o.is_expedited && (
                      <span className="ml-2 rounded-full bg-[var(--brass)]/20 px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--brass)]">
                        Expedited
                      </span>
                    )}
                    {o.mail_in && (
                      <span className="ml-2 rounded-full bg-[var(--line)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--slate)]">
                        Mail-in
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{SERVICE_LABEL[o.service]}</td>
                  <td className="px-4 py-3">
                    <span className={o.payment_status === 'paid' ? 'text-[var(--brass)]' : 'text-[var(--wax)]'}>
                      {o.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={o.assigned_to || ''}
                      onChange={(e) => assignOrder(o.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg border border-[var(--line)] bg-white/70 px-2 py-1.5 text-xs outline-none focus:border-[var(--wax)]"
                    >
                      <option value="">Unassigned</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--slate)]">
                    {o.needed_by_date ? new Date(o.needed_by_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--slate)]">
                    {new Date(o.created_at).toLocaleDateString()}
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

function StatusBadge({ status }) {
  const colors = {
    received: 'bg-[var(--line)] text-[var(--ink)]',
    in_process: 'bg-[var(--brass)]/25 text-[var(--brass)]',
    ready: 'bg-[var(--wax)]/15 text-[var(--wax)]',
    shipped: 'bg-[var(--ink)]/10 text-[var(--ink)]',
  }
  return (
    <span className={`rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wide ${colors[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}
