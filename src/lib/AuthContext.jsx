import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isStaff, setIsStaff] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profile, setProfile] = useState(null) // { full_name, phone, title, email }
  const [needsMfaVerification, setNeedsMfaVerification] = useState(false)

  const checkMfaLevel = useCallback(async (currentSession) => {
    if (!currentSession) {
      setNeedsMfaVerification(false)
      return
    }
    if (sessionStorage.getItem('mfa_verified_via_backup')) {
      setNeedsMfaVerification(false)
      return
    }
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    setNeedsMfaVerification(Boolean(data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'))
  }, [])

  // Backup codes aren't a real cryptographic Supabase factor, so using one
  // can't elevate the actual session assurance level. This records that
  // verification happened for this browser session (cleared on sign-out),
  // so route guards stop asking again until next login.
  const markMfaVerifiedViaBackupCode = useCallback(() => {
    sessionStorage.setItem('mfa_verified_via_backup', '1')
    setNeedsMfaVerification(false)
  }, [])

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setIsStaff(false)
      setIsAdmin(false)
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('is_staff, is_admin, full_name, phone, title, email, stripe_customer_id, card_brand, card_last4, card_exp_month, card_exp_year')
      .eq('id', userId)
      .maybeSingle()
    setIsStaff(Boolean(data?.is_staff))
    setIsAdmin(Boolean(data?.is_admin))
    setProfile(data || null)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      await checkMfaLevel(data.session)
      if (active) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      await loadProfile(newSession?.user?.id)
      await checkMfaLevel(newSession)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile, checkMfaLevel])

  const refreshMfaStatus = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    await checkMfaLevel(data.session)
  }, [checkMfaLevel])

  const refreshProfile = useCallback(() => loadProfile(session?.user?.id), [loadProfile, session])

  const value = {
    session,
    user: session?.user ?? null,
    isStaff,
    isAdmin,
    profile,
    refreshProfile,
    needsMfaVerification,
    refreshMfaStatus,
    markMfaVerifiedViaBackupCode,
    loading,
    signOut: () => {
      sessionStorage.removeItem('mfa_verified_via_backup')
      return supabase.auth.signOut()
    },
  }

  // Auto sign-out after 3 minutes of inactivity, while logged in.
  useEffect(() => {
    if (!session) return

    const IDLE_LIMIT_MS = 5 * 60 * 1000
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
