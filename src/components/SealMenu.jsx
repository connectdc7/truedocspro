import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { getContextualMenu } from '../lib/sealMenu'
import SealGraphic from './SealGraphic'

const SIZE = 72
const DOCK_TOP = 16
const DOCK_RIGHT = 24
const DRAG_THRESHOLD = 4

export default function SealMenu() {
  const { user, isStaff, isAdmin, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [hovering, setHovering] = useState(false)
  const wrapRef = useRef(null)
  const menuRef = useRef(null)
  const posRef = useRef({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const draggedRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  // Start docked top-right, same spot the old Sign out button used to sit
  useEffect(() => {
    if (!user) return
    const x = window.innerWidth - SIZE - DOCK_RIGHT
    const y = DOCK_TOP
    posRef.current = { x, y }
    if (wrapRef.current) wrapRef.current.style.transform = `translate(${x}px, ${y}px)`

    const handleResize = () => {
      const nx = Math.min(posRef.current.x, window.innerWidth - SIZE)
      const ny = Math.min(posRef.current.y, window.innerHeight - SIZE)
      posRef.current = { x: nx, y: ny }
      if (wrapRef.current) wrapRef.current.style.transform = `translate(${nx}px, ${ny}px)`
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [user])

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
  const items = menu.items.filter((item) => item.to !== location.pathname)

  const handleSignOut = async () => {
    await signOut()
    setOpen(false)
    navigate('/')
  }

  const handlePointerDown = (e) => {
    draggingRef.current = true
    draggedRef.current = false
    const rect = wrapRef.current.getBoundingClientRect()
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return
    const dx = e.clientX - (dragOffsetRef.current.x + posRef.current.x)
    const dy = e.clientY - (dragOffsetRef.current.y + posRef.current.y)
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      draggedRef.current = true
    }
    const nextX = Math.min(Math.max(e.clientX - dragOffsetRef.current.x, 0), window.innerWidth - SIZE)
    const nextY = Math.min(Math.max(e.clientY - dragOffsetRef.current.y, 0), window.innerHeight - SIZE)
    posRef.current = { x: nextX, y: nextY }
    if (wrapRef.current) wrapRef.current.style.transform = `translate(${nextX}px, ${nextY}px)`
  }

  const handlePointerUp = () => {
    draggingRef.current = false
  }

  const handleClick = () => {
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    setOpen((o) => !o)
  }

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: SIZE,
        height: SIZE,
        zIndex: 60,
        touchAction: 'none',
        willChange: 'transform',
      }}
    >
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        aria-label="Account menu — drag to move"
        aria-expanded={open}
        title="Account menu — drag to move"
        className="drop-shadow-lg transition-transform"
        style={{ cursor: 'grab', transform: hovering ? 'scale(1.18)' : 'scale(1)' }}
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
