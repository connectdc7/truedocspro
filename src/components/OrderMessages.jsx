import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function OrderMessages({ orderId, sender, title = 'Messages' }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    let active = true

    async function load() {
      const { data } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
      if (active) {
        setMessages(data || [])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`order-messages-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` },
        (payload) => {
          if (active) setMessages((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [orderId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    if (!draft.trim()) return
    setSending(true)
    setError('')
    const { error: insertError } = await supabase.from('order_messages').insert({
      order_id: orderId,
      sender,
      message: draft.trim(),
    })
    if (insertError) {
      setSending(false)
      setError(insertError.message)
      return
    }
    const sentMessage = draft.trim()
    setDraft('')
    setSending(false)
    supabase.functions.invoke('notify-new-message', {
      body: { order_id: orderId, sender, message: sentMessage },
    })
  }

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">{title}</p>

      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-[var(--line)] bg-white/50 p-3">
        {loading && <p className="text-sm text-[var(--slate)]">Loading…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-[var(--slate)]">No messages yet — ask a question below.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.sender === sender
                ? 'ml-auto bg-[var(--ink)] text-[var(--parchment)]'
                : 'bg-[var(--parchment-dim)] text-[var(--ink)]'
            }`}
          >
            <p className="whitespace-pre-wrap">{m.message}</p>
            <p
              className={`mt-1 font-mono text-[10px] uppercase tracking-wide ${
                m.sender === sender ? 'text-[var(--parchment)]/60' : 'text-[var(--slate)]'
              }`}
            >
              {m.sender === 'staff' ? 'Staff' : 'Client'} · {new Date(m.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2 text-sm outline-none focus:border-[var(--wax)]"
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="rounded-full bg-[var(--wax)] px-5 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax-dark)] transition-colors disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-[var(--wax)]">{error}</p>}
    </div>
  )
}
