import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { getContextualMenu } from '../lib/sealMenu'
import useInstallPrompt from '../lib/useInstallPrompt'
import SealGraphic from './SealGraphic'

const SIZE = 72
const DOCK_TOP_DESKTOP = 16
const DOCK_TOP_MOBILE = 76 // clears the header row entirely, so it never overlaps the hamburger button
const DOCK_RIGHT = 16

function useDockTop() {
  const [dockTop, setDockTop] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768 ? DOCK_TOP_MOBILE : DOCK_TOP_DESKTOP
  )
  useEffect(() => {
    const handleResize = () => {
      setDockTop(window.innerWidth < 768 ? DOCK_TOP_MOBILE : DOCK_TOP_DESKTOP)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return dockTop
}

// Static seal in the same top-right spot on every page, once logged
// in. Click opens the account menu; hover grows it slightly for
// feedback. No dragging or movement — stays put consistently. Sits
// just below the header on mobile so it never overlaps the hamburger
// menu button.
export default function SealMenu() {
  const { user, isStaff, isAdmin, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [hovering, setHovering] = useState(false)
  const wrapRef = useRef(null)
  const menuRef = useRef(null)
  const dockTop = useDockTop()
  const { canInstallDirectly, isStandalone, promptInstall } = useInstallPrompt()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (
        wrapRef.current && !wrapRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!user) return null

  const menu = getContextualMenu(location.pathname, { isStaff, isAdmin })
  const items = menu.items.filter((item) => item.to !== location.pathname && !(item.to === '/app' && isStandalone))

  const handleSignOut = async () => {
    await signOut()
    setOpen(false)
    navigate('/')
  }

  const handleItemClick = async (item, e) => {
    if (item.to === '/app' && canInstallDirectly) {
      e.preventDefault()
      await promptInstall()
      setOpen(false)
      return
    }
    setOpen(false)
  }

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed',
        top: dockTop,
        right: DOCK_RIGHT,
        zIndex: 60,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        aria-label="Account menu"
        aria-expanded={open}
        title="Account menu"
        className="drop-shadow-lg transition-transform"
        style={{ transform: hovering ? 'scale(1.25)' : 'scale(1)' }}
      >
        <SealGraphic size={SIZE} label="MENU" />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-[84px] w-72 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--parchment)] shadow-xl"
        >
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
              onClick={(e) => handleItemClick(item, e)}
              className="block px-4 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--wax)]/10 hover:text-[var(--wax)] transition-colors"
            >
              {item.to === '/app' && canInstallDirectly ? 'Install app' : item.label}
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
