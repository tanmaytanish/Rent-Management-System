import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-area">
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 4, padding: '0.25rem',
            }}
          >
            <span style={{ width: 20, height: 2, background: '#374151', borderRadius: 2, display: 'block' }} />
            <span style={{ width: 16, height: 2, background: '#374151', borderRadius: 2, display: 'block' }} />
            <span style={{ width: 20, height: 2, background: '#374151', borderRadius: 2, display: 'block' }} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 800, color: '#fff',
            }}>R</div>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Rent<span style={{ color: '#6366f1' }}>Ease</span>
            </span>
          </div>

          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 700, color: '#fff',
          }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
