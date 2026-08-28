export default function SealGraphic({ size = 132, label }) {
  return (
    <svg viewBox="0 0 220 220" width={size} height={size} role="img" aria-hidden="true">
      <defs>
        <radialGradient id="bSealNavy" cx="32%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#33456E" />
          <stop offset="45%" stopColor="#182B4D" />
          <stop offset="80%" stopColor="#0B1526" />
          <stop offset="100%" stopColor="#050A14" />
        </radialGradient>
        <linearGradient id="bSealGold" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#F3E0A0" />
          <stop offset="30%" stopColor="#E4C766" />
          <stop offset="55%" stopColor="#C9A227" />
          <stop offset="80%" stopColor="#8F6F1E" />
          <stop offset="100%" stopColor="#6E5416" />
        </linearGradient>
        <linearGradient id="bInnerBevel" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#F3E0A0" />
          <stop offset="50%" stopColor="#B8912B" />
          <stop offset="100%" stopColor="#5C4713" />
        </linearGradient>
        <radialGradient id="bSheen" cx="30%" cy="22%" r="45%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="110" cy="110" r="102" fill="url(#bSealGold)" />
      <circle cx="110" cy="110" r="94" fill="url(#bInnerBevel)" />
      <circle cx="110" cy="110" r="90" fill="url(#bSealNavy)" />
      <circle cx="110" cy="110" r="90" fill="url(#bSheen)" />

      <circle cx="110" cy="110" r="80" fill="none" stroke="#C9A227" strokeWidth="1.5" opacity="0.9" />
      <circle cx="110" cy="110" r="72" fill="none" stroke="#C9A227" strokeWidth="1" strokeDasharray="1,4" opacity="0.7" />

      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2
        const x = 110 + Math.cos(angle) * 86
        const y = 110 + Math.sin(angle) * 86
        return <circle key={i} cx={x} cy={y} r="1.4" fill="#E4C766" opacity="0.8" />
      })}

      <text
        x="110" y={label ? '100' : '116'}
        textAnchor="middle"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="42"
        fontWeight="600"
        fill="#E4C766"
        style={{ filter: 'drop-shadow(0.5px 1px 0 #7A5E1C) drop-shadow(1px 2px 1px rgba(0,0,0,0.35))' }}
      >
        TDP
      </text>
      {label && (
        <text x="110" y="132" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="16" letterSpacing="2" fill="#C9A227">
          {label}
        </text>
      )}
    </svg>
  )
}
