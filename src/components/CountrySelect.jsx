import { useEffect, useMemo, useRef, useState } from 'react'
import { HAGUE_COUNTRIES, NON_HAGUE_COUNTRIES } from '../lib/countries'

export default function CountrySelect({ value, onChange, id }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => setQuery(value || ''), [value])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (c) => c.toLowerCase().includes(q)
    return {
      hague: q ? HAGUE_COUNTRIES.filter(matches) : HAGUE_COUNTRIES,
      nonHague: q ? NON_HAGUE_COUNTRIES.filter(matches) : NON_HAGUE_COUNTRIES,
    }
  }, [query])

  const select = (country) => {
    setQuery(country)
    onChange(country)
    setOpen(false)
  }

  const handleInputChange = (e) => {
    setQuery(e.target.value)
    onChange(e.target.value)
    setOpen(true)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        required
        autoComplete="off"
        placeholder="Type or select a country"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-[var(--wax)]"
      />
      {open && (filtered.hague.length > 0 || filtered.nonHague.length > 0) && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--parchment)] shadow-lg">
          {filtered.hague.length > 0 && (
            <div>
              <p className="sticky top-0 bg-[var(--parchment-dim)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--brass)]">
                Hague Convention — apostille eligible
              </p>
              {filtered.hague.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => select(c)}
                  className="block w-full px-4 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--wax)]/10"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {filtered.nonHague.length > 0 && (
            <div>
              <p className="sticky top-0 bg-[var(--parchment-dim)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">
                Non-Hague — embassy legalization required
              </p>
              {filtered.nonHague.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => select(c)}
                  className="block w-full px-4 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--wax)]/10"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
