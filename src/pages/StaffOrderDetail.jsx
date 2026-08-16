import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase, DOCUMENTS_BUCKET } from '../lib/supabaseClient'

const SERVICE_LABEL = { notary: 'Notary', apostille: 'Apostille', embassy: 'Embassy legalization' }
const STATUSES = [
  { value: 'received', label: 'Received' },
  { value: 'in_process', label: 'In process' },
  { value: 'ready', label: 'Ready' },
  { value: 'shipped', label: 'Shipped / Returned' },
]

export default function StaffOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [requestNote, setRequestNote] = useState('')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [staffFile, setStaffFile] = useState(null)
  const [uploadingStaffFile, setUploadingStaffFile] = useState(false)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles:user_id (email)')
      .eq('id', id)
      .single()
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setOrder(data)
    setRequestNote(data.requested_documents || '')

    if (data.file_path) {
      const { data: signed } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(data.file_path, 60 * 10)
      if (signed) setDownloadUrl(signed.signedUrl)
    }

    await loadAttachments()
    setLoading(false)
  }

  async function loadAttachments() {
    const { data } = await supabase
      .from('order_attachments')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false })

    const withUrls = await Promise.all(
      (data ?? []).map(async (a) => {
        const { data: signed } = await supabase.storage
          .from(DOCUMENTS_BUCKET)
          .createSignedUrl(a.file_path, 60 * 10)
        return { ...a, url: signed?.signedUrl }
      })
    )
    setAttachments(withUrls)
  }

  const updateStatus = async (newStatus) => {
    setSaving(true)
    setSaved(false)
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    setSaving(false)
    if (!error) {
      setOrder((prev) => ({ ...prev, status: newStatus }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      setError(error.message)
    }
  }

  const sendRequest = async () => {
    if (!requestNote.trim()) return
    setSendingRequest(true)
    const { error } = await supabase
      .from('orders')
      .update({ requested_documents: requestNote, request_status: 'requested' })
      .eq('id', id)
    setSendingRequest(false)
    if (!error) {
      setOrder((prev) => ({ ...prev, requested_documents: requestNote, request_status: 'requested' }))
    } else {
      setError(error.message)
    }
  }

  const clearRequest = async () => {
    setSendingRequest(true)
    const { error } = await supabase.from('orders').update({ request_status: 'fulfilled' }).eq('id', id)
    setSendingRequest(false)
    if (!error) {
      setOrder((prev) => ({ ...prev, request_status: 'fulfilled' }))
    }
  }

  const uploadStaffAttachment = async () => {
    if (!staffFile) return
    setUploadingStaffFile(true)
    setError('')
    try {
      const ext = staffFile.name.split('.').pop()
      const path = `${order.user_id}/attachments/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, staffFile)
      if (uploadError) throw uploadError

      const { error: insertError } = await supabase.from('order_attachments').insert({
        order_id: id,
        file_path: path,
        file_name: staffFile.name,
        uploaded_by: 'staff',
      })
      if (insertError) throw insertError

      setStaffFile(null)
      await loadAttachments()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingStaffFile(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Permanently delete "${order.document_name}"? This removes the order and the uploaded file. This can't be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')

    if (order.file_path) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([order.file_path])
    }
    const { error } = await supabase.from('orders').delete().eq('id', id)

    setDeleting(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/staff')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-6 py-20 text-center font-mono text-sm text-[var(--slate)]">Loading…</div>
      </Layout>
    )
  }

  if (error || !order) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <p className="font-display text-xl text-[var(--ink)]">Order not found.</p>
          <Link to="/staff" className="mt-4 inline-block text-sm text-[var(--wax)] hover:underline">
            ← All documents
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-6 py-16">
        <Link to="/staff" className="font-mono text-xs uppercase tracking-widest text-[var(--slate)] hover:text-[var(--wax)]">
          ← All documents
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-display text-3xl font-semibold text-[var(--ink)]">
            {order.document_name}
            {order.is_expedited && (
              <span className="ml-3 rounded-full bg-[var(--brass)]/20 px-3 py-1 align-middle font-mono text-xs uppercase text-[var(--brass)]">
                Expedited
              </span>
            )}
          </h1>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-full border border-[var(--wax)]/40 px-4 py-2 font-mono text-xs uppercase tracking-wide text-[var(--wax)] hover:bg-[var(--wax)]/10 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete order'}
          </button>
        </div>
        <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
          {SERVICE_LABEL[order.service]} · Submitted {new Date(order.created_at).toLocaleDateString()}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <InfoBlock label="Client" value={order.profiles?.email ?? '—'} />
          <InfoBlock
            label="Payment"
            value={order.payment_status === 'paid' ? `Paid ($${(order.amount_cents / 100).toFixed(2)})` : 'Unpaid'}
            highlight={order.payment_status !== 'paid'}
          />
          {order.contact_name && <InfoBlock label="Contact name" value={order.contact_name} />}
          {order.company_name && <InfoBlock label="Company" value={order.company_name} />}
          {order.contact_phone && <InfoBlock label="Phone" value={order.contact_phone} />}
          {order.destination_country && <InfoBlock label="Country of use" value={order.destination_country} />}
          {order.needed_by_date && (
            <InfoBlock label="Requested completion" value={new Date(order.needed_by_date).toLocaleDateString()} />
          )}
        </div>

        {order.notes && (
          <div className="mt-6 rounded-xl border border-[var(--line)] p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Client notes</p>
            <p className="mt-2 text-sm text-[var(--ink)]/85">{order.notes}</p>
          </div>
        )}

        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block rounded-full border border-[var(--ink)]/25 px-5 py-2.5 text-sm font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
          >
            View uploaded document
          </a>
        )}

        {/* Request supporting documents */}
        <div className="mt-10 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Request supporting documents</p>

          {order.request_status === 'requested' ? (
            <div className="mt-3 rounded-lg border border-[var(--brass)]/40 bg-[var(--brass)]/10 p-4">
              <p className="text-sm text-[var(--ink)]">{order.requested_documents}</p>
              <p className="mt-2 font-mono text-xs uppercase text-[var(--brass)]">Waiting on client</p>
              <button
                onClick={clearRequest}
                disabled={sendingRequest}
                className="mt-3 rounded-full border border-[var(--ink)]/25 px-4 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
              >
                Mark as fulfilled
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <textarea
                rows={2}
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="e.g. Please upload a color scan of your passport photo page"
                className="w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
              />
              <button
                onClick={sendRequest}
                disabled={sendingRequest || !requestNote.trim()}
                className="mt-3 rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-50"
              >
                {sendingRequest ? 'Sending…' : 'Request from client'}
              </button>
              <p className="mt-2 text-xs text-[var(--slate)]">
                The client sees this the moment they open their portal, with an upload box right there.
              </p>
            </div>
          )}
        </div>

        {/* Attachments */}
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Supporting documents</p>

          {attachments.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--slate)]">None uploaded yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {attachments.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-[var(--line)] px-4 py-2.5 hover:border-[var(--wax)] transition-colors"
                >
                  <span className="text-sm text-[var(--ink)]">{a.file_name || 'Document'}</span>
                  <span className="font-mono text-xs text-[var(--slate)]">
                    {a.uploaded_by === 'client' ? 'From client' : 'Staff upload'} · {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </a>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <input
              type="file"
              onChange={(e) => setStaffFile(e.target.files?.[0] ?? null)}
              className="flex-1 text-xs text-[var(--slate)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--ink)] file:px-3 file:py-1.5 file:text-[var(--parchment)] file:text-xs"
            />
            <button
              onClick={uploadStaffAttachment}
              disabled={!staffFile || uploadingStaffFile}
              className="rounded-full border border-[var(--ink)]/25 px-4 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors disabled:opacity-50"
            >
              {uploadingStaffFile ? 'Uploading…' : 'Attach file'}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Update status</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => updateStatus(s.value)}
                disabled={saving}
                className={`rounded-lg border px-3 py-2.5 text-sm transition-colors disabled:opacity-50 ${
                  order.status === s.value
                    ? 'border-[var(--wax)] bg-[var(--wax)]/10 text-[var(--wax)]'
                    : 'border-[var(--line)] text-[var(--ink)] hover:border-[var(--wax)]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {saved && <p className="mt-3 font-mono text-xs text-[var(--brass)]">Saved — client sees this instantly.</p>}
          {order.status === 'ready' && (
            <p className="mt-3 text-xs text-[var(--slate)]">
              The client's 30-day download window started the moment this was first marked Ready.
            </p>
          )}
        </div>
      </section>
    </Layout>
  )
}

function InfoBlock({ label, value, highlight }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">{label}</p>
      <p className={`mt-1 text-sm ${highlight ? 'text-[var(--wax)]' : 'text-[var(--ink)]'}`}>{value}</p>
    </div>
  )
}
