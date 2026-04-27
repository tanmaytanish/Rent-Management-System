import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import AdminDashboard from './pages/AdminDashboard'
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

  if (user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
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
    <div>
      <Toaster position="top-right" toastOptions={{
        duration: 3500,
        style: { background: '#fff', color: '#0f172a', borderRadius: '12px', fontSize: '0.84rem', fontWeight: 500, boxShadow: '0 8px 30px rgba(15,23,42,0.1), 0 2px 8px rgba(15,23,42,0.06)', border: '1px solid #e8ecf4', fontFamily: 'Inter, sans-serif', padding: '12px 16px' },
        success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
        error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
      }} />
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
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
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
