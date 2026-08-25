import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase, DOCUMENTS_BUCKET } from '../lib/supabaseClient'
import ProcessingQueue, { isProcessingComplete } from '../components/ProcessingQueue'
import OrderMessages from '../components/OrderMessages'

const SERVICE_LABEL = { notary: 'Notary', apostille: 'Apostille', embassy: 'Embassy legalization' }
const SERVICES = [
  { value: 'notary', label: 'Notary', price: 25, expedite: 15 },
  { value: 'apostille', label: 'Apostille', price: 85, expedite: 40 },
  { value: 'embassy', label: 'Embassy legalization', price: 150, expedite: 75 },
]
const STATUS_LABEL = { received: 'Received', in_process: 'In process', ready: 'Ready', shipped: 'Shipped / Returned' }
const STATUSES = [
  { value: 'received', label: 'Received' },
  { value: 'in_process', label: 'In process' },
  { value: 'ready', label: 'Ready' },
  { value: 'shipped', label: 'Shipped / Returned' },
]

export default function StaffOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [order, setOrder] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [fees, setFees] = useState([])
  const [shippingDefaults, setShippingDefaults] = useState([])
  const [newFeeDesc, setNewFeeDesc] = useState('')
  const [newFeeAmount, setNewFeeAmount] = useState('')
  const [addingFee, setAddingFee] = useState(false)
  const [editingFeeId, setEditingFeeId] = useState(null)
  const [editFeeDesc, setEditFeeDesc] = useState('')
  const [editFeeAmount, setEditFeeAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)

  const [staffList, setStaffList] = useState([])
  const [assigning, setAssigning] = useState(false)

  const [requestNote, setRequestNote] = useState('')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [completedFile, setCompletedFile] = useState(null)
  const [uploadingCompletedFile, setUploadingCompletedFile] = useState(false)
  const [completedUploadResult, setCompletedUploadResult] = useState(null)
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null)
  const [showInvoice, setShowInvoice] = useState(false)
  const [sendingInvoice, setSendingInvoice] = useState(false)
  const [invoiceSentResult, setInvoiceSentResult] = useState(null)
  const [sendingUnpaidFeesEmail, setSendingUnpaidFeesEmail] = useState(false)
  const [unpaidFeesEmailResult, setUnpaidFeesEmailResult] = useState(null)

  useEffect(() => {
    load()
    loadStaffList()
    loadShippingDefaults()
  }, [id])

  async function loadStaffList() {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('is_staff', true)
      .order('full_name', { ascending: true })
    setStaffList(data ?? [])
  }

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
    await loadFees()
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

  async function loadFees() {
    const { data } = await supabase
      .from('order_fees')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true })
    setFees(data ?? [])
  }

  async function loadShippingDefaults() {
    const { data } = await supabase.from('shipping_fees').select('*')
    const order = ['sos', 'embassy', 'mail_home']
    const sorted = (data ?? []).slice().sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
    setShippingDefaults(sorted)
  }

  const [notifyError, setNotifyError] = useState('')

  const notifyClient = async (subject, message) => {
    setNotifyError('')
    const { error } = await supabase.functions.invoke('notify-client', {
      body: { order_id: id, subject, message },
    })
    if (error) setNotifyError('Update saved, but the email notification failed to send.')
    return !error
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
      await notifyClient(
        `Your document is now: ${STATUS_LABEL[newStatus]}`,
        `Hi ${order.contact_name || 'there'},\n\nYour document "${order.document_name}" has moved to a new status: ${STATUS_LABEL[newStatus]}.\n\nYou can see full details and any next steps in your portal.`
      )
    } else {
      setError(error.message)
    }
  }

  const assignOrder = async (staffId) => {
    setAssigning(true)
    const { error } = await supabase.from('orders').update({ assigned_to: staffId || null }).eq('id', id)
    setAssigning(false)
    if (!error) {
      setOrder((prev) => ({ ...prev, assigned_to: staffId || null }))
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
      await notifyClient(
        'We need one more thing from you',
        `Hi ${order.contact_name || 'there'},\n\nWe need something additional for "${order.document_name}":\n\n${requestNote}\n\nYou can upload it directly from your portal.`
      )
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

  const uploadCompletedDocument = async () => {
    if (!completedFile) return
    setUploadingCompletedFile(true)
    setCompletedUploadResult(null)
    try {
      const ext = completedFile.name.split('.').pop()
      const path = `${order.user_id}/attachments/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, completedFile)
      if (uploadError) throw uploadError

      const { error: insertError } = await supabase.from('order_attachments').insert({
        order_id: id,
        file_path: path,
        file_name: completedFile.name,
        uploaded_by: 'staff',
        category: 'completed_document',
      })
      if (insertError) throw insertError

      const { data, error: notifyError } = await supabase.functions.invoke('notify-document-ready', {
        body: { order_id: id },
      })

      setCompletedFile(null)
      await loadAttachments()

      if (notifyError || data?.error) {
        setCompletedUploadResult({
          ok: false,
          message: `Uploaded, but the client email failed to send: ${data?.error || notifyError.message}`,
        })
      } else {
        setCompletedUploadResult({ ok: true, message: 'Uploaded — the client has been emailed a link to view and download it.' })
      }
    } catch (err) {
      setCompletedUploadResult({ ok: false, message: err.message })
    } finally {
      setUploadingCompletedFile(false)
    }
  }

  const deleteCompletedDocument = async (attachment) => {
    if (!window.confirm(`Remove "${attachment.file_name}"? The client will no longer be able to view or download it.`)) return
    setDeletingAttachmentId(attachment.id)
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([attachment.file_path])
    const { error } = await supabase.from('order_attachments').delete().eq('id', attachment.id)
    setDeletingAttachmentId(null)
    if (!error) await loadAttachments()
    else setError(error.message)
  }

  const deleteClientAttachment = async (attachment) => {
    if (!window.confirm(`Remove "${attachment.file_name}"?`)) return
    setDeletingAttachmentId(attachment.id)
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([attachment.file_path])
    const { error } = await supabase.from('order_attachments').delete().eq('id', attachment.id)
    setDeletingAttachmentId(null)
    if (!error) await loadAttachments()
    else setError(error.message)
  }

  const invoiceBreakdown = () => {
    const service = SERVICES.find((s) => s.value === order.service) || SERVICES[0]
    const items = [{ label: `${service.label} handling fee`, amount: service.price }]
    if (order.is_expedited) items.push({ label: 'Expedited processing', amount: service.expedite })
    if (order.arrived_notarized) items.push({ label: 'Notary fee (waived — arrived pre-notarized)', amount: 0 })
    if (order.sos_fee_cents > 0) items.push({ label: `Secretary of State fee${order.origin_state ? ` (${order.origin_state})` : ''}`, amount: order.sos_fee_cents / 100 })
    if (order.state_dept_fee_cents > 0) items.push({ label: 'U.S. State Department fee', amount: order.state_dept_fee_cents / 100 })
    if (order.embassy_fee_cents > 0) items.push({ label: `Embassy fee${order.destination_country ? ` (${order.destination_country})` : ''}`, amount: order.embassy_fee_cents / 100 })
    fees.forEach((fee) => items.push({ label: `${fee.description}${fee.paid ? ' (paid)' : ''}`, amount: fee.amount_cents / 100 }))
    const total = items.reduce((sum, item) => sum + item.amount, 0)
    return { items, total }
  }

  const emailInvoice = async () => {
    setSendingInvoice(true)
    setInvoiceSentResult(null)
    const { items, total } = invoiceBreakdown()
    const { data, error: invoiceError } = await supabase.functions.invoke('send-invoice-breakdown', {
      body: { order_id: id, items, total },
    })
    setSendingInvoice(false)
    if (invoiceError || data?.error) {
      setInvoiceSentResult({ ok: false, message: data?.error || invoiceError.message })
    } else {
      setInvoiceSentResult({ ok: true, message: 'Sent — the client has been emailed this breakdown.' })
    }
  }

  const emailUnpaidFees = async () => {
    setSendingUnpaidFeesEmail(true)
    setUnpaidFeesEmailResult(null)
    const { data, error: feesEmailError } = await supabase.functions.invoke('notify-unpaid-fees', {
      body: { order_id: id },
    })
    setSendingUnpaidFeesEmail(false)
    if (feesEmailError || data?.error) {
      setUnpaidFeesEmailResult({ ok: false, message: data?.error || feesEmailError.message })
    } else {
      setUnpaidFeesEmailResult({
        ok: true,
        message: `Sent — the client has been emailed a direct payment link for $${(data.total_cents / 100).toFixed(2)}.`,
      })
    }
  }

  const addFee = async () => {
    const amount = Math.round(parseFloat(newFeeAmount) * 100)
    if (!newFeeDesc.trim() || !amount || amount <= 0) return
    setAddingFee(true)
    const { error } = await supabase.from('order_fees').insert({
      order_id: id,
      description: newFeeDesc.trim(),
      amount_cents: amount,
    })
    setAddingFee(false)
    if (!error) {
      setNewFeeDesc('')
      setNewFeeAmount('')
      await loadFees()
      await notifyClient(
        'An additional fee has been added to your order',
        `Hi ${order.contact_name || 'there'},\n\nWe've added an additional fee to "${order.document_name}":\n\n${newFeeDesc.trim()} — $${(amount / 100).toFixed(2)}\n\nYou can review and pay it from your portal.`
      )
    } else {
      setError(error.message)
    }
  }

  const startEditFee = (fee) => {
    setEditingFeeId(fee.id)
    setEditFeeDesc(fee.description)
    setEditFeeAmount((fee.amount_cents / 100).toFixed(2))
  }

  const saveEditFee = async (feeId) => {
    const amount = Math.round(parseFloat(editFeeAmount) * 100)
    if (!editFeeDesc.trim() || !amount || amount <= 0) return
    const { error } = await supabase
      .from('order_fees')
      .update({ description: editFeeDesc.trim(), amount_cents: amount })
      .eq('id', feeId)
    if (!error) {
      setEditingFeeId(null)
      await loadFees()
    } else {
      setError(error.message)
    }
  }

  const deleteFee = async (feeId) => {
    if (!window.confirm('Remove this fee?')) return
    const { error } = await supabase.from('order_fees').delete().eq('id', feeId)
    if (!error) await loadFees()
    else setError(error.message)
  }

  const saveDocumentName = async () => {
    if (!nameDraft.trim()) return
    setSavingName(true)
    const { error } = await supabase.from('orders').update({ document_name: nameDraft.trim() }).eq('id', id)
    setSavingName(false)
    if (!error) {
      setOrder((prev) => ({ ...prev, document_name: nameDraft.trim() }))
      setEditingName(false)
    } else {
      setError(error.message)
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
          <div className="flex-1">
            {editingName ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  autoFocus
                  className="font-display flex-1 min-w-[200px] rounded-lg border border-[var(--wax)] bg-white/70 px-3 py-2 text-2xl font-semibold text-[var(--ink)] outline-none"
                />
                <button
                  onClick={saveDocumentName}
                  disabled={savingName || !nameDraft.trim()}
                  className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-50"
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="text-sm text-[var(--slate)] hover:text-[var(--wax)]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h1 className="font-display text-3xl font-semibold text-[var(--ink)]">
                {order.document_name}
                {order.is_expedited && (
                  <span className="ml-3 rounded-full bg-[var(--brass)]/20 px-3 py-1 align-middle font-mono text-xs uppercase text-[var(--brass)]">
                    Expedited
                  </span>
                )}
                <button
                  onClick={() => { setNameDraft(order.document_name); setEditingName(true) }}
                  className="ml-3 align-middle font-mono text-xs uppercase tracking-wide text-[var(--slate)] hover:text-[var(--wax)]"
                >
                  Edit name
                </button>
              </h1>
            )}
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-full border border-[var(--wax)]/40 px-4 py-2 font-mono text-xs uppercase tracking-wide text-[var(--wax)] hover:bg-[var(--wax)]/10 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete order'}
          </button>
        </div>
        <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
          Submitted {new Date(order.created_at).toLocaleDateString()}
        </p>

        {/* 1. Assigned to */}
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Assigned to</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isAdmin ? (
              <>
                <select
                  value={order.assigned_to || ''}
                  onChange={(e) => assignOrder(e.target.value)}
                  disabled={assigning}
                  className="rounded-lg border border-[var(--line)] bg-white/70 px-4 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
                >
                  <option value="">Unassigned</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                  ))}
                </select>
                {assigning && <span className="font-mono text-xs text-[var(--slate)]">Saving…</span>}
              </>
            ) : (
              <p className="text-sm text-[var(--ink)]">Assigned to you</p>
            )}
          </div>
          {notifyError && <p className="mt-3 text-xs text-[var(--wax)]">{notifyError}</p>}
        </div>

        {/* 2. Client info */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
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
          {order.origin_state && <InfoBlock label="State of origin" value={order.origin_state} />}
          {order.sos_fee_cents > 0 && (
            <InfoBlock label="SOS fee charged" value={`$${(order.sos_fee_cents / 100).toFixed(2)}`} />
          )}
          {order.state_dept_fee_cents > 0 && (
            <InfoBlock label="State Dept fee charged" value={`$${(order.state_dept_fee_cents / 100).toFixed(2)}`} />
          )}
          <InfoBlock label="Document type" value={order.document_type === 'business' ? 'Business' : 'Personal'} />
          {order.embassy_fee_cents > 0 && (
            <InfoBlock label="Embassy fee charged" value={`$${(order.embassy_fee_cents / 100).toFixed(2)}`} />
          )}
          {order.needed_by_date && (
            <InfoBlock label="Requested completion" value={new Date(order.needed_by_date).toLocaleDateString()} />
          )}
        </div>

        {/* 3. Service requested */}
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Service requested</p>
          <p className="mt-2 text-lg font-medium text-[var(--ink)]">{SERVICE_LABEL[order.service]}</p>
        </div>

        {order.notes && (
          <div className="mt-6 rounded-xl border border-[var(--line)] p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Client notes</p>
            <p className="mt-2 text-sm text-[var(--ink)]/85">{order.notes}</p>
          </div>
        )}

        {downloadUrl ? (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block rounded-full border border-[var(--ink)]/25 px-5 py-2.5 text-sm font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
          >
            View uploaded document
          </a>
        ) : order.mail_in ? (
          <div className="mt-6 rounded-lg border border-[var(--brass)]/40 bg-[var(--brass)]/10 px-4 py-3">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--brass)]">Mail-in document</p>
            <p className="mt-1 text-sm text-[var(--ink)]">Client is mailing the physical document — no file uploaded.</p>
          </div>
        ) : null}

        {/* 4. Internal processing queue */}
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <ProcessingQueue order={order} onUpdate={(fields) => setOrder((prev) => ({ ...prev, ...fields }))} />
        </div>

        {/* 5. Email client for supporting documents */}
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Email client for supporting documents</p>

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
                {sendingRequest ? 'Sending…' : 'Send email'}
              </button>
              <p className="mt-2 text-xs text-[var(--slate)]">
                The client sees this the moment they open their portal, with an upload box right there.
              </p>
            </div>
          )}

          <div className="mt-6 border-t border-[var(--line)] pt-5">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Client uploaded docs</p>
            {attachments.filter((a) => a.category !== 'return_label' && a.category !== 'completed_document' && a.uploaded_by === 'client').length === 0 ? (
              <p className="mt-3 text-sm text-[var(--slate)]">None uploaded yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {attachments
                  .filter((a) => a.category !== 'return_label' && a.category !== 'completed_document' && a.uploaded_by === 'client')
                  .map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--line)] px-4 py-2.5"
                    >
                      <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-[var(--ink)] hover:text-[var(--wax)]">
                        {a.file_name || 'Document'}
                      </a>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-[var(--slate)]">
                          {new Date(a.created_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => deleteClientAttachment(a)}
                          disabled={deletingAttachmentId === a.id}
                          className="font-mono text-xs uppercase tracking-wide text-[var(--wax)] hover:underline disabled:opacity-50"
                        >
                          {deletingAttachmentId === a.id ? 'Removing…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <OrderMessages orderId={order.id} sender="staff" title="Messages with client" />
        </div>

        {/* Return shipping label */}
        {attachments.filter((a) => a.category === 'return_label').length > 0 && (
          <div className="mt-6 rounded-2xl border border-[var(--brass)]/40 bg-[var(--brass)]/10 p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--brass)]">Return shipping label</p>
            <div className="mt-3 space-y-2">
              {attachments.filter((a) => a.category === 'return_label').map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-[var(--brass)]/40 bg-white/40 px-4 py-2.5 hover:border-[var(--brass)] transition-colors"
                >
                  <span className="text-sm text-[var(--ink)]">{a.file_name || 'Return label'}</span>
                  <span className="font-mono text-xs text-[var(--brass)]">
                    Uploaded {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 6. Additional fees */}
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
            Additional fees <span className="normal-case">(Secretary of State, embassy, etc.)</span>
          </p>
          <p className="mt-1 text-xs text-[var(--slate)]">
            These are separate from your handling fee — the client is emailed and can pay them from their portal.
          </p>

          {fees.length > 0 && (
            <div className="mt-4 space-y-2">
              {fees.map((fee) =>
                editingFeeId === fee.id ? (
                  <div key={fee.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--wax)] p-3">
                    <input
                      value={editFeeDesc}
                      onChange={(e) => setEditFeeDesc(e.target.value)}
                      className="flex-1 rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2 text-sm outline-none focus:border-[var(--wax)]"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={editFeeAmount}
                      onChange={(e) => setEditFeeAmount(e.target.value)}
                      className="w-24 rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2 text-sm outline-none focus:border-[var(--wax)]"
                    />
                    <button
                      onClick={() => saveEditFee(fee.id)}
                      className="rounded-full bg-[var(--ink)] px-3 py-2 text-xs font-medium text-[var(--parchment)] hover:bg-[var(--wax)]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingFeeId(null)}
                      className="rounded-full border border-[var(--line)] px-3 py-2 text-xs text-[var(--ink)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div key={fee.id} className="flex items-center justify-between rounded-lg border border-[var(--line)] px-4 py-2.5">
                    <div>
                      <span className="text-sm text-[var(--ink)]">{fee.description}</span>
                      <span className="ml-2 font-mono text-sm text-[var(--brass)]">${(fee.amount_cents / 100).toFixed(2)}</span>
                      <span className={`ml-2 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${fee.paid ? 'bg-[var(--wax)]/15 text-[var(--wax)]' : 'bg-[var(--line)] text-[var(--slate)]'}`}>
                        {fee.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                    {!fee.paid && (
                      <div className="flex gap-2">
                        <button onClick={() => startEditFee(fee)} className="text-xs text-[var(--ink)] hover:text-[var(--wax)]">Edit</button>
                        <button onClick={() => deleteFee(fee.id)} className="text-xs text-[var(--wax)] hover:underline">Remove</button>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {shippingDefaults.length > 0 && (() => {
            const addedLabels = fees.map((f) => f.description)
            const nextShipping = shippingDefaults.find((s) => !addedLabels.includes(s.label))

            if (!nextShipping) {
              return (
                <p className="mt-4 text-xs text-[var(--brass)]">
                  ✓ All shipping fees for this order have been added.
                </p>
              )
            }

            return (
              <div className="mt-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">
                  Quick add: shipping{' '}
                  <span className="normal-case text-[var(--slate)]">
                    ({shippingDefaults.indexOf(nextShipping) + 1} of {shippingDefaults.length})
                  </span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewFeeDesc(nextShipping.label)
                      setNewFeeAmount(nextShipping.fee_cents > 0 ? (nextShipping.fee_cents / 100).toFixed(2) : '')
                    }}
                    className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
                  >
                    {nextShipping.label}
                    {nextShipping.fee_cents > 0 && ` — $${(nextShipping.fee_cents / 100).toFixed(2)}`}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-[var(--slate)]">
                  Fills in the fields below — adjust the amount if this shipment costs differently, then click Add fee.
                  The next shipping fee will appear here once this one's added.
                </p>
              </div>
            )
          })()}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              placeholder="e.g. Texas Secretary of State fee"
              value={newFeeDesc}
              onChange={(e) => setNewFeeDesc(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Amount ($)"
              value={newFeeAmount}
              onChange={(e) => setNewFeeAmount(e.target.value)}
              className="w-32 rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2.5 text-sm outline-none focus:border-[var(--wax)]"
            />
            <button
              onClick={addFee}
              disabled={addingFee || !newFeeDesc.trim() || !newFeeAmount}
              className="rounded-full bg-[var(--wax)] px-5 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors disabled:opacity-50"
            >
              {addingFee ? 'Adding…' : 'Add fee'}
            </button>
          </div>
        </div>

        {/* Update status */}
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
          {order.payment_status === 'paid' ? (
            <p className="mt-3 text-xs text-[var(--brass)]">✓ Paid at submission — ${(order.amount_cents / 100).toFixed(2)}.</p>
          ) : (
            <p className="mt-3 text-xs text-[var(--wax)]">Payment pending from client.</p>
          )}
        </div>

        {/* 7. Upload completed document */}
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Completed document</p>

          {attachments.filter((a) => a.category === 'completed_document').length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.filter((a) => a.category === 'completed_document').map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--wax)]/40 bg-[var(--wax)]/5 px-4 py-2.5"
                >
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-[var(--ink)] hover:text-[var(--wax)]">
                    {a.file_name || 'Completed document'}
                  </a>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-[var(--slate)]">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => deleteCompletedDocument(a)}
                      disabled={deletingAttachmentId === a.id}
                      className="font-mono text-xs uppercase tracking-wide text-[var(--wax)] hover:underline disabled:opacity-50"
                    >
                      {deletingAttachmentId === a.id ? 'Removing…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(() => {
            const hasUnpaidFees = fees.some((f) => !f.paid)
            if (!isProcessingComplete(order)) {
              return (
                <p className="mt-3 text-xs text-[var(--slate)]">
                  Finish every step in Processing above to unlock uploading the completed document.
                </p>
              )
            }
            if (hasUnpaidFees) {
              return (
                <div className="mt-3">
                  <p className="text-xs text-[var(--wax)]">
                    This order has unpaid additional fees. The client must pay them before the completed
                    document can be delivered — see Additional fees below.
                  </p>
                  <button
                    onClick={emailUnpaidFees}
                    disabled={sendingUnpaidFeesEmail}
                    className="mt-3 rounded-full bg-[var(--wax)] px-5 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors disabled:opacity-50"
                  >
                    {sendingUnpaidFeesEmail ? 'Sending…' : 'Email client to pay before delivery'}
                  </button>
                  {unpaidFeesEmailResult && (
                    <p className={`mt-3 text-sm ${unpaidFeesEmailResult.ok ? 'text-[var(--brass)]' : 'text-[var(--wax)]'}`}>
                      {unpaidFeesEmailResult.message}
                    </p>
                  )}
                </div>
              )
            }
            return (
              <div className="mt-4">
                <p className="text-xs text-[var(--slate)]">
                  Uploads the finished, certified document and emails the client a link to view and download it.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    onChange={(e) => setCompletedFile(e.target.files?.[0] ?? null)}
                    className="text-sm text-[var(--ink)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--parchment-dim)] file:px-4 file:py-2 file:text-xs file:font-medium file:text-[var(--ink)] hover:file:bg-[var(--line)]"
                  />
                  <button
                    onClick={uploadCompletedDocument}
                    disabled={!completedFile || uploadingCompletedFile}
                    className="rounded-full bg-[var(--wax)] px-5 py-2 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors disabled:opacity-50"
                  >
                    {uploadingCompletedFile ? 'Uploading…' : 'Upload & notify client'}
                  </button>
                </div>
                {completedUploadResult && (
                  <p className={`mt-3 text-sm ${completedUploadResult.ok ? 'text-[var(--brass)]' : 'text-[var(--wax)]'}`}>
                    {completedUploadResult.message}
                  </p>
                )}
              </div>
            )
          })()}
        </div>

        {/* 8. Preliminary invoice */}
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Preliminary invoice</p>
          <p className="mt-1 text-xs text-[var(--slate)]">
            An itemized breakdown of this order's cost, based on the handling fee, any surcharges, and fees added so far.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowInvoice((v) => !v)}
              className="rounded-full border border-[var(--ink)]/25 px-5 py-2.5 text-sm font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
            >
              {showInvoice ? 'Hide invoice' : 'View preliminary invoice'}
            </button>
            <button
              onClick={emailInvoice}
              disabled={sendingInvoice}
              className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-50"
            >
              {sendingInvoice ? 'Sending…' : 'Email preliminary invoice to client'}
            </button>
          </div>
          {invoiceSentResult && (
            <p className={`mt-3 text-sm ${invoiceSentResult.ok ? 'text-[var(--brass)]' : 'text-[var(--wax)]'}`}>
              {invoiceSentResult.message}
            </p>
          )}

          {showInvoice && (() => {
            const { items, total } = invoiceBreakdown()
            return (
              <div className="mt-4 rounded-lg border border-[var(--line)] bg-white/70 p-4">
                <div className="space-y-1.5">
                  {items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-[var(--ink)]/85">
                      <span>{item.label}</span>
                      <span>${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t border-[var(--line)] pt-3">
                  <span className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Total</span>
                  <span className="font-display text-lg font-semibold text-[var(--ink)]">${total.toFixed(2)}</span>
                </div>
              </div>
            )
          })()}
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
