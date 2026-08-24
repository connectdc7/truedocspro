// Larger, front-facing emblems for the "What we process" flip tiles —
// distinct from the small schematic illustrations on the back of each
// card. These are meant to fill most of the tile as a clean visual
// centerpiece, consistent with the site's navy/gold seal branding.

export function NotaryFrontVisual() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" role="img" aria-label="Notary seal">
      <defs>
        <radialGradient id="nfNavy" cx="32%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#33456E" />
          <stop offset="55%" stopColor="#182B4D" />
          <stop offset="100%" stopColor="#0B1526" />
        </radialGradient>
        <linearGradient id="nfGold" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#F3E0A0" />
          <stop offset="50%" stopColor="#C9A227" />
          <stop offset="100%" stopColor="#6E5416" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="88" fill="url(#nfGold)" />
      <circle cx="100" cy="100" r="78" fill="url(#nfNavy)" />
      <circle cx="100" cy="100" r="68" fill="none" stroke="#C9A227" strokeWidth="1.5" opacity="0.9" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="#C9A227" strokeWidth="1" strokeDasharray="1,4" opacity="0.7" />
      <text x="100" y="86" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="22" fill="#E4C766">NOTARY</text>
      <text x="100" y="108" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="22" fill="#E4C766">PUBLIC</text>
      <text x="100" y="130" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="10" letterSpacing="2" fill="#C9A227">COMMISSIONED</text>
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2
        const x = 100 + Math.cos(angle) * 72
        const y = 100 + Math.sin(angle) * 72
        return <circle key={i} cx={x} cy={y} r="1.3" fill="#E4C766" opacity="0.7" />
      })}
    </svg>
  )
}

export function ApostilleFrontVisual() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" role="img" aria-label="Apostille certificate seal">
      <defs>
        <radialGradient id="afNavy" cx="32%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#33456E" />
          <stop offset="55%" stopColor="#182B4D" />
          <stop offset="100%" stopColor="#0B1526" />
        </radialGradient>
        <linearGradient id="afGold" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#F3E0A0" />
          <stop offset="50%" stopColor="#C9A227" />
          <stop offset="100%" stopColor="#6E5416" />
        </linearGradient>
      </defs>
      <rect x="46" y="24" width="108" height="140" rx="6" fill="#FFFFFF" stroke="#C9A227" strokeWidth="2" transform="rotate(-4 100 94)" />
      <line x1="62" y1="52" x2="130" y2="52" stroke="#D8DCE3" strokeWidth="3" transform="rotate(-4 100 94)" />
      <line x1="62" y1="68" x2="138" y2="68" stroke="#D8DCE3" strokeWidth="3" transform="rotate(-4 100 94)" />
      <line x1="62" y1="84" x2="120" y2="84" stroke="#D8DCE3" strokeWidth="3" transform="rotate(-4 100 94)" />
      <g transform="translate(112,128)">
        <circle cx="0" cy="0" r="46" fill="url(#afGold)" />
        <circle cx="0" cy="0" r="39" fill="url(#afNavy)" />
        <circle cx="0" cy="0" r="32" fill="none" stroke="#C9A227" strokeWidth="1.5" opacity="0.9" />
        <text x="0" y="-3" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="10.5" fill="#E4C766">APOSTILLE</text>
        <text x="0" y="12" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="7" letterSpacing="1" fill="#C9A227">HAGUE 1961</text>
      </g>
    </svg>
  )
}

export function EmbassyFrontVisual() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" role="img" aria-label="Embassy legalization seal">
      <defs>
        <radialGradient id="efNavy" cx="32%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#33456E" />
          <stop offset="55%" stopColor="#182B4D" />
          <stop offset="100%" stopColor="#0B1526" />
        </radialGradient>
        <linearGradient id="efGold" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#F3E0A0" />
          <stop offset="50%" stopColor="#C9A227" />
          <stop offset="100%" stopColor="#6E5416" />
        </linearGradient>
      </defs>
      <path
        d="M100 20 L166 44 V96 C166 138 138 168 100 182 C62 168 34 138 34 96 V44 Z"
        fill="url(#efGold)"
      />
      <path
        d="M100 32 L154 52 V96 C154 130 132 155 100 168 C68 155 46 130 46 96 V52 Z"
        fill="url(#efNavy)"
      />
      <path
        d="M100 32 L154 52 V96 C154 130 132 155 100 168 C68 155 46 130 46 96 V52 Z"
        fill="none" stroke="#C9A227" strokeWidth="1.5" opacity="0.85"
      />
      <circle cx="100" cy="82" r="20" fill="none" stroke="#E4C766" strokeWidth="1.5" />
      <ellipse cx="100" cy="82" rx="8" ry="20" fill="none" stroke="#E4C766" strokeWidth="1" opacity="0.8" />
      <line x1="80" y1="82" x2="120" y2="82" stroke="#E4C766" strokeWidth="1" opacity="0.8" />
      <line x1="83" y1="72" x2="117" y2="72" stroke="#E4C766" strokeWidth="1" opacity="0.6" />
      <line x1="83" y1="92" x2="117" y2="92" stroke="#E4C766" strokeWidth="1" opacity="0.6" />
      <text x="100" y="128" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="12" fill="#E4C766">EMBASSY</text>
      <text x="100" y="142" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="7" letterSpacing="1" fill="#C9A227">LEGALIZATION</text>
    </svg>
  )
}
