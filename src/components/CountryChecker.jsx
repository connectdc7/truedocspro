import { useMemo, useState } from 'react'
import { HAGUE_COUNTRIES, NON_HAGUE_COUNTRIES } from '../lib/countries'

const ALL_COUNTRIES = [...HAGUE_COUNTRIES, ...NON_HAGUE_COUNTRIES].sort()

/**
 * mode="hague": green check means the country IS a Hague member (apostille applies)
 * mode="non-hague": green check means the country is NOT a Hague member (embassy legalization applies)
 */
export default function CountryChecker({ mode, datalistId }) {
  const [value, setValue] = useState('')

  const match = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return null
    const exact =
      HAGUE_COUNTRIES.find((c) => c.toLowerCase() === q) ||
      NON_HAGUE_COUNTRIES.find((c) => c.toLowerCase() === q)
    if (!exact) return 'unknown'
    return HAGUE_COUNTRIES.includes(exact) ? 'hague' : 'non-hague'
  }, [value])

  const isPositive = match && match === mode

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">
        Check a country
      </label>
      <input
        list={datalistId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type a country…"
        className="mt-1.5 w-full rounded-lg border border-[var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[var(--wax)]"
      />
      <datalist id={datalistId}>
        {ALL_COUNTRIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {match && (
        <div className="mt-2 flex items-center gap-1.5">
          {match === 'unknown' ? (
            <span className="text-xs text-[var(--slate)]">Not sure — try selecting from the list, or ask us.</span>
          ) : isPositive ? (
            <>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="10" fill="#1E7A4C" />
                <path d="M6 10.5l2.5 2.5 5.5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs font-medium text-[#1E7A4C]">
                {mode === 'hague' ? 'Hague member — apostille applies' : 'Not a Hague member — embassy legalization applies'}
              </span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="10" fill="#8A8F98" />
                <path d="M7 7l6 6M13 7l-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-xs text-[var(--slate)]">
                {mode === 'hague' ? 'Not a Hague member — this needs embassy legalization instead' : 'This is a Hague member — an apostille applies instead'}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
