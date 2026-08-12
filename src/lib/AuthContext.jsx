import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isStaff, setIsStaff] = useState(false)

  useEffect(() => {
    let active = true

    async function loadStaffFlag(userId) {
      if (!userId) {
        setIsStaff(false)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('is_staff')
        .eq('id', userId)
        .maybeSingle()
      if (active) setIsStaff(Boolean(data?.is_staff))
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadStaffFlag(data.session?.user?.id)
      if (active) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      await loadStaffFlag(newSession?.user?.id)
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
    loading,
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
