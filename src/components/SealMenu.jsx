import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { getContextualMenu } from '../lib/sealMenu'
import SealGraphic from './SealGraphic'

export default function SealMenu() {
  const { user, isStaff, isAdmin, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!user) return null

  const menu = getContextualMenu(location.pathname, { isStaff, isAdmin })
  const items = menu.items.filter((item) => item.to !== location.pathname)

  const handleSignOut = async () => {
    await signOut()
    setOpen(false)
    navigate('/')
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        title="Account menu"
        className="transition-transform hover:scale-105"
      >
        <SealGraphic size={40} />
      </button>

      {open && (
        <div className="absolute right-0 top-[52px] w-72 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--parchment)] shadow-xl z-50">
          <div className="border-b border-[var(--line)] bg-[var(--parchment-dim)] px-4 py-3">
            <p className="font-display text-sm font-semibold text-[var(--ink)]">
              {profile?.full_name || 'Your account'}
            </p>
            {isStaff && profile?.title && (
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--brass)]">{profile.title}</p>
            )}
            <p className="mt-1.5 text-xs text-[var(--slate)]">
              <a href={`mailto:${profile?.email || user.email}`} className="hover:text-[var(--wax)] hover:underline">
                {profile?.email || user.email}
              </a>
            </p>
            <p className="text-xs text-[var(--slate)]">
              {profile?.phone || (
                <Link to="/account" onClick={() => setOpen(false)} className="text-[var(--wax)] hover:underline">
                  Add a phone number
                </Link>
              )}
            </p>
          </div>

          <Link
            to="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--wax)]/10 hover:text-[var(--wax)] transition-colors"
          >
            Account settings
          </Link>

          {menu.section && (
            <p className="border-y border-[var(--line)] px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">
              {menu.section}
            </p>
          )}
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--wax)]/10 hover:text-[var(--wax)] transition-colors"
            >
              {item.label}
            </Link>
          ))}

          <button
            onClick={handleSignOut}
            className="block w-full border-t border-[var(--line)] px-4 py-2.5 text-left text-sm text-[var(--wax)] hover:bg-[var(--wax)]/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
