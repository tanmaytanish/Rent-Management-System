import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
  const [mobileNumber, setMobileNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { login, isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'tenant' ? '/tenant/dashboard' : '/owner/dashboard'} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const loggedInUser = await login(mobileNumber.trim(), password)
      const fromPath = location.state?.from?.pathname

      const roleHome = loggedInUser.role === 'tenant' ? '/tenant/dashboard' : '/owner/dashboard'
      const destination = roleHome

      window.location.assign(destination)
    } catch (loginError) {
      setError(
        loginError?.response?.data?.error || 'Login failed. Please check your credentials.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="RentEase" subtitle="Sign in to your account">
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700" htmlFor="mobileNumber">
            Mobile Number
          </label>
          <input
            id="mobileNumber"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            required
            value={mobileNumber}
            onChange={(event) => setMobileNumber(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
            placeholder="Enter 10-digit mobile"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
            placeholder="Enter password"
          />
        </div>

        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="text-center text-sm text-slate-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-cyan-700 hover:text-cyan-800">
            Register
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}

export default LoginPage
