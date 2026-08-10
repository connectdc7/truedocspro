export default function WaxSeal({ label = 'CERTIFIED', className = '' }) {
  return (
    <div className={`stamp-anim ${className}`}>
      <svg viewBox="0 0 220 220" width="220" height="220" role="img" aria-label={`${label} seal`}>
        <defs>
          <radialGradient id="waxGrad" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#C24A42" />
            <stop offset="55%" stopColor="#A8322D" />
            <stop offset="100%" stopColor="#7E2622" />
          </radialGradient>
        </defs>
        <circle cx="110" cy="110" r="98" fill="url(#waxGrad)" />
        <circle cx="110" cy="110" r="98" fill="none" stroke="#7E2622" strokeWidth="1" opacity="0.5" />
        <circle cx="110" cy="110" r="82" fill="none" stroke="#F5F1E6" strokeWidth="1.5" strokeDasharray="1,5" opacity="0.85" />
        <circle cx="110" cy="110" r="70" fill="none" stroke="#F5F1E6" strokeWidth="1" opacity="0.5" />
        <text
          x="110" y="102"
          textAnchor="middle"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="30"
          fontWeight="600"
          fill="#F5F1E6"
        >
          TDP
        </text>
        <text
          x="110" y="128"
          textAnchor="middle"
          fontFamily="'IBM Plex Mono', monospace"
          fontSize="11"
          letterSpacing="3"
          fill="#F5F1E6"
          opacity="0.9"
        >
          {label}
        </text>
        {/* irregular wax edge */}
        <path
          d="M110 12 C 130 14, 128 26, 112 24 C 96 22, 98 13, 110 12 Z"
          fill="#7E2622" opacity="0.4"
        />
      </svg>
    </div>
  )
}
