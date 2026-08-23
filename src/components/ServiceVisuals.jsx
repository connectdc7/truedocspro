// Simple illustrative graphics showing what each certification actually
// looks like on a document — kept generic/schematic, not a reproduction
// of any real government form.

export function NotaryVisual() {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto" role="img" aria-label="Example notary attestation on a document">
      <rect x="4" y="4" width="192" height="132" rx="6" fill="#FFFFFF" stroke="#E1E4EA" strokeWidth="2" />
      <line x1="20" y1="28" x2="140" y2="28" stroke="#D8DCE3" strokeWidth="3" />
      <line x1="20" y1="42" x2="160" y2="42" stroke="#D8DCE3" strokeWidth="3" />
      <line x1="20" y1="56" x2="120" y2="56" stroke="#D8DCE3" strokeWidth="3" />
      <line x1="20" y1="88" x2="90" y2="88" stroke="#B9C0CC" strokeWidth="2" />
      <text x="20" y="82" fontFamily="Georgia, serif" fontStyle="italic" fontSize="11" fill="#57616F">Signature</text>
      {/* notary seal stamp, slightly rotated like a real ink stamp */}
      <g transform="translate(150,95) rotate(-12)">
        <circle cx="0" cy="0" r="30" fill="none" stroke="#0F1B33" strokeWidth="2" opacity="0.85" />
        <circle cx="0" cy="0" r="24" fill="none" stroke="#0F1B33" strokeWidth="1" strokeDasharray="1,3" opacity="0.7" />
        <text x="0" y="-6" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="6.5" fontWeight="700" fill="#0F1B33" letterSpacing="0.5">NOTARY</text>
        <text x="0" y="2" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="6.5" fontWeight="700" fill="#0F1B33" letterSpacing="0.5">PUBLIC</text>
        <text x="0" y="12" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="5" fill="#0F1B33">STATE OF __</text>
      </g>
    </svg>
  )
}

export function ApostilleVisual() {
  const rows = ['Country', 'Signed by', 'Capacity', 'Seal of', 'Certified', 'At', 'Date', 'By', 'No.', 'Seal / Stamp']
  return (
    <svg viewBox="0 0 200 150" className="w-full h-auto" role="img" aria-label="Example apostille certificate layout">
      <rect x="4" y="4" width="192" height="142" rx="6" fill="#FFFFFF" stroke="#C9A227" strokeWidth="2" />
      <text x="100" y="20" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="11" fill="#0F1B33">
        APOSTILLE
      </text>
      <text x="100" y="30" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="5.5" fill="#57616F">
        Convention de La Haye du 5 octobre 1961
      </text>
      {rows.slice(0, 5).map((r, i) => (
        <g key={r}>
          <text x="10" y={44 + i * 11} fontFamily="Arial, sans-serif" fontSize="5.5" fill="#57616F">{i + 1}. {r}</text>
          <line x1="55" y1={42 + i * 11} x2="95" y2={42 + i * 11} stroke="#D8DCE3" strokeWidth="1" />
        </g>
      ))}
      {rows.slice(5).map((r, i) => (
        <g key={r}>
          <text x="105" y={44 + i * 11} fontFamily="Arial, sans-serif" fontSize="5.5" fill="#57616F">{i + 6}. {r}</text>
          <line x1="150" y1={42 + i * 11} x2="190" y2={42 + i * 11} stroke="#D8DCE3" strokeWidth="1" />
        </g>
      ))}
      <circle cx="150" cy="122" r="14" fill="none" stroke="#C9A227" strokeWidth="1.5" />
      <text x="150" y="124" textAnchor="middle" fontFamily="Georgia, serif" fontSize="6" fill="#C9A227">SEAL</text>
    </svg>
  )
}

export function EmbassyVisual() {
  const steps = ['Notary', 'State', 'Fed.', 'Embassy']
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto" role="img" aria-label="Example embassy legalization chain of stamps">
      <rect x="4" y="4" width="192" height="132" rx="6" fill="#FFFFFF" stroke="#E1E4EA" strokeWidth="2" />
      <text x="100" y="20" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="10" fill="#0F1B33">
        Chain of Authentication
      </text>
      {steps.map((s, i) => {
        const x = 30 + i * 47
        return (
          <g key={s}>
            <circle cx={x} cy="70" r="20" fill="none" stroke={i < 3 ? '#0F1B33' : '#C9A227'} strokeWidth="2" opacity="0.85" />
            <circle cx={x} cy="70" r="15" fill="none" stroke={i < 3 ? '#0F1B33' : '#C9A227'} strokeWidth="1" strokeDasharray="1,3" opacity="0.6" />
            <text x={x} y="73" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="6" fontWeight="700" fill={i < 3 ? '#0F1B33' : '#C9A227'}>
              {s}
            </text>
            {i < steps.length - 1 && (
              <path d={`M ${x + 22} 70 L ${x + 25} 70`} stroke="#B9C0CC" strokeWidth="1" markerEnd="url(#arrow)" />
            )}
          </g>
        )
      })}
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#B9C0CC" />
        </marker>
      </defs>
      <line x1="50" y1="70" x2="63" y2="70" stroke="#B9C0CC" strokeWidth="1" />
      <line x1="97" y1="70" x2="110" y2="70" stroke="#B9C0CC" strokeWidth="1" />
      <line x1="144" y1="70" x2="157" y2="70" stroke="#B9C0CC" strokeWidth="1" />
      <text x="100" y="112" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="6" fill="#57616F">
        Each stage authenticates the one before it
      </text>
    </svg>
  )
}
