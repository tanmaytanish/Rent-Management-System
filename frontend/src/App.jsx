import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import BillsPage from './pages/BillsPage'
import LoginPage from './pages/LoginPage'
import OwnerDashboard from './pages/OwnerDashboard'
import PaymentPage from './pages/PaymentPage'
import RegisterPage from './pages/RegisterPage'
import TenantDashboard from './pages/TenantDashboard'

function RoleLanding() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'tenant') {
    return <Navigate to="/tenant/dashboard" replace />
  }

  if (user.role === 'owner') {
    return <Navigate to="/owner/dashboard" replace />
  }

  return <Navigate to="/login" replace />
}

function App() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleLanding />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner"
          element={<Navigate to="/owner/dashboard" replace />}
        />

        <Route
          path="/owner/dashboard"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tenant"
          element={<Navigate to="/tenant/dashboard" replace />}
        />

        <Route
          path="/tenant/dashboard"
          element={
            <ProtectedRoute allowedRoles={['tenant']}>
              <TenantDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bills"
          element={
            <ProtectedRoute allowedRoles={['owner', 'tenant']}>
              <BillsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment"
          element={
            <ProtectedRoute allowedRoles={['tenant']}>
              <PaymentPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
