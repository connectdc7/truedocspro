import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import SealGraphic from './SealGraphic'

const SIZE = 72
const DOCK_TOP = 16
const DOCK_RIGHT = 24

// Logged-out visitors get a static seal in the same top-right spot the
// account menu sits in once logged in — consistent, non-moving, on
// every page. Clicking it goes to submit-document (which redirects
// through login if needed).
export default function BouncingSeal() {
  const { user } = useAuth()
  if (user) return null

  return (
    <Link
      to="/portal/new"
      style={{
        position: 'fixed',
        top: DOCK_TOP,
        right: DOCK_RIGHT,
        zIndex: 60,
      }}
      className="drop-shadow-lg transition-transform hover:scale-125"
      aria-label="Submit a document"
      title="Submit a document"
    >
      <SealGraphic size={SIZE} label="SUBMIT" />
    </Link>
  )
}
