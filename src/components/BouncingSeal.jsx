import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const SIZE = 88
const SPEED = 1.8
const START_DELAY_MS = 900
const DOCK_TOP = 96
const DOCK_RIGHT = 20

function getContextualMenu(pathname, { isStaff, isAdmin }) {
  // Viewing a specific staff order
  if (pathname.startsWith('/staff/orders/')) {
    return {
      section: 'This order',
      items: [
        { to: '/staff', label: '← All documents' },
        ...(isAdmin
          ? [
              { to: '/staff/embassy-fees', label: 'Embassy fees' },
              { to: '/staff/sos-fees', label: 'SOS fees' },
              { to: '/staff/shipping-fees', label: 'Shipping fees' },
              { to: '/staff/team', label: 'Team' },
            ]
          : []),
      ],
    }
  }
  // Team page
  if (pathname === '/staff/team') {
    return {
      section: 'Staff tools',
      items: [
        { to: '/staff', label: '← Staff dashboard' },
        { to: '/blog', label: 'View public blog' },
      ],
    }
  }
  // Fee schedule pages — cross-link to the other two
  if (pathname === '/staff/embassy-fees' || pathname === '/staff/sos-fees' || pathname === '/staff/shipping-fees') {
    const feeLinks = [
      { to: '/staff/embassy-fees', label: 'Embassy fees' },
      { to: '/staff/sos-fees', label: 'SOS fees' },
      { to: '/staff/shipping-fees', label: 'Shipping fees' },
    ]
    return {
      section: 'Fee schedules',
      items: [
        { to: '/staff', label: '← Staff dashboard' },
        ...feeLinks,
      ],
    }
  }
  // Blog management pages
  if (pathname.startsWith('/staff/blog')) {
    return {
      section: 'Blog management',
      items: [
        { to: '/staff', label: '← Staff dashboard' },
        { to: '/staff/blog/new', label: '+ New post' },
        { to: '/blog', label: 'View public blog' },
      ],
    }
  }
  // Staff dashboard itself
  if (pathname === '/staff') {
    const items = []
    if (isAdmin) {
      items.push(
        { to: '/staff/team', label: 'Team' },
        { to: '/staff/embassy-fees', label: 'Embassy fees' },
        { to: '/staff/sos-fees', label: 'SOS fees' },
        { to: '/staff/shipping-fees', label: 'Shipping fees' },
        { to: '/staff/blog', label: 'Manage blog' }
      )
    }
    items.push({ to: '/portal', label: 'My documents' })
    return { section: 'Staff tools', items }
  }
  // Viewing a specific client order
  if (pathname.startsWith('/portal/orders/')) {
    return {
      section: 'This document',
      items: [
        { to: '/portal', label: '← My documents' },
        { to: '/portal/new', label: 'Submit another document' },
        { to: '/app', label: 'Get the app' },
        { to: '/contact', label: 'Questions? Contact us' },
      ],
    }
  }
  // Submitting a new document
  if (pathname === '/portal/new') {
    return {
      section: 'Submitting a document',
      items: [
        { to: '/portal', label: 'My documents' },
        { to: '/services', label: 'View pricing' },
        { to: '/contact', label: 'Questions? Contact us' },
      ],
    }
  }
  // Client portal dashboard
  if (pathname === '/portal') {
    const items = [{ to: '/portal/new', label: '+ Submit a document' }]
    if (isStaff) items.push({ to: '/staff', label: 'Staff dashboard' })
    items.push({ to: '/app', label: 'Get the app' }, { to: '/blog', label: 'Blog & updates' })
    return { section: 'Your documents', items }
  }
  // Blog
  if (pathname.startsWith('/blog')) {
    return {
      section: 'Blog',
      items: [
        { to: '/portal/new', label: 'Submit a document' },
        { to: '/portal', label: 'My documents' },
        { to: '/services', label: 'View pricing' },
      ],
    }
  }
  // Marketing pages: home, services, how-it-works, contact, app install
  const items = [
    { to: '/portal/new', label: 'Submit a document' },
    { to: '/portal', label: 'My documents' },
  ]
  if (isStaff) items.push({ to: '/staff', label: 'Staff dashboard' })
  items.push({ to: '/app', label: 'Get the app' }, { to: '/blog', label: 'Blog & updates' })
  return { section: 'Quick links', items }
}

