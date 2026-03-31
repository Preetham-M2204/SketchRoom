import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import ToastContainer from './components/ui/Toast'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Room from './pages/Room'
import RoomAccess from './pages/RoomAccess'
import useAuthStore from './stores/useAuthStore'

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    const redirectTarget = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/login?redirect=${redirectTarget}`} replace />
  }

  return children
}

// Public Route wrapper (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (isAuthenticated) {
    const queryParams = new URLSearchParams(location.search)
    const redirectPath = queryParams.get('redirect') || '/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  return children
}

function App() {
  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:roomKey"
          element={
            <ProtectedRoute>
              <Room />
            </ProtectedRoute>
          }
        />
        <Route
          path="/r/:roomKey"
          element={
            <ProtectedRoute>
              <RoomAccess />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer />
    </>
  )
}

export default App
