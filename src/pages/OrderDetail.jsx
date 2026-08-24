import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import StatusTracker from '../components/StatusTracker'
import LegalizationPath from '../components/LegalizationPath'
import { HAGUE_COUNTRIES } from '../lib/countries'
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const paymentResult = searchParams.get('payment') // 'success' | 'cancelled' | null
  const feesResult = searchParams.get('fees') // 'success' | 'cancelled' | null
  const [order, setOrder] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [fees, setFees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [isFirstOrder, setIsFirstOrder] = useState(false)
  const [payingFees, setPayingFees] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const [responseFile, setResponseFile] = useState(null)
  const [uploadingResponse, setUploadingResponse] = useState(false)

  const [returnLabelFile, setReturnLabelFile] = useState(null)
  const [uploadingReturnLabel, setUploadingReturnLabel] = useState(false)

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

      if (paymentResult === 'success') {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
        if (active) setIsFirstOrder((count ?? 0) <= 1)
      }

      const left = daysLeft(data.ready_at)
      if (data.file_path && (data.status !== 'shipped' || left == null || left > 0)) {
        const { data: signed } = await supabase.storage
          .from(DOCUMENTS_BUCKET)
          .createSignedUrl(data.file_path, 60 * 5)
        if (active && signed) setDownloadUrl(signed.signedUrl)
      }

      await loadAttachments(active)
      await loadFees(active)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [id, user.id])

  // Live-update this order if staff changes it while the client has it open
  useEffect(() => {
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (payload) => {
          setOrder((prev) => (prev ? { ...prev, ...payload.new } : prev))
          if (payload.new.file_path && !downloadUrl) {
            supabase.storage
              .from(DOCUMENTS_BUCKET)
              .createSignedUrl(payload.new.file_path, 60 * 5)
              .then(({ data: signed }) => {
                if (signed) setDownloadUrl(signed.signedUrl)
              })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  async function loadAttachments(active = true) {
    const { data } = await supabase
      .from('order_attachments')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false })

    const withUrls = await Promise.all(
      (data ?? []).map(async (a) => {
        const { data: signed } = await supabase.storage
          .from(DOCUMENTS_BUCKET)
          .createSignedUrl(a.file_path, 60 * 5)
        return { ...a, url: signed?.signedUrl }
      })
    )
    if (active) setAttachments(withUrls)
  }

  async function loadFees(active = true) {
    const { data } = await supabase
      .from('order_fees')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true })
    if (active) setFees(data ?? [])
  }

  const payFees = async () => {
    const unpaidIds = fees.filter((f) => !f.paid).map((f) => f.id)
    if (unpaidIds.length === 0) return
    setPayingFees(true)
    const { data, error } = await supabase.functions.invoke('create-fee-checkout-session', {
      body: { fee_ids: unpaidIds },
    })
    setPayingFees(false)
    if (!error && data?.url) window.location.href = data.url
  }

  const uploadResponseFile = async () => {
    if (!responseFile) return
    setUploadingResponse(true)
    setError('')
    try {
      const ext = responseFile.name.split('.').pop()
      const path = `${user.id}/attachments/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, responseFile)
      if (uploadError) throw uploadError

      const { error: insertError } = await supabase.from('order_attachments').insert({
        order_id: id,
        file_path: path,
        file_name: responseFile.name,
        uploaded_by: 'client',
        category: 'supporting',
      })
      if (insertError) throw insertError

      setResponseFile(null)
      await loadAttachments()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingResponse(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')

    // Clean up any supporting document files too
    if (attachments.length > 0) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove(attachments.map((a) => a.file_path))
    }
    if (order.file_path) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([order.file_path])
    }
    const { error } = await supabase.from('orders').delete().eq('id', id)

    setDeleting(false)
    if (error) {
      setError(error.message)
      setConfirmingDelete(false)
    } else {
      navigate('/portal')
    }
  }

  const uploadReturnLabel = async () => {
    if (!returnLabelFile) return
    setUploadingReturnLabel(true)
    setError('')
    try {
      const ext = returnLabelFile.name.split('.').pop()
      const path = `${user.id}/return-labels/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, returnLabelFile)
      if (uploadError) throw uploadError

      const { error: insertError } = await supabase.from('order_attachments').insert({
        order_id: id,
        file_path: path,
        file_name: returnLabelFile.name,
        uploaded_by: 'client',
        category: 'return_label',
      })
      if (insertError) throw insertError

      setReturnLabelFile(null)
      await loadAttachments()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingReturnLabel(false)
    }
  }

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

  const handlePayNow = async () => {
    setRetrying(true)
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { order_id: order.id },
    })
    setRetrying(false)
    if (!error && data?.url) window.location.href = data.url
  }

  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/portal" className="font-mono text-xs uppercase tracking-widest text-[var(--slate)] hover:text-[var(--wax)]">
          ← Your documents
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[var(--ink)]">
              {order.document_name}
              {order.is_expedited && (
                <span className="ml-3 rounded-full bg-[var(--brass)]/20 px-3 py-1 align-middle font-mono text-xs uppercase text-[var(--brass)]">
                  Expedited
                </span>
              )}
            </h1>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
              {SERVICE_LABEL[order.service]} · Submitted {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          {order.status === 'received' ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="rounded-full border border-[var(--wax)]/40 px-4 py-2 font-mono text-xs uppercase tracking-wide text-[var(--wax)] hover:bg-[var(--wax)]/10 transition-colors"
            >
              Delete document
            </button>
          ) : (
            <p className="max-w-[220px] text-right font-mono text-[10px] uppercase tracking-wide text-[var(--slate)]">
              Can't be deleted once processing has started — contact us if you need this removed.
            </p>
          )}
        </div>

        {confirmingDelete && (
          <div className="mt-6 rounded-xl border border-[var(--wax)] bg-[var(--wax)]/10 p-6">
            <p className="font-display text-lg font-semibold text-[var(--ink)]">Delete this document?</p>
            <p className="mt-2 text-sm text-[var(--ink)]/85">
              This permanently removes "{order.document_name}" and your uploaded file. This can't be undone.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="rounded-full border border-[var(--ink)]/25 px-5 py-2.5 text-sm font-medium text-[var(--ink)] hover:border-[var(--ink)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-full bg-[var(--wax)] px-5 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, permanently delete'}
              </button>
            </div>
          </div>
        )}

        {isFirstOrder && paymentResult === 'success' && (
          <div className="mt-6 rounded-xl border border-[var(--ink)]/20 bg-[var(--ink)] p-6 text-[var(--parchment)]">
            <p className="font-display text-lg font-semibold">Get the True Doc Pros app.</p>
            <p className="mt-1 text-sm opacity-80">
              Track this document, upload your next one, and download completed copies straight from your phone.
            </p>
            <Link
              to="/app"
              className="mt-4 inline-block rounded-full bg-[var(--parchment)] px-5 py-2.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--wax)] hover:text-[var(--parchment)] transition-colors"
            >
              Install the app
            </Link>
          </div>
        )}

        {order.request_status === 'requested' && (
          <div className="mt-6 rounded-xl border border-[var(--wax)] bg-[var(--wax)]/10 p-6">
            <p className="font-display text-lg font-semibold text-[var(--ink)]">We need one more thing from you.</p>
            <p className="mt-2 text-sm text-[var(--ink)]/85">{order.requested_documents}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                type="file"
                onChange={(e) => setResponseFile(e.target.files?.[0] ?? null)}
                className="flex-1 text-xs text-[var(--slate)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--ink)] file:px-3 file:py-1.5 file:text-[var(--parchment)] file:text-xs"
              />
              <button
                onClick={uploadResponseFile}
                disabled={!responseFile || uploadingResponse}
                className="rounded-full bg-[var(--wax)] px-5 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors disabled:opacity-50"
              >
                {uploadingResponse ? 'Uploading…' : 'Upload document'}
              </button>
            </div>
          </div>
        )}

        {order.destination_country && (
          <div className="mt-6">
            <LegalizationPath
              isHague={HAGUE_COUNTRIES.includes(order.destination_country)}
              country={order.destination_country}
            />
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-8">
          <div className="mb-6 flex items-center justify-between">
            <StatusTracker status={order.status} />
          </div>
          {order.payment_status !== 'paid' && paymentResult !== 'cancelled' && (
            <div className="mt-6 flex items-center justify-between rounded-lg border border-[var(--brass)]/40 bg-[var(--parchment-dim)] px-4 py-3">
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--brass)]">Payment pending</span>
              <button
                onClick={handlePayNow}
                disabled={retrying}
                className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-60"
              >
                {retrying ? 'Loading…' : 'Pay now'}
              </button>
            </div>
          )}
        </div>

        {paymentResult === 'success' && (
          <div className="mt-6 rounded-xl border border-[var(--wax)]/40 bg-[var(--wax)]/10 p-5">
            <p className="font-display text-lg font-semibold text-[var(--ink)]">Payment received.</p>
            <p className="mt-1 text-sm text-[var(--slate)]">
              We've got your document and your payment — you'll see status updates right here.
            </p>
          </div>
        )}
        {paymentResult === 'cancelled' && order.payment_status !== 'paid' && (
          <div className="mt-6 rounded-xl border border-[var(--brass)]/40 bg-[var(--parchment-dim)] p-5">
            <p className="font-display text-lg font-semibold text-[var(--ink)]">Payment not completed.</p>
            <p className="mt-1 text-sm text-[var(--slate)]">
              Your document was uploaded, but checkout was cancelled before payment finished.
            </p>
            <button
              onClick={handlePayNow}
              disabled={retrying}
              className="mt-4 rounded-full bg-[var(--wax)] px-5 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors disabled:opacity-60"
            >
              {retrying ? 'Loading…' : 'Complete payment'}
            </button>
          </div>
        )}

        {fees.length > 0 && (
          <div className="mt-6 rounded-xl border border-[var(--brass)]/40 bg-[var(--brass)]/5 p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--brass)]">Additional fees</p>
            <p className="mt-1 text-xs text-[var(--slate)]">
              Costs like Secretary of State or embassy fees, separate from what you already paid.
            </p>
            <div className="mt-3 space-y-2">
              {fees.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-white/50 px-4 py-2.5">
                  <span className="text-sm text-[var(--ink)]">{fee.description}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-[var(--ink)]">${(fee.amount_cents / 100).toFixed(2)}</span>
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${fee.paid ? 'bg-[var(--wax)]/15 text-[var(--wax)]' : 'bg-[var(--line)] text-[var(--slate)]'}`}>
                      {fee.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {fees.some((f) => !f.paid) && (
              <button
                onClick={payFees}
                disabled={payingFees}
                className="mt-4 rounded-full bg-[var(--wax)] px-5 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors disabled:opacity-60"
              >
                {payingFees
                  ? 'Loading…'
                  : `Pay $${(fees.filter((f) => !f.paid).reduce((sum, f) => sum + f.amount_cents, 0) / 100).toFixed(2)} in fees`}
              </button>
            )}
            {feesResult === 'success' && (
              <p className="mt-3 font-mono text-xs text-[var(--brass)]">Payment received — thank you.</p>
            )}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-[var(--line)] p-5 sm:grid-cols-3">
          {order.contact_name && <MiniField label="Contact" value={order.contact_name} />}
          {order.company_name && <MiniField label="Company" value={order.company_name} />}
          {order.contact_phone && <MiniField label="Phone" value={order.contact_phone} />}
          {order.destination_country && <MiniField label="Country of use" value={order.destination_country} />}
          {order.origin_state && <MiniField label="State of origin" value={order.origin_state} />}
          {order.sos_fee_cents > 0 && (
            <MiniField label="SOS fee" value={`$${(order.sos_fee_cents / 100).toFixed(2)}`} />
          )}
          <MiniField label="Document type" value={order.document_type === 'business' ? 'Business' : 'Personal'} />
          {order.embassy_fee_cents > 0 && (
            <MiniField label="Embassy fee" value={`$${(order.embassy_fee_cents / 100).toFixed(2)}`} />
          )}
          {order.needed_by_date && (
            <MiniField label="Needed by" value={new Date(order.needed_by_date).toLocaleDateString()} />
          )}
        </div>

        {order.notes && (
          <div className="mt-6 rounded-xl border border-[var(--line)] p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Your notes</p>
            <p className="mt-2 text-sm text-[var(--ink)]/85">{order.notes}</p>
          </div>
        )}

        {attachments.filter((a) => a.category === 'completed_document').length > 0 && (
          <div className="mt-6 rounded-xl border border-[var(--wax)]/40 bg-[var(--wax)]/5 p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--wax)]">Completed document</p>
            <div className="mt-3 space-y-2">
              {attachments
                .filter((a) => a.category === 'completed_document')
                .map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-[var(--wax)]/30 bg-white/60 px-4 py-3 hover:border-[var(--wax)] transition-colors"
                  >
                    <span className="text-sm font-medium text-[var(--ink)]">{a.file_name || 'Completed document'}</span>
                    <span className="font-mono text-xs uppercase tracking-wide text-[var(--wax)]">View & download</span>
                  </a>
                ))}
            </div>
          </div>
        )}

        {attachments.filter((a) => a.category !== 'return_label' && a.category !== 'completed_document').length > 0 && (
          <div className="mt-6 rounded-xl border border-[var(--line)] p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Supporting documents</p>
            <div className="mt-3 space-y-2">
              {attachments.filter((a) => a.category !== 'return_label' && a.category !== 'completed_document').map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-[var(--line)] px-4 py-2.5 hover:border-[var(--wax)] transition-colors"
                >
                  <span className="text-sm text-[var(--ink)]">{a.file_name || 'Document'}</span>
                  <span className="font-mono text-xs text-[var(--slate)]">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-[var(--line)] p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Return shipping label</p>
          <p className="mt-1 text-xs text-[var(--slate)]">
            If you'd like us to mail your completed document back with your own prepaid label, upload it here.
          </p>
          {attachments.filter((a) => a.category === 'return_label').length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.filter((a) => a.category === 'return_label').map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-[var(--brass)]/40 bg-[var(--brass)]/10 px-4 py-2.5 hover:border-[var(--brass)] transition-colors"
                >
                  <span className="text-sm text-[var(--ink)]">{a.file_name || 'Return label'}</span>
                  <span className="font-mono text-xs text-[var(--brass)]">Uploaded</span>
                </a>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="file"
              onChange={(e) => setReturnLabelFile(e.target.files?.[0] ?? null)}
              className="flex-1 text-xs text-[var(--slate)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--ink)] file:px-3 file:py-1.5 file:text-[var(--parchment)] file:text-xs"
            />
            <button
              onClick={uploadReturnLabel}
              disabled={!returnLabelFile || uploadingReturnLabel}
              className="rounded-full border border-[var(--ink)]/25 px-4 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors disabled:opacity-50"
            >
              {uploadingReturnLabel ? 'Uploading…' : 'Upload label'}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--line)] p-6">
          {order.mail_in && !order.file_path ? (
            <p className="font-mono text-sm text-[var(--slate)]">
              You chose to mail this document to us — we'll update its status once it arrives.
            </p>
          ) : expired ? (
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

function MiniField({ label, value }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">{label}</p>
      <p className="mt-0.5 text-sm text-[var(--ink)]">{value}</p>
    </div>
  )
}
