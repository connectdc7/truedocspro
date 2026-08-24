import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const SERVICE_STEPS = {
  notary: ['notary'],
  apostille: ['notary', 'sos'],
  embassy: ['notary', 'sos', 'embassy'],
}

const STEP_LABELS = {
  notary: 'Notary',
  sos: 'Secretary of State',
  embassy: 'Embassy Legalization',
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// Exported so StaffOrderDetail can gate the "upload completed document"
// section on whether every required step for this order is done.
export function isProcessingComplete(order) {
  const steps = SERVICE_STEPS[order.service] || SERVICE_STEPS.notary
  return steps.every((key) => Boolean(order[`${key}_complete_date`]))
}

export default function ProcessingQueue({ order, onUpdate }) {
  const steps = SERVICE_STEPS[order.service] || SERVICE_STEPS.notary
  const [savingKey, setSavingKey] = useState(null)
  const [editingKey, setEditingKey] = useState(null)

  const isComplete = (key) => Boolean(order[`${key}_complete_date`])

  let activeIndex = steps.findIndex((k) => !isComplete(k))
  if (activeIndex === -1) activeIndex = steps.length
  const allComplete = activeIndex >= steps.length

  const saveFields = async (key, fields) => {
    setSavingKey(key)
    const { error } = await supabase.from('orders').update(fields).eq('id', order.id)
    setSavingKey(null)
    if (!error) onUpdate(fields)
  }

  const markComplete = (key) => {
    const today = todayStr()
    saveFields(key, {
      [`${key}_start_date`]: order[`${key}_start_date`] || today,
      [`${key}_complete_date`]: today,
    })
  }

  const markIncomplete = (key) => {
    saveFields(key, { [`${key}_complete_date`]: null })
    setEditingKey(key)
  }

  const updateDateField = (key, field, value) => {
    saveFields(key, { [`${key}_${field}_date`]: value || null })
  }

  const handleArrivedNotarized = async (checked) => {
    const fields = { arrived_notarized: checked }
    if (checked && !isComplete('notary')) {
      const today = todayStr()
      fields.notary_start_date = order.notary_start_date || today
      fields.notary_complete_date = today
    }
    setSavingKey('notary')
    const { error } = await supabase.from('orders').update(fields).eq('id', order.id)
    setSavingKey(null)
    if (!error) onUpdate(fields)
  }

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
        Processing <span className="normal-case text-[var(--slate)]">(staff only — clients don't see this)</span>
      </p>
      <p className="mt-2 text-xs text-[var(--slate)]">
        Steps for this order's service ({order.service === 'notary' ? 'Notary only' : order.service === 'apostille' ? 'Apostille' : 'Embassy legalization'})
        reveal one at a time as each is completed.
      </p>

      <label className="mt-4 flex items-center gap-2 text-sm text-[var(--ink)]">
        <input
          type="checkbox"
          checked={Boolean(order.arrived_notarized)}
          onChange={(e) => handleArrivedNotarized(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--line)] accent-[var(--wax)]"
        />
        Document arrived already notarized (no notary fee needed)
      </label>
      {order.arrived_notarized && (
        <p className="mt-1 text-xs text-[var(--slate)]">
          <span className="line-through decoration-[var(--wax)]">Notary fee</span>{' '}
          <span className="text-[var(--brass)]">— waived, arrived pre-notarized</span>
        </p>
      )}

      <div className="mt-4 space-y-3">
        {steps.map((key, i) => {
          if (i > activeIndex) return null // not yet reached — stays hidden

          const complete = isComplete(key)
          const isBeingEdited = complete && editingKey === key

          if (complete && !isBeingEdited) {
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--parchment-dim)] px-4 py-3"
              >
                <span className="text-sm text-[var(--ink)]">
                  <span className="text-[var(--brass)]">✓</span> {STEP_LABELS[key]} — completed{' '}
                  {new Date(order[`${key}_complete_date`]).toLocaleDateString()}
                </span>
                <button
                  onClick={() => setEditingKey(key)}
                  className="font-mono text-xs uppercase tracking-wide text-[var(--slate)] hover:text-[var(--wax)]"
                >
                  Edit
                </button>
              </div>
            )
          }

          const start = order[`${key}_start_date`] || ''
          const completeDate = order[`${key}_complete_date`] || ''

          return (
            <div key={key} className="rounded-lg border border-[var(--wax)]/40 bg-white/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--ink)]">{STEP_LABELS[key]}</p>
                {key === 'sos' && order.origin_state && (
                  <span className="font-mono text-xs text-[var(--slate)]">{order.origin_state}</span>
                )}
                {key === 'embassy' && order.destination_country && (
                  <span className="font-mono text-xs text-[var(--slate)]">{order.destination_country}</span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">Start date</label>
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => updateDateField(key, 'start', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[var(--wax)]"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">Complete date</label>
                  <input
                    type="date"
                    value={completeDate}
                    onChange={(e) => updateDateField(key, 'complete', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[var(--wax)]"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={complete}
                    onChange={(e) => (e.target.checked ? markComplete(key) : markIncomplete(key))}
                    className="h-4 w-4 rounded border-[var(--line)] accent-[var(--wax)]"
                  />
                  Mark {STEP_LABELS[key]} complete
                </label>
                {savingKey === key && <span className="font-mono text-xs text-[var(--slate)]">Saving…</span>}
                {isBeingEdited && (
                  <button
                    onClick={() => setEditingKey(null)}
                    className="ml-auto font-mono text-xs uppercase tracking-wide text-[var(--wax)] hover:underline"
                  >
                    Done editing
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {allComplete && (
        <p className="mt-4 rounded-lg bg-[var(--brass)]/10 px-4 py-3 text-sm text-[var(--brass)]">
          All processing steps are complete — upload the finished document below to notify the client.
        </p>
      )}
    </div>
  )
}
