import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import { useAuth } from '../context/AuthContext'

function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { register, isAuthenticated, user } = useAuth()

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'tenant' ? '/tenant/dashboard' : '/owner/dashboard'} replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const { name, mobileNumber, password, confirmPassword } = formData

    if (!name || !mobileNumber || !password || !confirmPassword) {
      setError('All fields are required')
      return
    }

    if (password !== confirmPassword) {
      setError('Password and Confirm Password must match')
      return
    }

    try {
      setSubmitting(true)
      const registeredUser = await register({ name: name.trim(), mobileNumber: mobileNumber.trim(), password })

      const successMessage = 'Registration successful. Welcome to RentEase.'
      const destination =
        registeredUser.role === 'tenant' ? '/tenant/dashboard' : '/owner/dashboard'
      localStorage.setItem('post_login_notice', successMessage)
      window.location.assign(destination)
    } catch (registerError) {
      setError(
        registerError?.response?.data?.error ||
          'Registration failed. Please verify your details and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="RentEase" subtitle="Create your owner account">
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
            placeholder="Enter full name"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700" htmlFor="mobileNumber">
            Mobile Number
          </label>
          <input
            id="mobileNumber"
            name="mobileNumber"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            required
            value={formData.mobileNumber}
            onChange={handleChange}
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
            name="password"
            type="password"
            minLength={6}
            required
            value={formData.password}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
            placeholder="Minimum 6 characters"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            minLength={6}
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2"
            placeholder="Re-enter password"
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
          {submitting ? 'Creating account...' : 'Register'}
        </button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-cyan-700 hover:text-cyan-800">
            Login
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}

export default RegisterPage
