import { useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase, DOCUMENTS_BUCKET } from '../lib/supabaseClient'

const SERVICES = [
  { value: 'notary', label: 'Notary', price: 25, expedite: 15, standardTurnaround: 'Same day', expeditedTurnaround: 'Within 2 hours' },
  { value: 'apostille', label: 'Apostille', price: 85, expedite: 40, standardTurnaround: '3–7 business days', expeditedTurnaround: '1–2 business days' },
  { value: 'embassy', label: 'Embassy legalization', price: 150, expedite: 75, standardTurnaround: '2–4 weeks', expeditedTurnaround: '5–7 business days' },
]

export default function NewOrder() {
  const { user } = useAuth()
  const [service, setService] = useState('notary')
  const [expedited, setExpedited] = useState(false)
  const [documentName, setDocumentName] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selected = SERVICES.find((s) => s.value === service)
  const total = useMemo(
    () => selected.price + (expedited ? selected.expedite : 0),
    [selected, expedited]
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please attach a scan or photo of your document.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(path, file, { upsert: false })
      if (uploadError) throw uploadError

      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          service,
          is_expedited: expedited,
          document_name: documentName || file.name,
          notes,
          file_path: path,
          status: 'received',
        })
        .select()
        .single()
      if (insertError) throw insertError

      // Kick off payment — ask our Edge Function for a Stripe Checkout link
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        'create-checkout-session',
        { body: { order_id: newOrder.id } }
      )
      if (sessionError) throw sessionError
      if (!sessionData?.url) throw new Error('Could not start checkout — please try again.')

      window.location.href = sessionData.url
      return
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <section className="mx-auto max-w-xl px-6 py-16">
        <h1 className="font-display text-3xl font-semibold text-[var(--ink)]">Submit a document</h1>
        <p className="mt-2 text-sm text-[var(--slate)]">
          Files are uploaded to your private, secure storage — only you and our team can access them.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Service</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {SERVICES.map((s) => (
                <button
                  type="button"
                  key={s.value}
                  onClick={() => setService(s.value)}
                  className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    service === s.value
                      ? 'border-[var(--wax)] bg-[var(--wax)]/10 text-[var(--wax)]'
                      : 'border-[var(--line)] text-[var(--ink)] hover:border-[var(--wax)]'
                  }`}
                >
                  {s.label}
                  <span className="block font-mono text-xs opacity-70">${s.price}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 transition-colors ${
              expedited ? 'border-[var(--brass)] bg-[var(--brass)]/10' : 'border-[var(--line)]'
            }`}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={expedited}
                onChange={(e) => setExpedited(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--brass)]"
              />
              <span>
                <span className="block text-sm font-medium text-[var(--ink)]">
                  Expedited processing — +${selected.expedite}
                </span>
                <span className="mt-1 block text-xs text-[var(--slate)]">
                  {expedited ? selected.expeditedTurnaround : selected.standardTurnaround} turnaround
                  {expedited ? '' : ` — or ${selected.expeditedTurnaround} if expedited`}
                </span>
              </span>
            </label>
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="documentName">
              Document name
            </label>
            <input
              id="documentName"
              placeholder="e.g. Birth certificate"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
            />
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="file">
              Upload file
            </label>
            <input
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none file:mr-4 file:rounded-full file:border-0 file:bg-[var(--ink)] file:px-4 file:py-2 file:text-[var(--parchment)] file:text-xs"
            />
            <p className="mt-1.5 text-xs text-[var(--slate)]">PDF, JPG, or PNG.</p>
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="notes">
              Notes for our team (optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Destination country, deadline, special instructions"
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
            />
          </div>

          {error && <p className="text-sm text-[var(--wax)]">{error}</p>}

          <div className="flex items-center justify-between rounded-lg border border-[var(--line)] px-4 py-3">
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Total due at checkout</span>
            <span className="font-display text-lg font-semibold text-[var(--ink)]">${total}</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[var(--wax)] px-6 py-3.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors disabled:opacity-60"
          >
            {submitting ? 'Uploading…' : 'Continue to payment'}
          </button>
        </form>
      </section>
    </Layout>
  )
}
