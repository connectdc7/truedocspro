import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isStaff, setIsStaff] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true

    async function loadRoleFlags(userId) {
      if (!userId) {
        setIsStaff(false)
        setIsAdmin(false)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('is_staff, is_admin')
        .eq('id', userId)
        .maybeSingle()
      if (active) {
        setIsStaff(Boolean(data?.is_staff))
        setIsAdmin(Boolean(data?.is_admin))
      }
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadRoleFlags(data.session?.user?.id)
      if (active) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      await loadRoleFlags(newSession?.user?.id)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    isStaff,
    isAdmin,
    loading,
    signOut: () => supabase.auth.signOut(),
  }

  // Auto sign-out after 3 minutes of inactivity, while logged in.
  useEffect(() => {
    if (!session) return

    const IDLE_LIMIT_MS = 3 * 60 * 1000
    let timer

    const handleIdle = () => {
      sessionStorage.setItem('idle_logout', '1')
      supabase.auth.signOut()
    }

    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(handleIdle, IDLE_LIMIT_MS)
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      clearTimeout(timer)
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetTimer))
    }
  }, [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
