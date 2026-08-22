export default function ProcessAnimation() {
  return (
    <div className="process-anim-wrap rounded-2xl border border-[var(--line)] bg-[var(--parchment-dim)] px-6 py-10 md:px-10">
      <svg viewBox="0 0 800 260" width="100%" height="auto" role="img" aria-label="Animated illustration: a document is received, stamped with a seal, placed in an envelope, and delivered to a desk">
        <defs>
          <linearGradient id="paGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E4C766" />
            <stop offset="100%" stopColor="#A3821A" />
          </linearGradient>
        </defs>

        {/* Desk (static, right side) */}
        <g>
          <rect x="620" y="190" width="150" height="10" rx="2" fill="#0F1B33" opacity="0.85" />
          <rect x="635" y="200" width="10" height="34" fill="#0F1B33" opacity="0.6" />
          <rect x="745" y="200" width="10" height="34" fill="#0F1B33" opacity="0.6" />
        </g>

        {/* Document */}
        <g className="pa-document">
          <rect x="0" y="0" width="120" height="150" rx="8" fill="#FFFFFF" stroke="#C9A227" strokeWidth="2" />
          <line x1="18" y1="30" x2="102" y2="30" stroke="#B9C0CC" strokeWidth="4" />
          <line x1="18" y1="50" x2="102" y2="50" stroke="#D8DCE3" strokeWidth="4" />
          <line x1="18" y1="70" x2="86" y2="70" stroke="#D8DCE3" strokeWidth="4" />
          <line x1="18" y1="98" x2="102" y2="98" stroke="#D8DCE3" strokeWidth="4" />
          <line x1="18" y1="118" x2="70" y2="118" stroke="#D8DCE3" strokeWidth="4" />
          <circle className="pa-stamp-mark" cx="80" cy="105" r="22" fill="none" stroke="#A3821A" strokeWidth="3" opacity="0" />
        </g>

        {/* Seal medallion that stamps down */}
        <g className="pa-seal">
          <circle cx="0" cy="0" r="46" fill="url(#paGold)" />
          <circle cx="0" cy="0" r="38" fill="#0F1B33" />
          <circle cx="0" cy="0" r="32" fill="none" stroke="#C9A227" strokeWidth="1.5" opacity="0.9" />
          <text x="0" y="7" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="20" fontWeight="600" fill="#E4C766">TDP</text>
        </g>

        {/* Envelope */}
        <g className="pa-envelope">
          <rect x="-70" y="-46" width="140" height="92" rx="6" fill="#F5F1E6" stroke="#C9A227" strokeWidth="2" />
          <path className="pa-flap" d="M -70 -46 L 0 4 L 70 -46" fill="none" stroke="#C9A227" strokeWidth="2" />
        </g>

        {/* Labels */}
        <text className="pa-label pa-label-1" x="60" y="235" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="13" fill="#5C6470">Received</text>
        <text className="pa-label pa-label-2" x="330" y="235" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="13" fill="#5C6470">Certified</text>
        <text className="pa-label pa-label-3" x="500" y="235" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="13" fill="#5C6470">Packaged</text>
        <text className="pa-label pa-label-4" x="695" y="235" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="13" fill="#5C6470">Delivered</text>
      </svg>
    </div>
  )
}
