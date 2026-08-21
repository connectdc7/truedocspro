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
import StaffShippingFees from './pages/StaffShippingFees'
import ProtectedRoute from './components/ProtectedRoute'
import StaffRoute from './components/StaffRoute'
import AdminRoute from './components/AdminRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/services" element={<Services />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/contact" element={<Contact />} />
      <Route
        path="/blog"
        element={
          <ProtectedRoute>
            <BlogList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/blog/:slug"
        element={
          <ProtectedRoute>
            <BlogPost />
          </ProtectedRoute>
        }
      />
      <Route path="/app" element={<InstallApp />} />
      <Route
        path="/staff/blog"
        element={
          <AdminRoute>
            <StaffBlogList />
          </AdminRoute>
        }
      />
      <Route
        path="/staff/blog/:id"
        element={
          <AdminRoute>
            <StaffBlogEditor />
          </AdminRoute>
        }
      />
      <Route
        path="/staff/team"
        element={
          <AdminRoute>
            <StaffTeam />
          </AdminRoute>
        }
      />
      <Route
        path="/staff/embassy-fees"
        element={
          <AdminRoute>
            <StaffEmbassyFees />
          </AdminRoute>
        }
      />
      <Route
        path="/staff/sos-fees"
        element={
          <AdminRoute>
            <StaffSosFees />
          </AdminRoute>
        }
      />
      <Route
        path="/staff/shipping-fees"
        element={
          <AdminRoute>
            <StaffShippingFees />
          </AdminRoute>
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
