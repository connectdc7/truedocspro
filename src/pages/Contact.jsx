import { useState } from 'react'
import Layout from '../components/Layout'
import useDocumentHead from '../lib/useDocumentHead'
import { supabase } from '../lib/supabaseClient'

export default function Contact() {
  useDocumentHead({
    title: 'Contact',
    description: 'Questions about notary, apostille, or embassy legalization? Reach True Doc Pros — we usually reply within one business day.',
    path: '/contact',
  })
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    const { error } = await supabase.from('contact_messages').insert({
      name: form.name,
      email: form.email,
      message: form.message,
    })
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('sent')
      setForm({ name: '', email: '', message: '' })
    }
  }

  return (
    <Layout>
      <section className="border-b border-[var(--line)] px-6 py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--wax)]">Contact</p>
        <h1 className="font-display mt-3 text-4xl font-semibold text-[var(--ink)]">Questions before you submit?</h1>
        <p className="mt-3 text-[var(--slate)]">We usually reply within one business day.</p>
      </section>

      <section className="mx-auto max-w-xl px-6 py-16">
        {status === 'sent' ? (
          <div className="rounded-2xl border border-[var(--line)] bg-white/50 p-8 text-center">
            <p className="font-display text-xl font-semibold text-[var(--ink)]">Message sent.</p>
            <p className="mt-2 text-sm text-[var(--slate)]">We'll get back to you at the email you provided.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Name" name="name" value={form.name} onChange={handleChange} required />
            <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                value={form.message}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--wax)]"
              />
            </div>
            {status === 'error' && (
              <p className="text-sm text-[var(--wax)]">Something went wrong: {errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-full bg-[var(--ink)] px-6 py-3.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}
      </section>
    </Layout>
  )
}

function Field({ label, name, type = 'text', value, onChange, required }) {
  return (
    <div>
      <label className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/60 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--wax)]"
      />
    </div>
  )
}
