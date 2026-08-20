import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const SIZE = 72
const SPEED = 1.8

export default function BouncingSeal() {
  const { user } = useAuth()
  const wrapRef = useRef(null)
  const posRef = useRef({ x: 40, y: 120 })
  const velRef = useRef({ x: SPEED, y: SPEED * 0.8 })
  const pausedRef = useRef(false)
  const [, forceRender] = useState(0)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // start somewhere reasonable, avoiding the very top nav area
    posRef.current = {
      x: Math.random() * (window.innerWidth - SIZE - 40) + 20,
      y: Math.random() * (window.innerHeight * 0.5) + 120,
    }
    forceRender((n) => n + 1)

    if (prefersReducedMotion) {
      if (wrapRef.current) {
        wrapRef.current.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
      }
      return
    }

    let frame
    const step = () => {
      if (!pausedRef.current) {
        const pos = posRef.current
        const vel = velRef.current
        const maxX = window.innerWidth - SIZE
        const maxY = window.innerHeight - SIZE

        let nextX = pos.x + vel.x
        let nextY = pos.y + vel.y

        if (nextX <= 0) {
          nextX = 0
          vel.x = Math.abs(vel.x)
        } else if (nextX >= maxX) {
          nextX = maxX
          vel.x = -Math.abs(vel.x)
        }
        if (nextY <= 0) {
          nextY = 0
          vel.y = Math.abs(vel.y)
        } else if (nextY >= maxY) {
          nextY = maxY
          vel.y = -Math.abs(vel.y)
        }

        posRef.current = { x: nextX, y: nextY }
        if (wrapRef.current) {
          wrapRef.current.style.transform = `translate(${nextX}px, ${nextY}px)`
        }
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)

    const handleResize = () => {
      posRef.current = {
        x: Math.min(posRef.current.x, window.innerWidth - SIZE),
        y: Math.min(posRef.current.y, window.innerHeight - SIZE),
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const destination = user ? '/portal/new' : '/signup'

  return (
    <Link
      to={destination}
      ref={wrapRef}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: SIZE,
        height: SIZE,
        zIndex: 60,
        cursor: 'pointer',
        willChange: 'transform',
      }}
      className="drop-shadow-lg transition-transform hover:scale-110"
      aria-label={user ? 'Submit a document' : 'Sign up'}
      title={user ? 'Submit a document' : 'Sign up free'}
    >
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
        <text
          x="110" y="102"
          textAnchor="middle"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="34"
          fontWeight="600"
          fill="#E4C766"
        >
          TDP
        </text>
        <text
          x="110" y="128"
          textAnchor="middle"
          fontFamily="'IBM Plex Mono', monospace"
          fontSize="12"
          letterSpacing="2"
          fill="#C9A227"
        >
          {user ? 'SUBMIT' : 'JOIN'}
        </text>
      </svg>
    </Link>
  )
}
