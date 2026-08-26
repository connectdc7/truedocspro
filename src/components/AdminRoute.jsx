import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading, needsMfaVerification, hasMfaEnrolled, mfaChecked, profile } = useAuth()

  if (loading || (isAdmin && !mfaChecked)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="font-mono text-sm text-[var(--slate)]">Loading…</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (needsMfaVerification) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/staff" replace />
  }

  if (!hasMfaEnrolled && !profile?.mfa_exempt) {
    return <Navigate to="/account" replace state={{ mfaRequired: true }} />
  }

  return children
}
