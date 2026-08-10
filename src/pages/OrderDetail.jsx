import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import StatusTracker from '../components/StatusTracker'
import { useAuth } from '../lib/AuthContext'
import { supabase, DOCUMENTS_BUCKET } from '../lib/supabaseClient'

const SERVICE_LABEL = { notary: 'Notary', apostille: 'Apostille', embassy: 'Embassy legalization' }
const RETENTION_DAYS = 30

function daysLeft(readyAt) {
  if (!readyAt) return null
  const expires = new Date(readyAt)
  expires.setDate(expires.getDate() + RETENTION_DAYS)
  return Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24))
}

export default function OrderDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadUrl, setDownloadUrl] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      if (!active) return
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setOrder(data)

      const left = daysLeft(data.ready_at)
      if (data.file_path && (data.status !== 'shipped' || left == null || left > 0)) {
        const { data: signed } = await supabase.storage
          .from(DOCUMENTS_BUCKET)
          .createSignedUrl(data.file_path, 60 * 5)
        if (active && signed) setDownloadUrl(signed.signedUrl)
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [id, user.id])

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-6 py-20 text-center font-mono text-sm text-[var(--slate)]">
          Loading…
        </div>
      </Layout>
    )
  }

  if (error || !order) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="font-display text-xl text-[var(--ink)]">Document not found.</p>
          <Link to="/portal" className="mt-4 inline-block text-sm text-[var(--wax)] hover:underline">
            ← Back to your documents
          </Link>
        </div>
      </Layout>
    )
  }

  const left = daysLeft(order.ready_at)
  const expired = order.status === 'shipped' && left != null && left <= 0

  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/portal" className="font-mono text-xs uppercase tracking-widest text-[var(--slate)] hover:text-[var(--wax)]">
          ← Your documents
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[var(--ink)]">{order.document_name}</h1>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
              {SERVICE_LABEL[order.service]} · Submitted {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-[var(--line)] bg-white/40 p-8">
          <StatusTracker status={order.status} />
        </div>

        {order.notes && (
          <div className="mt-6 rounded-xl border border-[var(--line)] p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Your notes</p>
            <p className="mt-2 text-sm text-[var(--ink)]/85">{order.notes}</p>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-[var(--line)] p-6">
          {expired ? (
            <p className="font-mono text-sm text-[var(--slate)]">
              The 30-day access window for this document has closed. Contact us if you need a copy re-issued.
            </p>
          ) : downloadUrl ? (
            <>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors"
              >
                Download document
              </a>
              {order.status === 'shipped' && left != null && (
                <p className="mt-3 font-mono text-xs text-[var(--brass)]">
                  Available for {left} more day{left === 1 ? '' : 's'}.
                </p>
              )}
            </>
          ) : (
            <p className="font-mono text-sm text-[var(--slate)]">
              Your original upload is on file. A certified copy will appear here once your document is Ready.
            </p>
          )}
        </div>
      </section>
    </Layout>
  )
}
