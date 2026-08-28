import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import useDocumentHead from '../lib/useDocumentHead'

const SERVICE_LABEL = { notary: 'Notary', apostille: 'Apostille', embassy: 'Embassy legalization' }

export default function Receipt() {
  useDocumentHead({ title: 'Receipt', description: 'Payment receipt.', path: '' })
  const { id } = useParams()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [fees, setFees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()
      if (orderError || !orderData || orderData.user_id !== user?.id) {
        if (active) {
          setError("This receipt isn't available.")
          setLoading(false)
        }
        return
      }
      const { data: feesData } = await supabase
        .from('order_fees')
        .select('*')
        .eq('order_id', id)
        .eq('paid', true)
        .order('created_at', { ascending: true })
      if (active) {
        setOrder(orderData)
        setFees(feesData || [])
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [id, user])

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-6 py-20 text-center font-mono text-sm text-[var(--slate)]">Loading…</div>
      </Layout>
    )
  }

  if (error || !order || order.payment_status !== 'paid') {
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <p className="font-display text-xl text-[var(--ink)]">
            {error || 'No payment has been received on this order yet.'}
          </p>
          <Link to="/portal" className="mt-4 inline-block text-sm text-[var(--wax)] hover:underline">
            ← My documents
          </Link>
        </div>
      </Layout>
    )
  }

  const feesTotal = fees.reduce((sum, f) => sum + f.amount_cents, 0)
  const grandTotal = (order.amount_cents || 0) + feesTotal

  return (
    <Layout>
      <section className="receipt-print mx-auto max-w-2xl px-6 py-16">
        <div className="print-hide mb-8 flex items-center justify-between">
          <Link to={`/portal/orders/${id}`} className="font-mono text-xs uppercase tracking-widest text-[var(--slate)] hover:text-[var(--wax)]">
            ← Back to order
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors"
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-8">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-6">
            <div>
              <p className="font-display text-2xl font-semibold text-[var(--ink)]">
                True Doc <span className="text-[var(--wax)]" style={{ filter: 'drop-shadow(0px 0.6px 0.4px rgba(0,0,0,0.25))' }}>Pros</span>
              </p>
              <p className="mt-1 text-xs text-[var(--slate)]">truedocpros.com</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Receipt</p>
              <p className="mt-1 text-sm text-[var(--ink)]">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Billed to</p>
              <p className="mt-1 text-sm text-[var(--ink)]">{order.contact_name || '—'}</p>
              <p className="text-sm text-[var(--slate)]">{user?.email}</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Order</p>
              <p className="mt-1 text-sm text-[var(--ink)]">{order.document_name}</p>
              <p className="text-sm text-[var(--slate)]">{SERVICE_LABEL[order.service]}</p>
            </div>
          </div>

          <div className="mt-8">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--line)]">
                  <td className="py-2 text-[var(--ink)]">
                    {SERVICE_LABEL[order.service]} handling fee{order.is_expedited ? ' (expedited)' : ''}
                  </td>
                  <td className="py-2 text-right text-[var(--ink)]">${((order.amount_cents || 0) / 100).toFixed(2)}</td>
                </tr>
                {fees.map((f) => (
                  <tr key={f.id} className="border-b border-[var(--line)]">
                    <td className="py-2 text-[var(--ink)]">{f.description}</td>
                    <td className="py-2 text-right text-[var(--ink)]">${(f.amount_cents / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-between border-t border-[var(--line)] pt-4">
              <span className="font-mono text-sm uppercase tracking-widest text-[var(--slate)]">Total paid</span>
              <span className="font-display text-xl font-semibold text-[var(--ink)]">${(grandTotal / 100).toFixed(2)}</span>
            </div>
          </div>

          <p className="mt-10 text-center text-xs text-[var(--slate)]">
            Thank you for your business. Questions about this receipt? Contact us at info@truedocpros.com.
          </p>
        </div>
      </section>
    </Layout>
  )
}
