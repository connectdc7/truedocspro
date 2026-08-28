import { Link, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import SealMenu from './SealMenu'

const navLink = ({ isActive }) =>
  `text-[15px] tracking-wide transition-colors ${
    isActive ? 'text-[var(--wax)]' : 'text-[var(--ink)]/80 hover:text-[var(--wax)]'
  }`

export default function Navbar() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--parchment)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="logo-entrance font-display text-xl font-semibold tracking-tight text-[var(--ink)]">
            True Doc <span className="text-[var(--wax)]" style={{ filter: 'drop-shadow(0px 0.6px 0.4px rgba(0,0,0,0.25))' }}>Pros</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <NavLink to="/services" className={navLink}>Services</NavLink>
          <NavLink to="/how-it-works" className={navLink}>How it works</NavLink>
          <NavLink to="/blog" className={navLink}>Blog</NavLink>
          <NavLink to="/contact" className={navLink}>Contact</NavLink>
          {user ? (
            <SealMenu />
          ) : (
            <>
              <NavLink to="/login" className={navLink}>Log in</NavLink>
              <Link
                to="/signup"
                className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--parchment)] hover:bg-[var(--wax)] transition-colors"
              >
                Submit a document
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          {user && <SealMenu />}
          <button type="button"
            className="text-[var(--ink)]"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-[var(--line)] px-6 py-4 md:hidden">
          <NavLink to="/services" className="py-2" onClick={() => setOpen(false)}>Services</NavLink>
          <NavLink to="/how-it-works" className="py-2" onClick={() => setOpen(false)}>How it works</NavLink>
          <NavLink to="/blog" className="py-2" onClick={() => setOpen(false)}>Blog</NavLink>
          <NavLink to="/contact" className="py-2" onClick={() => setOpen(false)}>Contact</NavLink>
          {!user && (
            <>
              <NavLink to="/login" className="py-2" onClick={() => setOpen(false)}>Log in</NavLink>
              <NavLink to="/signup" className="py-2 text-[var(--wax)]" onClick={() => setOpen(false)}>Submit a document</NavLink>
            </>
          )}
        </nav>
      )}
    </header>
  )
}
