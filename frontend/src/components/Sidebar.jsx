import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, Users, FileText, CreditCard, LogOut, Wallet, Shield, Receipt } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ICON_MAP = {
  Dashboard: LayoutDashboard,
  Properties: Building2,
  Tenants: Users,
  Bills: FileText,
  'My Bills': FileText,
  Payments: CreditCard,
  'Pay Now': Wallet,
  'All Users': Shield,
  'All Bills': Receipt,
}

const OWNER_LINKS = [
  { section: 'Main' },
  { to: '/owner/dashboard',           label: 'Dashboard',  iconKey: 'Dashboard' },
  { to: '/owner/dashboard#properties',label: 'Properties', iconKey: 'Properties' },
  { to: '/owner/dashboard#tenants',   label: 'Tenants',    iconKey: 'Tenants' },
  { section: 'Billing' },
  { to: '/bills',                      label: 'Bills',      iconKey: 'Bills' },
  { to: '/owner/dashboard#payments',  label: 'Payments',   iconKey: 'Payments' },
]

const TENANT_LINKS = [
  { section: 'Main' },
  { to: '/tenant/dashboard', label: 'Dashboard', iconKey: 'Dashboard' },
  { section: 'Billing' },
  { to: '/bills',            label: 'My Bills',  iconKey: 'My Bills' },
  { to: '/payment',          label: 'Pay Now',   iconKey: 'Pay Now' },
]

const ADMIN_LINKS = [
  { section: 'Admin Panel' },
  { to: '/admin/dashboard',             label: 'Dashboard',   iconKey: 'Dashboard' },
  { to: '/admin/dashboard#users',       label: 'All Users',   iconKey: 'All Users' },
  { to: '/admin/dashboard#properties',  label: 'Properties',  iconKey: 'Properties' },
  { to: '/admin/dashboard#tenants',     label: 'Tenants',     iconKey: 'Tenants' },
  { section: 'Finance' },
  { to: '/admin/dashboard#bills',       label: 'All Bills',   iconKey: 'All Bills' },
  { to: '/admin/dashboard#payments',    label: 'Payments',    iconKey: 'Payments' },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const links = user?.role === 'admin' ? ADMIN_LINKS : user?.role === 'owner' ? OWNER_LINKS : TENANT_LINKS

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }
  const isActive = (to) => {
    if (to.includes('#')) {
      return location.pathname + location.hash === to
    }
    // For non-hash links on the same pathname, only match when there's no hash
    if (location.pathname === to) {
      return !location.hash
    }
    return false
  }

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={onClose} />

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.95rem', fontWeight: 900, color: '#fff',
            boxShadow: '0 2px 10px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}>R</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              Rent<span style={{ color: '#6366f1' }}>Ease</span>
            </p>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>Management System</p>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '0.125rem' }}>
          {links.map((item, i) => {
            if (item.section) return <div key={i} className="sidebar-section-label">{item.section}</div>
            const active = isActive(item.to)
            const Icon = ICON_MAP[item.iconKey] || LayoutDashboard
            return (
              <div className="sidebar-nav" key={item.to} style={{ padding: '1px 0.625rem' }}>
                <Link to={item.to} className={`sidebar-link ${active ? 'active' : ''}`} onClick={onClose}>
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                  {item.label}
                  {item.label === 'Pay Now' && (
                    <span style={{
                      marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700,
                      padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-full)',
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: '#fff', letterSpacing: '0.02em',
                    }}>NEW</span>
                  )}
                </Link>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-inset)', border: '1px solid var(--border-light)',
            marginBottom: '0.75rem',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.78rem', fontWeight: 700, color: '#fff', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
            }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize', fontWeight: 500 }}>
                {user?.role} account
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ width: '100%', fontSize: '0.78rem', gap: '0.35rem' }}>
            <LogOut size={14} strokeWidth={2} />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
