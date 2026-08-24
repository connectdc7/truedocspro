import { useState } from 'react'

export default function ServiceFlipCard({ name, turnaround, definition, visual, frontVisual, checker }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      className={`flip-card h-[420px] cursor-pointer ${flipped ? 'flipped' : ''}`}
      onClick={() => setFlipped((f) => !f)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setFlipped((f) => !f)
        }
      }}
      aria-label={`${name} — tap to ${flipped ? 'see overview' : 'see definition'}`}
    >
      <div className="flip-card-inner">
        {/* Front */}
        <div className="flip-card-face rounded-2xl border border-[var(--line)] bg-white/40 p-7 flex flex-col">
          <h3 className="font-display text-xl font-semibold text-[var(--ink)]">{name}</h3>
          <p className="mt-3 font-mono text-xs uppercase tracking-widest text-[var(--brass)]">
            Turnaround: {turnaround}
          </p>
          {frontVisual && (
            <div className="mt-4 flex-1 min-h-0 rounded-xl border border-[var(--line)] bg-white/70 p-3 flex items-center justify-center">
              <div className="w-[150px] h-[150px] shrink-0">{frontVisual}</div>
            </div>
          )}
          <div className="mt-4 flex items-center gap-1.5 font-mono text-xs text-[var(--wax)]">
            Tap to see what it means
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Back */}
        <div className="flip-card-face flip-card-back rounded-2xl border border-[var(--wax)]/30 bg-[var(--parchment-dim)] p-6 flex flex-col overflow-y-auto">
          <h3 className="font-display text-base font-semibold text-[var(--ink)]">{name}</h3>
          <p className="mt-2 text-xs leading-relaxed text-[var(--slate)]">{definition}</p>

          <div className="mt-3 rounded-lg border border-[var(--line)] bg-white/70 p-2">
            {visual}
          </div>

          {checker && <div className="mt-3">{checker}</div>}

          <p className="mt-auto pt-3 font-mono text-[10px] uppercase tracking-widest text-[var(--wax)]">
            Tap to flip back
          </p>
        </div>
      </div>
    </div>
  )
}
