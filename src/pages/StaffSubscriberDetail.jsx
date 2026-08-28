import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'

export default function StaffSubscriberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [subscriber, setSubscriber] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase
      .from('subscribers')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setSubscriber(data)
        setLoading(false)
      })
  }, [id])

  const daysSubscribed = subscriber
    ? Math.round(
        (new Date(new Date().toDateString()) - new Date(new Date(subscriber.created_at).toDateString())) /
          (1000 * 60 * 60 * 24)
      )
    : null

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${subscriber.email} from the subscriber list?`)) return
    setDeleting(true)
    const { error } = await supabase.from('subscribers').delete().eq('id', id)
    if (!error) {
      // Best-effort — don't block navigating away on this
      supabase.functions.invoke('notify-unsubscribed', { body: { email: subscriber.email } })
    }
    setDeleting(false)
    if (error) setError(error.message)
    else navigate('/staff/blog')
  }

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-6 py-20 text-center font-mono text-sm text-[var(--slate)]">Loading…</div>
      </Layout>
    )
  }

  if (error || !subscriber) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <p className="font-display text-xl text-[var(--ink)]">Subscriber not found.</p>
          <Link to="/staff/blog" className="mt-4 inline-block text-sm text-[var(--wax)] hover:underline">
            ← Back to blog
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <section className="mx-auto max-w-xl px-6 py-16">
        <Link to="/staff/blog" className="font-mono text-xs uppercase tracking-widest text-[var(--slate)] hover:text-[var(--wax)]">
          ← Blog
        </Link>

        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white/40 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Email</p>
          <p className="mt-1 font-display text-xl text-[var(--ink)]">{subscriber.email}</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Subscribed on</p>
              <p className="mt-1 text-sm text-[var(--ink)]">
                {new Date(subscriber.created_at).toLocaleString(undefined, {
                  year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">Time subscribed</p>
              <p className="mt-1 text-sm text-[var(--ink)]">
                {daysSubscribed === 0 ? 'Today' : daysSubscribed === 1 ? 'Yesterday' : `${daysSubscribed} days`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            disabled={deleting}
            className="mt-8 rounded-full border border-[var(--wax)]/40 px-4 py-2 font-mono text-xs uppercase tracking-wide text-[var(--wax)] hover:bg-[var(--wax)]/10 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Removing…' : 'Remove from subscribers'}
          </button>
        </div>
      </section>
    </Layout>
  )
}
