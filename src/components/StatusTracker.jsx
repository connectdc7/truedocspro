const STAGES = [
  { key: 'received', label: 'Received' },
  { key: 'in_process', label: 'In process' },
  { key: 'ready', label: 'Ready' },
  { key: 'shipped', label: 'Shipped / Returned' },
]

export default function StatusTracker({ status }) {
  const currentIndex = STAGES.findIndex((s) => s.key === status)

  return (
    <div className="w-full">
      <div className="relative flex justify-between">
        <div className="absolute left-0 right-0 top-[9px] h-[2px] bg-[var(--line)]" />
        <div
          className="absolute left-0 top-[9px] h-[2px] bg-[var(--wax)] transition-all duration-500"
          style={{
            width: currentIndex <= 0 ? '0%' : `${(currentIndex / (STAGES.length - 1)) * 100}%`,
          }}
        />
        {STAGES.map((stage, i) => {
          const done = i <= currentIndex
          return (
            <div key={stage.key} className="relative z-10 flex flex-col items-center gap-2" style={{ width: `${100 / STAGES.length}%` }}>
              <div
                className={`h-5 w-5 rounded-full border-2 transition-colors ${
                  done
                    ? 'bg-[var(--wax)] border-[var(--wax)]'
                    : 'bg-[var(--parchment)] border-[var(--line)]'
                }`}
              />
              <span
                className={`font-mono text-[11px] text-center uppercase tracking-wide ${
                  done ? 'text-[var(--ink)]' : 'text-[var(--slate)]'
                }`}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { STAGES }
