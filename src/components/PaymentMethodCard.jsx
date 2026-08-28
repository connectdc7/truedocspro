import { useEffect, useRef, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { supabase } from '../lib/supabaseClient'

let stripePromise = null
function getStripe() {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    stripePromise = key ? loadStripe(key) : Promise.resolve(null)
  }
  return stripePromise
}

export default function PaymentMethodCard({ profile, onSaved }) {
  const cardElementRef = useRef(null)
  const cardElementMounted = useRef(null)
  const stripeRef = useRef(null)
  const elementsRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [editing, setEditing] = useState(false)

  const now = new Date()
  const hasCard = Boolean(profile?.card_last4)
  const isExpired =
    hasCard &&
    (profile.card_exp_year < now.getFullYear() ||
      (profile.card_exp_year === now.getFullYear() && profile.card_exp_month < now.getMonth() + 1))

  useEffect(() => {
    if (!editing) return
    let cancelled = false

    async function setup() {
      const stripe = await getStripe()
      if (!stripe || cancelled) return
      stripeRef.current = stripe

      const { data, error: fnError } = await supabase.functions.invoke('create-setup-intent', {})
      if (fnError || data?.error || cancelled) {
        setError(data?.error || fnError?.message || 'Could not start card setup.')
        return
      }

      const elements = stripe.elements()
      elementsRef.current = elements
      const cardElement = elements.create('card', {
        style: { base: { fontSize: '15px', color: '#0F1B33', '::placeholder': { color: '#8A8F98' } } },
      })
      cardElement.mount(cardElementRef.current)
      cardElementMounted.current = { cardElement, clientSecret: data.client_secret }
      setReady(true)
    }
    setup()

    return () => {
      cancelled = true
      if (cardElementMounted.current) {
        cardElementMounted.current.cardElement.unmount()
        cardElementMounted.current = null
      }
      setReady(false)
    }
  }, [editing])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!cardElementMounted.current || !stripeRef.current) return
    setSaving(true)
    setError('')
    const { cardElement, clientSecret } = cardElementMounted.current

    const { error: stripeError, setupIntent } = await stripeRef.current.confirmCardSetup(clientSecret, {
      payment_method: { card: cardElement },
    })

    if (stripeError) {
      setSaving(false)
      setError(stripeError.message)
      return
    }

    const { data, error: saveError } = await supabase.functions.invoke('save-card-details', {
      body: { setup_intent_id: setupIntent.id },
    })
    setSaving(false)
    if (saveError || data?.error) {
      setError(data?.error || saveError.message)
      return
    }

    setSuccess(true)
    setEditing(false)
    onSaved?.()
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Payment method</p>
      <p className="mt-1 text-xs text-[var(--slate)]">
        We don't charge anything when you submit a document — a valid card on file is required, but you're only
        charged once we begin processing your order.
      </p>

      {hasCard && !editing && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3">
          <div>
            <p className="text-sm text-[var(--ink)]">
              {profile.card_brand?.toUpperCase()} •••• {profile.card_last4}
            </p>
            <p className={`text-xs ${isExpired ? 'text-[var(--wax)]' : 'text-[var(--slate)]'}`}>
              Expires {String(profile.card_exp_month).padStart(2, '0')}/{profile.card_exp_year}
              {isExpired && ' — expired'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-[var(--ink)]/25 px-4 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
          >
            Update card
          </button>
        </div>
      )}

      {!hasCard && !editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-4 rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors"
        >
          Add a payment method
        </button>
      )}

      {editing && (
        <form onSubmit={handleSave} className="mt-4">
          <div ref={cardElementRef} className="rounded-lg border border-[var(--line)] bg-white/80 px-4 py-3" />
          {error && <p className="mt-2 text-sm text-[var(--wax)]">{error}</p>}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={!ready || saving}
              className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save card'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm text-[var(--slate)] hover:text-[var(--wax)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {success && <p className="mt-3 font-mono text-xs text-[var(--brass)]">Card saved.</p>}
    </div>
  )
}
