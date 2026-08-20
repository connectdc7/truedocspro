import Navbar from './Navbar'
import Footer from './Footer'
import BouncingSeal from './BouncingSeal'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <BouncingSeal />
    </div>
  )
}
