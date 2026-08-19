export default function LegalizationPath({ isHague, country }) {
  const steps = isHague
    ? ['Notary (if needed)', 'Secretary of State', 'Complete', 'Mail home']
    : ['Notary (if needed)', 'Secretary of State', 'U.S. State Department', `Embassy of ${country}`, 'Complete', 'Mail home']

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--parchment-dim)] p-4">
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--slate)]">
        {isHague ? 'Apostille path' : 'Embassy legalization path'} for {country}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {steps.map((step, i) => (
          <span key={step} className="flex items-center gap-1.5">
            <span className="rounded-full border border-[var(--line)] bg-white/70 px-2.5 py-1 text-xs text-[var(--ink)]">
              {step}
            </span>
            {i < steps.length - 1 && <span className="text-[var(--slate)]">→</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
