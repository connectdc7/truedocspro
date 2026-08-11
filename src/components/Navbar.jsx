import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

const navLink = ({ isActive }) =>
  `text-[15px] tracking-wide transition-colors ${
    isActive ? 'text-[var(--wax)]' : 'text-[var(--ink)]/80 hover:text-[var(--wax)]'
  }`

export default function Navbar() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--parchment)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-xl font-semibold tracking-tight text-[var(--ink)]">
            True Docs <span className="text-[var(--wax)]">Pro</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <NavLink to="/services" className={navLink}>Services</NavLink>
          <NavLink to="/how-it-works" className={navLink}>How it works</NavLink>
          <NavLink to="/contact" className={navLink}>Contact</NavLink>
          {user ? (
            <>
              <NavLink to="/portal" className={navLink}>Portal</NavLink>
              <NavLink to="/app" className={navLink}>Get the app</NavLink>
              <button
                onClick={handleSignOut}
                className="rounded-full border border-[var(--ink)]/20 px-4 py-2 text-sm text-[var(--ink)] hover:border-[var(--wax)] hover:text-[var(--wax)] transition-colors"
              >
                Sign out
              </button>
            </>
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

        <button
          className="md:hidden text-[var(--ink)]"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-[var(--line)] px-6 py-4 md:hidden">
          <NavLink to="/services" className="py-2" onClick={() => setOpen(false)}>Services</NavLink>
          <NavLink to="/how-it-works" className="py-2" onClick={() => setOpen(false)}>How it works</NavLink>
          <NavLink to="/contact" className="py-2" onClick={() => setOpen(false)}>Contact</NavLink>
          {user ? (
            <>
              <NavLink to="/portal" className="py-2" onClick={() => setOpen(false)}>Portal</NavLink>
              <button onClick={handleSignOut} className="py-2 text-left text-[var(--wax)]">Sign out</button>
            </>
          ) : (
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
