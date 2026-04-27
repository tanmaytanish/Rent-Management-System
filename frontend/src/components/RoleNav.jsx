import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function NavLink({ to, label }) {
  const { pathname } = useLocation()
  const active = pathname === to

  return (
    <Link
      to={to}
      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-slate-900 text-white'
          : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900'
      }`}
    >
      {label}
    </Link>
  )
}

function RoleNav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">RentEase</p>
          <p className="text-base font-semibold text-slate-900">
            Welcome, {user?.name || 'User'}
          </p>
        </div>

        <nav className="flex items-center gap-2">
          {user?.role === 'tenant' ? (
            <>
              <NavLink to="/tenant/dashboard" label="Tenant Dashboard" />
              <NavLink to="/bills" label="Bills" />
            </>
          ) : (
            <>
              <NavLink to="/owner/dashboard" label="Owner Dashboard" />
              <NavLink to="/bills" label="Bills" />
            </>
          )}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Logout
        </button>
      </div>
    </header>
  )
}

export default RoleNav
