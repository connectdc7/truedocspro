import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Services from './pages/Services'
import HowItWorks from './pages/HowItWorks'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Portal from './pages/Portal'
import NewOrder from './pages/NewOrder'
import OrderDetail from './pages/OrderDetail'
import InstallApp from './pages/InstallApp'
import StaffDashboard from './pages/StaffDashboard'
import StaffOrderDetail from './pages/StaffOrderDetail'
import BlogList from './pages/BlogList'
import BlogPost from './pages/BlogPost'
import StaffBlogList from './pages/StaffBlogList'
import StaffBlogEditor from './pages/StaffBlogEditor'
import StaffTeam from './pages/StaffTeam'
import StaffEmbassyFees from './pages/StaffEmbassyFees'
import StaffSosFees from './pages/StaffSosFees'
import ProtectedRoute from './components/ProtectedRoute'
import StaffRoute from './components/StaffRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/services" element={<Services />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/blog" element={<BlogList />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/app" element={<InstallApp />} />
      <Route
        path="/staff/blog"
        element={
          <StaffRoute>
            <StaffBlogList />
          </StaffRoute>
        }
      />
      <Route
        path="/staff/blog/:id"
        element={
          <StaffRoute>
            <StaffBlogEditor />
          </StaffRoute>
        }
      />
      <Route
        path="/staff/team"
        element={
          <StaffRoute>
            <StaffTeam />
          </StaffRoute>
        }
      />
      <Route
        path="/staff/embassy-fees"
        element={
          <StaffRoute>
            <StaffEmbassyFees />
          </StaffRoute>
        }
      />
      <Route
        path="/staff/sos-fees"
        element={
          <StaffRoute>
            <StaffSosFees />
          </StaffRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <StaffRoute>
            <StaffDashboard />
          </StaffRoute>
        }
      />
      <Route
        path="/staff/orders/:id"
        element={
          <StaffRoute>
            <StaffOrderDetail />
          </StaffRoute>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/portal"
        element={
          <ProtectedRoute>
            <Portal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/new"
        element={
          <ProtectedRoute>
            <NewOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/orders/:id"
        element={
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
