import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Services from './pages/Services'
import HowItWorks from './pages/HowItWorks'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import InstallApp from './pages/InstallApp'
import ProtectedRoute from './components/ProtectedRoute'
import StaffRoute from './components/StaffRoute'
import AdminRoute from './components/AdminRoute'

// Lazy-loaded: everything behind a login wall. Keeping these out of the
// main bundle means public marketing pages (the ones search engines and
// first-time visitors hit) load faster.
const Portal = lazy(() => import('./pages/Portal'))
const Account = lazy(() => import('./pages/Account'))
const NewOrder = lazy(() => import('./pages/NewOrder'))
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'))
const StaffOrderDetail = lazy(() => import('./pages/StaffOrderDetail'))
const BlogList = lazy(() => import('./pages/BlogList'))
const BlogPost = lazy(() => import('./pages/BlogPost'))
const StaffBlogList = lazy(() => import('./pages/StaffBlogList'))
const StaffBlogEditor = lazy(() => import('./pages/StaffBlogEditor'))
const StaffTeam = lazy(() => import('./pages/StaffTeam'))
const StaffEmbassyFees = lazy(() => import('./pages/StaffEmbassyFees'))
const StaffSosFees = lazy(() => import('./pages/StaffSosFees'))
const StaffShippingFees = lazy(() => import('./pages/StaffShippingFees'))
const StaffSubscribers = lazy(() => import('./pages/StaffSubscribers'))
const StaffSubscriberDetail = lazy(() => import('./pages/StaffSubscriberDetail'))

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <span className="font-mono text-sm text-[var(--slate)]">Loading…</span>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
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
          path="/staff/subscribers"
          element={
            <AdminRoute>
              <StaffSubscribers />
            </AdminRoute>
          }
        />
        <Route
          path="/staff/subscribers/:id"
          element={
            <AdminRoute>
              <StaffSubscriberDetail />
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
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/portal"
          element={
            <ProtectedRoute>
              <Portal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
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
    </Suspense>
  )
}
