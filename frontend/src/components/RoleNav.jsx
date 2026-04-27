import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = {
  tenant: [
    { to: '/tenant/dashboard', label: 'Dashboard', icon: '⊞' },
    { to: '/bills',            label: 'My Bills',  icon: '📄' },
    { to: '/payment',          label: 'Pay Now',   icon: '💳' },
  ],
  owner: [
    { to: '/owner/dashboard', label: 'Dashboard', icon: '⊞' },
    { to: '/bills',           label: 'Bills',     icon: '📄' },
  ],
}

export default function RoleNav() {
  const { user, logout } = useAuth()
  const navigate          = useNavigate()
  const { pathname }      = useLocation()
  const [open, setOpen]   = useState(false)

  const links = NAV_LINKS[user?.role] || []

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(15,23,42,0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(148,163,184,0.1)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 800, color: '#fff',
            boxShadow: '0 0 14px rgba(99,102,241,0.5)',
          }}>R</div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f1f5f9', letterSpacing: '-0.02em' }}>
            Rent<span style={{ color: '#818cf8' }}>Ease</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="desktop-nav">
          {links.map(({ to, label, icon }) => {
            const active = pathname === to
            return (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.45rem 0.875rem',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                color: active ? '#fff' : '#94a3b8',
                background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
                border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color='#f1f5f9'; e.currentTarget.style.background='rgba(148,163,184,0.08)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.background='transparent' } }}
              >
                <span style={{ fontSize: '0.8rem' }}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* User chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 99,
            background: 'rgba(30,41,59,0.8)',
            border: '1px solid rgba(148,163,184,0.12)',
          }} className="user-chip">
            <div style={{
              width: 28, height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, color: '#fff',
            }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9' }}>{user?.name}</p>
              <p style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'capitalize' }}>{user?.role}</p>
            </div>
          </div>

          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ display: 'flex' }}>
            <span>⎋</span> Logout
          </button>

          {/* Hamburger */}
          <button
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
            style={{
              display: 'none',
              flexDirection: 'column', gap: 5, padding: '0.5rem',
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}
            className="hamburger"
          >
            {[0,1,2].map(i => (
              <span key={i} style={{
                display: 'block', width: 22, height: 2,
                borderRadius: 2, background: '#94a3b8',
                transition: 'all 0.2s',
                transform: open
                  ? i===0 ? 'translateY(7px) rotate(45deg)'
                  : i===1 ? 'opacity: 0'
                  : 'translateY(-7px) rotate(-45deg)'
                  : 'none',
                opacity: open && i===1 ? 0 : 1,
              }} />
            ))}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav style={{
          borderTop: '1px solid rgba(148,163,184,0.08)',
          background: 'rgba(15,23,42,0.97)',
          padding: '0.75rem 1rem 1rem',
          display: 'flex', flexDirection: 'column', gap: '0.25rem',
        }} className="mobile-nav">
          {links.map(({ to, label, icon }) => {
            const active = pathname === to
            return (
              <Link key={to} to={to}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 10,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: active ? '#fff' : '#94a3b8',
                  background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                  border: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                }}
              >
                <span>{icon}</span> {label}
              </Link>
            )
          })}
          <div className="divider" style={{ margin: '0.5rem 0' }} />
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: 10,
            fontSize: '0.875rem',
            fontWeight: 500,
            background: 'rgba(244,63,94,0.08)',
            border: '1px solid rgba(244,63,94,0.2)',
            color: '#fda4af',
            cursor: 'pointer',
          }}>
            ⎋ Logout
          </button>
        </nav>
      )}

      {/* Responsive styles via style tag */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .user-chip   { display: none !important; }
          .hamburger   { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-nav  { display: none !important; }
        }
      `}</style>
    </header>
  )
}
