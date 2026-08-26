import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import CountrySelect from '../components/CountrySelect'
import { useAuth } from '../lib/AuthContext'
import { supabase, DOCUMENTS_BUCKET } from '../lib/supabaseClient'
import { HAGUE_COUNTRIES, US_STATES } from '../lib/countries'
import LegalizationPath from '../components/LegalizationPath'

const SERVICES = [
  { value: 'notary', label: 'Notary', price: 25, expedite: 15, standardTurnaround: '2–3 business days', expeditedTurnaround: 'At least 1 business day' },
  { value: 'apostille', label: 'Apostille', price: 85, expedite: 40, standardTurnaround: '3–7 business days', expeditedTurnaround: '1–2 business days' },
  { value: 'embassy', label: 'Embassy legalization', price: 150, expedite: 75, standardTurnaround: '4–6 weeks', expeditedTurnaround: '2–4 weeks' },
]

// TODO: replace with your real mailing address before going live.
const MAILING_ADDRESS = 'True Doc Pros\n[Street Address]\n[City, State ZIP]'

export default function NewOrder() {
  const { user } = useAuth()
  const [contactName, setContactName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [destinationCountry, setDestinationCountry] = useState('')
  const [neededByDate, setNeededByDate] = useState('')
  const [service, setService] = useState('notary')
  const [expedited, setExpedited] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [documents, setDocuments] = useState([{ name: '', file: null, mailIn: false, documentType: 'personal' }])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isHagueCountry = HAGUE_COUNTRIES.includes(destinationCountry)
  const [embassyFees, setEmbassyFees] = useState({ personal: null, business: null })
  const [originState, setOriginState] = useState('')
  const [sosFeeCents, setSosFeeCents] = useState(0)

  useEffect(() => {
    if (!originState) {
      setSosFeeCents(0)
      return
    }
    supabase
      .from('sos_fees')
      .select('fee_cents')
      .eq('state', originState)
      .maybeSingle()
      .then(({ data }) => setSosFeeCents(data?.fee_cents || 0))
  }, [originState])

  useEffect(() => {
    if (!destinationCountry) return
    setService(isHagueCountry ? 'apostille' : 'embassy')
  }, [destinationCountry, isHagueCountry])

  useEffect(() => {
    if (!destinationCountry || isHagueCountry) {
      setEmbassyFees({ personal: null, business: null })
      return
    }
    supabase
      .from('embassy_fees')
      .select('document_type, fee_cents')
      .eq('country', destinationCountry)
      .then(({ data }) => {
        const next = { personal: null, business: null }
        ;(data ?? []).forEach((f) => {
          if (f.fee_cents > 0) next[f.document_type] = f.fee_cents
        })
        setEmbassyFees(next)
      })
  }, [destinationCountry, isHagueCountry])

  const selected = SERVICES.find((s) => s.value === service)
  const baseTotal = useMemo(
    () => (selected.price + (expedited ? selected.expedite : 0)) * quantity,
    [selected, expedited, quantity]
  )
  const embassyFeeTotal = useMemo(() => {
    if (isHagueCountry) return 0
    return documents.reduce((sum, doc) => {
      const feeCents = embassyFees[doc.documentType]
      return sum + (feeCents ? feeCents / 100 : 0)
    }, 0)
  }, [documents, embassyFees, isHagueCountry])
  const sosFeeTotal = useMemo(() => {
    if (!originState || !sosFeeCents) return 0
    return (sosFeeCents / 100) * quantity
  }, [originState, sosFeeCents, quantity])
  const total = baseTotal + embassyFeeTotal + sosFeeTotal

  const setQty = (n) => {
    const clamped = Math.max(1, Math.min(10, n))
    setQuantity(clamped)
    setDocuments((prev) => {
      const next = [...prev]
      while (next.length < clamped) next.push({ name: '', file: null, mailIn: false, documentType: 'personal' })
      return next.slice(0, clamped)
    })
  }

  const updateDoc = (index, patch) => {
    setDocuments((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (documents.some((d) => !d.mailIn && !d.file)) {
      setError('Please attach a file for each document, or check "I\'ll mail this in" instead.')
      return
    }
    if (documents.some((d) => d.mailIn && !d.name.trim())) {
      setError('Please name each document you plan to mail in.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const orderIds = []
      for (const doc of documents) {
        let path = null
        if (!doc.mailIn) {
          const ext = doc.file.name.split('.').pop()
          path = `${user.id}/${crypto.randomUUID()}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from(DOCUMENTS_BUCKET)
            .upload(path, doc.file, { upsert: false })
          if (uploadError) throw uploadError
        }

        const embassyFeeForDoc = !isHagueCountry && embassyFees[doc.documentType] ? embassyFees[doc.documentType] : 0

        const { data: newOrder, error: insertError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            service,
            is_expedited: expedited,
            document_name: doc.name || doc.file?.name,
            document_type: doc.documentType,
            embassy_fee_cents: embassyFeeForDoc,
            notes,
            file_path: path,
            mail_in: doc.mailIn,
            status: 'received',
            contact_name: contactName,
            company_name: companyName || null,
            contact_phone: contactPhone,
            destination_country: destinationCountry,
            needed_by_date: neededByDate || null,
            origin_state: originState || null,
            sos_fee_cents: sosFeeCents,
          })
          .select()
          .single()
        if (insertError) throw insertError
        orderIds.push(newOrder.id)
      }

      // Kick off payment — ask our Edge Function for a Stripe Checkout link
      // covering all documents submitted in this batch
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        'create-checkout-session',
        { body: { order_ids: orderIds } }
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
          <div className="rounded-xl border border-[var(--line)] bg-[var(--parchment-dim)] p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Your details</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="contactName">
                  Contact name
                </label>
                <input
                  id="contactName"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="companyName">
                  Company name <span className="normal-case text-[var(--slate)]">(if applicable)</span>
                </label>
                <input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="contactPhone">
                  Contact number
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="destinationCountry">
                  Country of use
                </label>
                <CountrySelect
                  id="destinationCountry"
                  value={destinationCountry}
                  onChange={setDestinationCountry}
                />
                {destinationCountry && isHagueCountry && (
                  <p className="mt-2 rounded-lg bg-[var(--brass)]/10 px-3 py-2 text-xs text-[var(--brass)]">
                    This is a Hague Convention country — you'll need an apostille, not embassy legalization.
                    Secretary of State fees vary by state and will be added to your order after we determine
                    the exact amount.
                  </p>
                )}
                {destinationCountry && !isHagueCountry && (embassyFees.personal || embassyFees.business) && (
                  <p className="mt-2 rounded-lg bg-[var(--wax)]/10 px-3 py-2 text-xs text-[var(--wax)]">
                    Embassy legalization fee for {destinationCountry}:{' '}
                    {embassyFees.personal && `Personal $${(embassyFees.personal / 100).toFixed(2)}`}
                    {embassyFees.personal && embassyFees.business && ' · '}
                    {embassyFees.business && `Business $${(embassyFees.business / 100).toFixed(2)}`}
                    {' '}— added to your total below based on each document's type.
                  </p>
                )}
                {destinationCountry && !isHagueCountry && !embassyFees.personal && !embassyFees.business && (
                  <p className="mt-2 rounded-lg bg-[var(--parchment-dim)] px-3 py-2 text-xs text-[var(--slate)]">
                    This is not a Hague Convention country — embassy legalization is required. We'll follow up
                    with the exact embassy fee for {destinationCountry} after you submit.
                  </p>
                )}
              </div>

              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="originState">
                  State where document originates
                </label>
                <select
                  id="originState"
                  value={originState}
                  onChange={(e) => setOriginState(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
                >
                  <option value="">Select a state…</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {originState && (
                  <p className="mt-1.5 text-xs text-[var(--slate)]">
                    {sosFeeCents > 0
                      ? `Secretary of State fee: $${(sosFeeCents / 100).toFixed(2)} per document`
                      : `We'll confirm the exact Secretary of State fee for ${originState} after you submit.`}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="neededByDate">
                  Requested completion date
                </label>
                <input
                  id="neededByDate"
                  type="date"
                  required
                  value={neededByDate}
                  onChange={(e) => setNeededByDate(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
                />
              </div>
            </div>

            {destinationCountry && (
              <div className="mt-4">
                <LegalizationPath isHague={isHagueCountry} country={destinationCountry} />
              </div>
            )}
          </div>

          <div>
            <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Service</label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
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
            <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Number of documents</label>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty(quantity - 1)}
                className="h-9 w-9 rounded-full border border-[var(--line)] text-[var(--ink)] hover:border-[var(--wax)]"
              >
                −
              </button>
              <span className="font-display w-8 text-center text-lg text-[var(--ink)]">{quantity}</span>
              <button
                type="button"
                onClick={() => setQty(quantity + 1)}
                className="h-9 w-9 rounded-full border border-[var(--line)] text-[var(--ink)] hover:border-[var(--wax)]"
              >
                +
              </button>
              <span className="text-xs text-[var(--slate)]">
                {quantity === 1 ? 'One document' : `${quantity} documents, same service`}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {documents.map((doc, i) => (
              <div key={i} className="rounded-xl border border-[var(--line)] p-4">
                <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
                  Document {i + 1} of {quantity}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
                      Document name
                    </label>
                    <input
                      placeholder="e.g. Birth certificate"
                      value={doc.name}
                      onChange={(e) => updateDoc(i, { name: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
                    />
                  </div>
                  {!doc.mailIn && (
                    <div>
                      <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
                        Upload file
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        required={!doc.mailIn}
                        onChange={(e) => updateDoc(i, { file: e.target.files?.[0] ?? null })}
                        className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-3 py-2.5 text-xs outline-none file:mr-3 file:rounded-full file:border-0 file:bg-[var(--ink)] file:px-3 file:py-1.5 file:text-[var(--parchment)] file:text-xs"
                      />
                    </div>
                  )}
                </div>

                {!isHagueCountry && destinationCountry && (
                  <div className="mt-3">
                    <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Document type</label>
                    <div className="mt-2 flex gap-2">
                      {['personal', 'business'].map((t) => (
                        <button
                          type="button"
                          key={t}
                          onClick={() => updateDoc(i, { documentType: t })}
                          className={`rounded-lg border px-3 py-2 text-xs capitalize transition-colors ${
                            doc.documentType === t
                              ? 'border-[var(--wax)] bg-[var(--wax)]/10 text-[var(--wax)]'
                              : 'border-[var(--line)] text-[var(--ink)] hover:border-[var(--wax)]'
                          }`}
                        >
                          {t}
                          {embassyFees[t] ? ` — $${(embassyFees[t] / 100).toFixed(2)}` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="mt-3 flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={doc.mailIn}
                    onChange={(e) => updateDoc(i, { mailIn: e.target.checked, file: e.target.checked ? null : doc.file })}
                    className="mt-0.5 h-4 w-4 accent-[var(--brass)]"
                  />
                  <span className="text-xs text-[var(--ink)]">
                    I'll mail in the physical document instead of uploading it
                  </span>
                </label>

                {doc.mailIn && (
                  <div className="mt-3 rounded-lg border border-[var(--brass)]/40 bg-[var(--brass)]/10 p-4">
                    <p className="font-mono text-xs uppercase tracking-widest text-[var(--brass)]">Mail your document to</p>
                    <p className="mt-2 whitespace-pre-line text-sm text-[var(--ink)]">{MAILING_ADDRESS}</p>
                    <p className="mt-2 text-xs text-[var(--slate)]">
                      Include your name and this order's document name on the outside of the envelope.
                      We'll start processing once it arrives.
                    </p>
                  </div>
                )}
              </div>
            ))}
            <p className="text-xs text-[var(--slate)]">PDF, JPG, or PNG for each document.</p>
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

          <div className="rounded-lg border border-[var(--line)] p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
              Preliminary invoice {quantity > 1 && `(${quantity} documents)`}
            </p>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-[var(--ink)]/85">
                <span>{selected.label} handling fee{quantity > 1 ? ` × ${quantity}` : ''}</span>
                <span>${(selected.price * quantity).toFixed(2)}</span>
              </div>
              {expedited && (
                <div className="flex justify-between text-[var(--ink)]/85">
                  <span>Expedited processing{quantity > 1 ? ` × ${quantity}` : ''}</span>
                  <span>${(selected.expedite * quantity).toFixed(2)}</span>
                </div>
              )}
              {sosFeeTotal > 0 && (
                <div className="flex justify-between text-[var(--ink)]/85">
                  <span>Secretary of State fee ({originState}){quantity > 1 ? ` × ${quantity}` : ''}</span>
                  <span>${sosFeeTotal.toFixed(2)}</span>
                </div>
              )}
              {embassyFeeTotal > 0 && (
                <div className="flex justify-between text-[var(--ink)]/85">
                  <span>Embassy legalization fee ({destinationCountry})</span>
                  <span>${embassyFeeTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3">
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Total due now</span>
              <span className="font-display text-lg font-semibold text-[var(--ink)]">${total.toFixed(2)}</span>
            </div>
            {!isHagueCountry && !embassyFeeTotal && destinationCountry && (
              <p className="mt-2 text-xs text-[var(--slate)]">
                Embassy fee for {destinationCountry} not yet set — we'll follow up with the exact amount.
              </p>
            )}
            {originState && !sosFeeTotal && (
              <p className="mt-2 text-xs text-[var(--slate)]">
                Secretary of State fee for {originState} not yet set — we'll follow up with the exact amount.
              </p>
            )}
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