function SealGraphic({ label }) {
  return (
    <svg viewBox="0 0 220 220" width={SIZE} height={SIZE} role="img" aria-hidden="true">
      <defs>
        <radialGradient id="bSealNavy" cx="32%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#33456E" />
          <stop offset="45%" stopColor="#182B4D" />
          <stop offset="100%" stopColor="#050A14" />
        </radialGradient>
        <linearGradient id="bSealGold" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#F3E0A0" />
          <stop offset="50%" stopColor="#C9A227" />
          <stop offset="100%" stopColor="#6E5416" />
        </linearGradient>
      </defs>
      <circle cx="110" cy="110" r="100" fill="url(#bSealGold)" />
      <circle cx="110" cy="110" r="90" fill="url(#bSealNavy)" />
      <circle cx="110" cy="110" r="80" fill="none" stroke="#C9A227" strokeWidth="1.5" opacity="0.9" />
      <text x="110" y="102" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="34" fontWeight="600" fill="#E4C766">
        TDP
      </text>
      <text x="110" y="128" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="12" letterSpacing="2" fill="#C9A227">
        {label}
      </text>
    </svg>
  )
}

export default function BouncingSeal() {
  const { user, isStaff, isAdmin } = useAuth()
  const location = useLocation()
  const wrapRef = useRef(null)
  const menuRef = useRef(null)
  const posRef = useRef({ x: 0, y: 0 })
  const velRef = useRef({ x: SPEED, y: SPEED * 0.8 })
  const pausedRef = useRef(false)
  const [, forceRender] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  const menu = useMemo(() => {
    if (!user) return { section: '', items: [] }
    const built = getContextualMenu(location.pathname, { isStaff, isAdmin })
    return { ...built, items: built.items.filter((item) => item.to !== location.pathname) }
  }, [user, isStaff, isAdmin, location.pathname])

  // Bounce freely when logged out; dock top-right once logged in.
  useEffect(() => {
    let frame
    let startTimer

    if (user) {
      const dockX = window.innerWidth - SIZE - DOCK_RIGHT
      posRef.current = { x: dockX, y: DOCK_TOP }
      if (wrapRef.current) wrapRef.current.style.transform = `translate(${dockX}px, ${DOCK_TOP}px)`

      const handleResize = () => {
        const x = window.innerWidth - SIZE - DOCK_RIGHT
        posRef.current = { x, y: DOCK_TOP }
        if (wrapRef.current) wrapRef.current.style.transform = `translate(${x}px, ${DOCK_TOP}px)`
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }

    // Logged out: bounce freely, starting where the old hero seal sat.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const startX = Math.max(window.innerWidth - SIZE - 80, window.innerWidth * 0.62)
    const startY = 130
    posRef.current = { x: startX, y: startY }
    forceRender((n) => n + 1)
    if (wrapRef.current) wrapRef.current.style.transform = `translate(${startX}px, ${startY}px)`

    if (prefersReducedMotion) return

    let started = false
    const step = () => {
      if (started && !pausedRef.current) {
        const pos = posRef.current
        const vel = velRef.current
        const maxX = window.innerWidth - SIZE
        const maxY = window.innerHeight - SIZE

        let nextX = pos.x + vel.x
        let nextY = pos.y + vel.y

        if (nextX <= 0) { nextX = 0; vel.x = Math.abs(vel.x) }
        else if (nextX >= maxX) { nextX = maxX; vel.x = -Math.abs(vel.x) }
        if (nextY <= 0) { nextY = 0; vel.y = Math.abs(vel.y) }
        else if (nextY >= maxY) { nextY = maxY; vel.y = -Math.abs(vel.y) }

        posRef.current = { x: nextX, y: nextY }
        if (wrapRef.current) wrapRef.current.style.transform = `translate(${nextX}px, ${nextY}px)`
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    startTimer = setTimeout(() => { started = true }, START_DELAY_MS)

    const handleResize = () => {
      posRef.current = {
        x: Math.min(posRef.current.x, window.innerWidth - SIZE),
        y: Math.min(posRef.current.y, window.innerHeight - SIZE),
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(startTimer)
      window.removeEventListener('resize', handleResize)
    }
  }, [user])

  // Close the dropdown whenever the page changes
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Close the dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        wrapRef.current && !wrapRef.current.contains(e.target)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const baseStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    zIndex: 60,
    willChange: 'transform',
  }

  if (!user) {
    return (
      <Link
        to="/portal/new"
        ref={wrapRef}
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = false }}
        style={{ ...baseStyle, cursor: 'pointer' }}
        className="drop-shadow-lg transition-transform hover:scale-110"
        aria-label="Submit a document"
        title="Submit a document"
      >
        <SealGraphic label="SUBMIT" />
      </Link>
    )
  }

  return (
    <div ref={wrapRef} style={baseStyle}>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className="drop-shadow-lg transition-transform hover:scale-105"
        aria-label="Quick links"
        aria-expanded={menuOpen}
        title="Quick links"
      >
        <SealGraphic label="MENU" />
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-[100px] w-56 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--parchment)] shadow-xl"
        >
          {menu.section && (
            <p className="border-b border-[var(--line)] bg-[var(--parchment-dim)] px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[var(--slate)]">
              {menu.section}
            </p>
          )}
          {menu.items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--wax)]/10 hover:text-[var(--wax)] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
