import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import SealGraphic from './SealGraphic'

const SIZE = 132
const SPEED = 1.8
const START_DELAY_MS = 900
const MIN_Y = 20 // keeps clear of a phone notch/status bar when installed as an app

// Bounces freely around the screen for logged-out visitors, linking to
// submit-document. Once someone logs in, this renders nothing — the
// seal moves into the navbar itself (see SealMenu) as their account hub.
export default function BouncingSeal() {
  const { user } = useAuth()
  const wrapRef = useRef(null)
  const posRef = useRef({ x: 0, y: 0 })
  const velRef = useRef({ x: SPEED, y: SPEED * 0.8 })
  const pausedRef = useRef(false)
  const draggingRef = useRef(false)
  const draggedRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const [, forceRender] = useState(0)

  useEffect(() => {
    if (user) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const startX = Math.max(window.innerWidth - SIZE - 80, window.innerWidth * 0.62)
    const startY = 130
    posRef.current = { x: startX, y: startY }
    forceRender((n) => n + 1)
    if (wrapRef.current) wrapRef.current.style.transform = `translate(${startX}px, ${startY}px)`

    if (prefersReducedMotion) return

    let frame
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
        if (nextY <= MIN_Y) { nextY = MIN_Y; vel.y = Math.abs(vel.y) }
        else if (nextY >= maxY) { nextY = maxY; vel.y = -Math.abs(vel.y) }

        posRef.current = { x: nextX, y: nextY }
        if (wrapRef.current) wrapRef.current.style.transform = `translate(${nextX}px, ${nextY}px)`
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    const startTimer = setTimeout(() => { started = true }, START_DELAY_MS)

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

  if (user) return null

  const DRAG_THRESHOLD = 4

  const handlePointerDown = (e) => {
    draggingRef.current = true
    draggedRef.current = false
    pausedRef.current = true
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
    const nextY = Math.min(Math.max(e.clientY - dragOffsetRef.current.y, MIN_Y), window.innerHeight - SIZE)
    posRef.current = { x: nextX, y: nextY }
    if (wrapRef.current) wrapRef.current.style.transform = `translate(${nextX}px, ${nextY}px)`
  }

  const handlePointerUp = () => {
    draggingRef.current = false
    pausedRef.current = false
  }

  const handleClickCapture = (e) => {
    if (draggedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      draggedRef.current = false
    }
  }

  return (
    <Link
      to="/portal/new"
      ref={wrapRef}
      onMouseEnter={() => { if (!draggingRef.current) pausedRef.current = true }}
      onMouseLeave={() => { if (!draggingRef.current) pausedRef.current = false }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClickCapture={handleClickCapture}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: SIZE,
        height: SIZE,
        zIndex: 60,
        cursor: 'grab',
        touchAction: 'none',
        willChange: 'transform',
      }}
      className="drop-shadow-lg transition-transform hover:scale-110"
      aria-label="Submit a document — drag to move"
      title="Submit a document — drag to move"
    >
      <SealGraphic size={SIZE} label="SUBMIT" />
    </Link>
  )
}
