export default function WaxSeal({ label = 'CERTIFIED', className = '' }) {
  return (
    <div className={`stamp-anim ${className}`}>
      <svg viewBox="0 0 220 220" width="220" height="220" role="img" aria-label={`${label} seal`}>
        <defs>
          <radialGradient id="navyGrad" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#24365C" />
            <stop offset="60%" stopColor="#0F1B33" />
            <stop offset="100%" stopColor="#081020" />
          </radialGradient>
          <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E4C766" />
            <stop offset="50%" stopColor="#C9A227" />
            <stop offset="100%" stopColor="#A3821A" />
          </linearGradient>
        </defs>

        {/* outer gold ring */}
        <circle cx="110" cy="110" r="100" fill="url(#goldRing)" />
        {/* navy medallion face */}
        <circle cx="110" cy="110" r="92" fill="url(#navyGrad)" />
        {/* inner gold rings */}
        <circle cx="110" cy="110" r="80" fill="none" stroke="#C9A227" strokeWidth="1.25" opacity="0.9" />
        <circle cx="110" cy="110" r="72" fill="none" stroke="#C9A227" strokeWidth="1" strokeDasharray="1,4" opacity="0.7" />

        {/* small trust marks around the ring */}
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2
          const x = 110 + Math.cos(angle) * 86
          const y = 110 + Math.sin(angle) * 86
          return <circle key={i} cx={x} cy={y} r="1.4" fill="#E4C766" opacity="0.8" />
        })}

        <text
          x="110" y="102"
          textAnchor="middle"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="30"
          fontWeight="600"
          fill="#E4C766"
        >
          TDP
        </text>
        <text
          x="110" y="128"
          textAnchor="middle"
          fontFamily="'IBM Plex Mono', monospace"
          fontSize="11"
          letterSpacing="3"
          fill="#C9A227"
          opacity="0.95"
        >
          {label}
        </text>
      </svg>
    </div>
  )
}
