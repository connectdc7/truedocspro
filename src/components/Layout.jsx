import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import BouncingSeal from './BouncingSeal'

export default function Layout({ children }) {
  const location = useLocation()
  const isStaffArea = location.pathname.startsWith('/staff')

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      {!isStaffArea && <BouncingSeal />}
    </div>
  )
}
