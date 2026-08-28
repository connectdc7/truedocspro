import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { getContextualMenu } from '../lib/sealMenu'
import { supabase } from '../lib/supabaseClient'
import useInstallPrompt from '../lib/useInstallPrompt'
import SealGraphic from './SealGraphic'

const SIZE = 88
const DOCK_TOP_DESKTOP = 100 // aligns with the page header row (e.g. "All documents"), not the navbar itself
const DOCK_TOP_MOBILE = 76 // clears the header row entirely, so it never overlaps the hamburger button
const DOCK_RIGHT = 16
const DRAG_THRESHOLD = 4

function defaultPosition() {
  const top = typeof window !== 'undefined' && window.innerWidth < 768 ? DOCK_TOP_MOBILE : DOCK_TOP_DESKTOP
  const right = DOCK_RIGHT
  const x = typeof window !== 'undefined' ? window.innerWidth - SIZE - right : 0
  return { x, y: top }
}

// Sits in the same top-right spot by default on every page, once
// logged in — but can be dragged anywhere on screen and stays there
// as you navigate. Click opens the account menu (same contextual
// links per page as always); hover grows it slightly for feedback.
export default function SealMenu() {
  const { user, isStaff, isAdmin, profile, signOut, refreshProfile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [dropdownAlign, setDropdownAlign] = useState({ right: true, below: true })
  const [hovering, setHovering] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const wrapRef = useRef(null)
  const menuRef = useRef(null)
  const { canInstallDirectly, isStandalone, promptInstall } = useInstallPrompt()

  const posRef = useRef(defaultPosition())
  const draggingRef = useRef(false)
  const draggedRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const [, forceRender] = useState(0)

  useEffect(() => {
    if (wrapRef.current) {
      wrapRef.current.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
    }
    const handleResize = () => {
      const maxX = window.innerWidth - SIZE
      const maxY = window.innerHeight - SIZE
      posRef.current = {
        x: Math.min(posRef.current.x, maxX),
        y: Math.min(posRef.current.y, maxY),
      }
      if (wrapRef.current) {
        wrapRef.current.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) setEditingNote(false)
  }, [open])

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

  const startEditingNote = () => {
    setNoteDraft(profile?.quick_note || '')
    setEditingNote(true)
  }

  const handleSaveNote = async () => {
    setSavingNote(true)
    const { error } = await supabase.rpc('update_own_quick_note', { new_note: noteDraft || null })
    setSavingNote(false)
    if (!error) {
      refreshProfile()
      setEditingNote(false)
    }
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
      setHovering(false)
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
    if (!open) {
      const { x, y } = posRef.current
      setDropdownAlign({
        right: x > window.innerWidth / 2,
        below: y < window.innerHeight - SIZE - 320, // ~dropdown height
      })
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
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        <div className="seal-shine-ring" />
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
          className="relative z-[1] drop-shadow-lg transition-transform"
          style={{ cursor: 'grab', transform: hovering ? 'scale(1.25)' : 'scale(1)' }}
        >
          <SealGraphic size={SIZE} label="MENU" />
        </button>
      </div>

      {open && (
        <div
          ref={menuRef}
          className={`absolute w-72 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--parchment)] shadow-xl ${
            dropdownAlign.right ? 'right-0' : 'left-0'
          } ${dropdownAlign.below ? 'top-[100px]' : 'bottom-[100px]'}`}
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

          {editingNote ? (
            <div className="border-t border-[var(--line)] bg-[var(--parchment-dim)] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">Your note</p>
              <textarea
                autoFocus
                rows={4}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Type or paste anything you want to keep close at hand…"
                className="mt-1.5 w-full rounded-lg border border-[var(--line)] bg-white/80 px-3 py-2 text-sm outline-none focus:border-[var(--wax)]"
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSaveNote() }}
                  disabled={savingNote}
                  className="rounded-full bg-[var(--ink)] px-4 py-1.5 text-xs font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors disabled:opacity-50"
                >
                  {savingNote ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEditingNote(false) }}
                  className="text-xs text-[var(--slate)] hover:text-[var(--wax)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : profile?.quick_note ? (
            <div className="border-t border-[var(--line)] bg-[var(--parchment-dim)] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">Your note</p>
              <p className="mt-1.5 max-h-32 overflow-y-auto whitespace-pre-wrap text-sm text-[var(--ink)]">
                {profile.quick_note}
              </p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startEditingNote() }}
                className="mt-1.5 text-xs text-[var(--wax)] hover:underline"
              >
                Edit note
              </button>
            </div>
          ) : (
            <div className="border-t border-[var(--line)] bg-[var(--parchment-dim)] px-4 py-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startEditingNote() }}
                className="text-xs text-[var(--wax)] hover:underline"
              >
                + Add a quick note
              </button>
            </div>
          )}

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
            type="button"
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
