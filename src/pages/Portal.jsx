import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const SERVICE_LABEL = { notary: 'Notary', apostille: 'Apostille', embassy: 'Embassy legalization' }
const STATUS_LABEL = { received: 'Received', in_process: 'In process', ready: 'Ready', shipped: 'Shipped / Returned' }

const RETENTION_DAYS = 30

function daysLeft(readyAt) {
  if (!readyAt) return null
  const expires = new Date(readyAt)
  expires.setDate(expires.getDate() + RETENTION_DAYS)
  const diff = Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function Portal() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!active) return
      if (error) setError(error.message)
      else setOrders(data)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [user.id])

  const active = orders.filter((o) => o.status !== 'shipped' || daysLeft(o.ready_at) > 0)
  const archived = orders.filter((o) => o.status === 'shipped' && daysLeft(o.ready_at) <= 0)

  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Portal</p>
            <h1 className="font-display mt-1 text-3xl font-semibold text-[var(--ink)]">Your documents</h1>
          </div>
          <Link
            to="/portal/new"
            className="rounded-full bg-[var(--wax)] px-6 py-3 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors"
          >
            + Submit a new document
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        {loading && <p className="font-mono text-sm text-[var(--slate)]">Loading your documents…</p>}
        {error && <p className="text-sm text-[var(--wax)]">{error}</p>}

        {!loading && orders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--line)] p-12 text-center">
            <p className="font-display text-lg text-[var(--ink)]">Nothing here yet.</p>
            <p className="mt-2 text-sm text-[var(--slate)]">Submit your first document to start tracking it.</p>
            <Link to="/portal/new" className="mt-6 inline-block text-sm text-[var(--wax)] hover:underline">
              Submit a document →
            </Link>
          </div>
        )}

        <div className="grid gap-4">
          {active.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </div>

        {archived.length > 0 && (
          <div className="mt-12">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
              Past 30-day access window
            </p>
            <div className="mt-4 grid gap-3">
              {archived.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl border border-[var(--line)] px-5 py-4 opacity-60">
                  <div>
                    <p className="font-medium text-[var(--ink)]">{o.document_name}</p>
                    <p className="font-mono text-xs text-[var(--slate)]">{SERVICE_LABEL[o.service]}</p>
                  </div>
                  <span className="font-mono text-xs uppercase text-[var(--slate)]">Access expired</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </Layout>
  )
}

function OrderRow({ order }) {
  const left = daysLeft(order.ready_at)
  return (
    <Link
      to={`/portal/orders/${order.id}`}
      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-white/40 px-5 py-4 hover:border-[var(--wax)] transition-colors"
    >
      <div>
        <p className="font-medium text-[var(--ink)]">{order.document_name}</p>
        <p className="font-mono text-xs text-[var(--slate)]">
          {SERVICE_LABEL[order.service]} · Submitted {new Date(order.created_at).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {order.status === 'shipped' && left != null && left > 0 && (
          <span className="font-mono text-xs text-[var(--brass)]">{left} day{left === 1 ? '' : 's'} left to access</span>
        )}
        {order.payment_status !== 'paid' && (
          <span className="rounded-full bg-[var(--brass)]/20 px-3 py-1 font-mono text-xs uppercase text-[var(--brass)]">
            Payment pending
          </span>
        )}
        <StatusBadge status={order.status} />
      </div>
    </Link>
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
