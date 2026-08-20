// Subtle, theme-related decorative background graphic — concentric rings
// evoking an official seal/stamp, plus a few faint document-corner marks.
// Purely decorative: absolutely positioned, non-interactive, low opacity.
export default function HeroGraphic({ className = '' }) {
  return (
    <svg
      className={`pointer-events-none absolute ${className}`}
      viewBox="0 0 600 600"
      width="600"
      height="600"
      aria-hidden="true"
    >
      <circle cx="420" cy="220" r="260" fill="none" stroke="#0F1B33" strokeWidth="1" opacity="0.06" />
      <circle cx="420" cy="220" r="210" fill="none" stroke="#0F1B33" strokeWidth="1" opacity="0.05" />
      <circle cx="420" cy="220" r="160" fill="none" stroke="#C9A227" strokeWidth="1" strokeDasharray="2,10" opacity="0.15" />
      <circle cx="420" cy="220" r="110" fill="none" stroke="#0F1B33" strokeWidth="1" opacity="0.05" />

      {/* faint document-corner mark, top right */}
      <path d="M540 40 h40 v40" fill="none" stroke="#0F1B33" strokeWidth="1.5" opacity="0.08" />
      {/* faint document-corner mark, bottom left of the ring cluster */}
      <path d="M220 460 v40 h40" fill="none" stroke="#C9A227" strokeWidth="1.5" opacity="0.12" />
    </svg>
  )
}
