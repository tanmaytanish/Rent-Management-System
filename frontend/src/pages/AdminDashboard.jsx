import { useEffect, useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Shield, Users, Building2, Home, FileText, CreditCard, TrendingUp,
  IndianRupee, Trash2, Check, X, AlertTriangle, UserCheck, Receipt
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

/* ── tiny reusable pieces ─────────────────────────── */
function StatCard({ Icon, iconCls, label, value }) {
  return (
    <div className="card card-hover" style={{ padding:'1rem',display:'flex',alignItems:'center',gap:'0.875rem' }}>
      <div className={`stat-icon ${iconCls}`}><Icon size={20} strokeWidth={1.8}/></div>
      <div>
        <p style={{ fontSize:'0.68rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em' }}>{label}</p>
        <p className="stat-value" style={{ fontSize:'1.5rem' }}>{value}</p>
      </div>
    </div>
  )
}

function RoleBadge({ role }) {
  const map = { admin: 'badge-admin', owner: 'badge-accent', tenant: 'badge-paid' }
  return <span className={`badge ${map[role]||'badge-accent'}`}>{role}</span>
}

function StatusBadge({ status }) {
  const cls = status==='paid'||status==='approved'||status==='active'?'badge-paid':status==='pending'?'badge-pending':'badge-unpaid'
  return <span className={`badge ${cls}`}>{status}</span>
}

function ConfirmButton({ onConfirm, label='Delete', confirmLabel='Confirm?', icon, disabled }) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) return (
    <div style={{ display:'flex',gap:'0.25rem' }}>
      <button className="btn btn-danger btn-sm" onClick={()=>{setConfirming(false);onConfirm()}} disabled={disabled}>{confirmLabel}</button>
      <button className="btn btn-ghost btn-sm" onClick={()=>setConfirming(false)}>Cancel</button>
    </div>
  )
  return <button className="btn btn-danger btn-sm" onClick={()=>setConfirming(true)} disabled={disabled}>{icon}{label}</button>
}

/* ── main component ───────────────────────────────── */
export default function AdminDashboard() {
  const { user } = useAuth()
  const location = useLocation()
  const [activeSection, setActiveSection] = useState('overview')

  // Data
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [properties, setProperties] = useState([])
  const [tenants, setTenants] = useState([])
  const [rentBills, setRentBills] = useState([])
  const [electricityBills, setElectricityBills] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState({})
  const [processing, setProcessing] = useState(new Set())

  // Hash-based navigation
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    setActiveSection(hash || 'overview')
  }, [location.hash])

  // Fetch stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try { const r = await api.get('/api/admin/stats'); setStats(r.data.stats) }
      catch(e) { toast.error('Failed to load stats') }
    }
    fetchStats()
  }, [])

  // Lazy-load data per section
  useEffect(() => {
    const loaders = {
      users: async () => { setLoading(p=>({...p,users:true})); try{const r=await api.get('/api/admin/users');setUsers(r.data.users)}catch{toast.error('Failed to load users')}finally{setLoading(p=>({...p,users:false}))} },
      properties: async () => { setLoading(p=>({...p,properties:true})); try{const r=await api.get('/api/admin/properties');setProperties(r.data.properties)}catch{toast.error('Failed to load properties')}finally{setLoading(p=>({...p,properties:false}))} },
      tenants: async () => { setLoading(p=>({...p,tenants:true})); try{const r=await api.get('/api/admin/tenants');setTenants(r.data.tenants)}catch{toast.error('Failed to load tenants')}finally{setLoading(p=>({...p,tenants:false}))} },
      bills: async () => { setLoading(p=>({...p,bills:true})); try{const r=await api.get('/api/admin/bills');setRentBills(r.data.rentBills);setElectricityBills(r.data.electricityBills)}catch{toast.error('Failed to load bills')}finally{setLoading(p=>({...p,bills:false}))} },
      payments: async () => { setLoading(p=>({...p,payments:true})); try{const r=await api.get('/api/admin/payments');setPayments(r.data.payments)}catch{toast.error('Failed to load payments')}finally{setLoading(p=>({...p,payments:false}))} },
    }
    if (loaders[activeSection]) loaders[activeSection]()
  }, [activeSection])

  // Actions
  const handleDeleteUser = async (id) => {
    setProcessing(p => new Set(p).add(id))
    try { await api.delete(`/api/admin/users/${id}`); setUsers(u=>u.filter(x=>x._id!==id)); toast.success('User deleted'); const r=await api.get('/api/admin/stats');setStats(r.data.stats) }
    catch(e) { toast.error(e?.response?.data?.error||'Failed') }
    finally { setProcessing(p=>{const n=new Set(p);n.delete(id);return n}) }
  }

  const handleDeleteProperty = async (id) => {
    setProcessing(p => new Set(p).add(id))
    try { await api.delete(`/api/admin/properties/${id}`); setProperties(p=>p.filter(x=>x._id!==id)); toast.success('Property deleted'); const r=await api.get('/api/admin/stats');setStats(r.data.stats) }
    catch(e) { toast.error(e?.response?.data?.error||'Failed') }
    finally { setProcessing(p=>{const n=new Set(p);n.delete(id);return n}) }
  }

  const handleApprovePayment = async (id) => {
    setProcessing(p => new Set(p).add(id))
    try { await api.patch(`/api/admin/payments/${id}/approve`); setPayments(ps=>ps.map(p=>p._id===id?{...p,status:'approved'}:p)); toast.success('Payment approved') }
    catch(e) { toast.error(e?.response?.data?.error||'Failed') }
    finally { setProcessing(p=>{const n=new Set(p);n.delete(id);return n}) }
  }

  const handleRejectPayment = async (id) => {
    setProcessing(p => new Set(p).add(id))
    try { await api.patch(`/api/admin/payments/${id}/reject`); setPayments(ps=>ps.map(p=>p._id===id?{...p,status:'rejected'}:p)); toast.success('Payment rejected') }
    catch(e) { toast.error(e?.response?.data?.error||'Failed') }
    finally { setProcessing(p=>{const n=new Set(p);n.delete(id);return n}) }
  }

  const Loader = () => <div style={{display:'flex',alignItems:'center',gap:'0.5rem',color:'var(--text-muted)',fontSize:'0.85rem',padding:'1rem 0'}}><span className="spinner"/>Loading…</div>
  const Empty = ({ Icon: I, text }) => (
    <div style={{textAlign:'center',padding:'2.5rem'}}>
      <I size={36} style={{color:'var(--text-muted)',margin:'0 auto 0.75rem'}} strokeWidth={1.2}/>
      <p style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>{text}</p>
    </div>
  )

  return (
    <AppLayout>
      <div style={{ display:'flex',flexDirection:'column',gap:'1.25rem' }}>

        {/* Header */}
        <div className="anim-fade-up">
          <h1 className="page-title" style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <Shield size={22} strokeWidth={2} style={{color:'var(--accent)'}}/> Admin <span style={{color:'var(--accent)'}}>Panel</span>
          </h1>
          <p style={{ color:'var(--text-muted)',fontSize:'0.84rem',marginTop:'0.25rem' }}>
            Full system control — manage users, properties, bills & payments.
          </p>
        </div>

        {/* Stats row (always visible) */}
        {stats && (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'0.75rem' }}>
            <StatCard Icon={Users}      iconCls="stat-icon-indigo"  label="Total Users"  value={stats.users} />
            <StatCard Icon={Building2}  iconCls="stat-icon-sky"     label="Properties"   value={stats.properties} />
            <StatCard Icon={Home}       iconCls="stat-icon-emerald" label="Active Tenants" value={stats.activeTenants} />
            <StatCard Icon={FileText}   iconCls="stat-icon-amber"   label="Total Bills"  value={stats.totalBills} />
            <StatCard Icon={CreditCard} iconCls="stat-icon-rose"    label="Pending Pay"  value={stats.pendingPayments} />
            <StatCard Icon={IndianRupee} iconCls="stat-icon-indigo" label="Revenue"      value={`₹${(stats.totalRevenue||0).toLocaleString()}`} />
          </div>
        )}

        {/* ── OVERVIEW ─────────────────────── */}
        {activeSection==='overview' && (
          <div className="anim-fade-up anim-delay-1">
            <h2 className="section-title" style={{marginBottom:'0.75rem'}}>Quick Actions</h2>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'0.75rem' }}>
              {[
                { Icon: Shield,     label:'All Users',    desc:`${stats?.users||0} registered`, hash:'#users',      color:'#6366f1', bg:'#eef2ff' },
                { Icon: Building2,  label:'Properties',   desc:`${stats?.properties||0} total`, hash:'#properties', color:'#0284c7', bg:'#f0f9ff' },
                { Icon: Users,      label:'Tenants',      desc:`${stats?.activeTenants||0} active`, hash:'#tenants', color:'#059669', bg:'#ecfdf5' },
                { Icon: Receipt,    label:'All Bills',    desc:`${stats?.totalBills||0} generated`, hash:'#bills',   color:'#d97706', bg:'#fffbeb' },
                { Icon: CreditCard, label:'Payments',     desc:`${stats?.pendingPayments||0} pending`, hash:'#payments', color:'#e11d48', bg:'#fff1f2' },
                { Icon: TrendingUp, label:'Revenue',      desc:`₹${(stats?.totalRevenue||0).toLocaleString()}`, hash:'#payments', color:'#7c3aed', bg:'#f5f3ff' },
              ].map((a,i)=>(
                <a key={i} href={`/admin/dashboard${a.hash}`}
                  onClick={(e)=>{e.preventDefault();setActiveSection(a.hash.slice(1));window.history.replaceState(null,'',`/admin/dashboard${a.hash}`)}}
                  className="card-hover"
                  style={{ display:'flex',flexDirection:'column',gap:'0.5rem',padding:'1rem',borderRadius:'var(--radius-md)',border:'1px solid var(--border-light)',background:'#fff',textDecoration:'none',cursor:'pointer',transition:'var(--transition)' }}
                >
                  <div style={{ width:36,height:36,borderRadius:'var(--radius-sm)',background:a.bg,display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <a.Icon size={18} strokeWidth={1.8} style={{color:a.color}}/>
                  </div>
                  <div>
                    <p style={{fontSize:'0.82rem',fontWeight:700,color:'var(--text-primary)',letterSpacing:'-0.01em'}}>{a.label}</p>
                    <p style={{fontSize:'0.68rem',color:'var(--text-muted)',marginTop:'0.1rem'}}>{a.desc}</p>
                  </div>
                </a>
              ))}
            </div>

            {stats && (
              <div className="card anim-fade-up anim-delay-2" style={{padding:'1.25rem',marginTop:'1.25rem'}}>
                <h2 className="section-title" style={{marginBottom:'0.75rem'}}>System Overview</h2>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'0.75rem'}}>
                  {[
                    {label:'Owners',val:stats.owners,color:'var(--accent)'},
                    {label:'Tenants',val:stats.tenants,color:'var(--success)'},
                    {label:'Flats',val:stats.flats,color:'#0284c7'},
                    {label:'Rent Bills',val:stats.rentBills,color:'var(--warning)'},
                    {label:'Electricity Bills',val:stats.electricityBills,color:'#7c3aed'},
                    {label:'Total Payments',val:stats.payments,color:'var(--danger)'},
                  ].map((s,i)=>(
                    <div key={i} style={{padding:'0.875rem',borderRadius:'var(--radius-sm)',border:'1px solid var(--border-light)',background:'var(--bg-inset)'}}>
                      <p style={{fontSize:'0.68rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.label}</p>
                      <p style={{fontSize:'1.35rem',fontWeight:800,color:s.color,marginTop:'0.2rem'}}>{s.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── USERS ────────────────────────── */}
        {activeSection==='users' && (
          <div className="card anim-fade-up" style={{padding:'1.5rem'}}>
            <h2 className="section-title" style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'1rem'}}>
              <Shield size={18} strokeWidth={2}/> All Users
            </h2>
            {loading.users ? <Loader/> : users.length===0 ? <Empty Icon={Users} text="No users found."/> : (
              <div style={{overflowX:'auto'}}>
                <table className="tbl">
                  <thead><tr><th>Name</th><th>Mobile</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td style={{fontWeight:600}}>{u.name}</td>
                        <td>{u.mobileNumber}</td>
                        <td><RoleBadge role={u.role}/></td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          {u.role==='admin' ? (
                            <span style={{fontSize:'0.72rem',color:'var(--text-muted)',fontStyle:'italic'}}>Protected</span>
                          ) : (
                            <ConfirmButton onConfirm={()=>handleDeleteUser(u._id)} disabled={processing.has(u._id)} icon={<Trash2 size={12} style={{marginRight:3}}/>}/>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── PROPERTIES ───────────────────── */}
        {activeSection==='properties' && (
          <div className="card anim-fade-up" style={{padding:'1.5rem'}}>
            <h2 className="section-title" style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'1rem'}}>
              <Building2 size={18} strokeWidth={2}/> All Properties
            </h2>
            {loading.properties ? <Loader/> : properties.length===0 ? <Empty Icon={Building2} text="No properties found."/> : (
              <div style={{overflowX:'auto'}}>
                <table className="tbl">
                  <thead><tr><th>Property</th><th>Address</th><th>Owner</th><th>Flats</th><th>Occupied</th><th>Actions</th></tr></thead>
                  <tbody>
                    {properties.map(p => (
                      <tr key={p._id}>
                        <td style={{fontWeight:600}}>{p.name}</td>
                        <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.address}</td>
                        <td>{p.ownerId?.name || '—'}</td>
                        <td>{p.flatCount}</td>
                        <td>{p.occupiedCount}</td>
                        <td><ConfirmButton onConfirm={()=>handleDeleteProperty(p._id)} disabled={processing.has(p._id)} icon={<Trash2 size={12} style={{marginRight:3}}/>}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TENANTS ──────────────────────── */}
        {activeSection==='tenants' && (
          <div className="card anim-fade-up" style={{padding:'1.5rem'}}>
            <h2 className="section-title" style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'1rem'}}>
              <UserCheck size={18} strokeWidth={2}/> All Tenants
            </h2>
            {loading.tenants ? <Loader/> : tenants.length===0 ? <Empty Icon={Users} text="No tenants found."/> : (
              <div style={{overflowX:'auto'}}>
                <table className="tbl">
                  <thead><tr><th>Tenant</th><th>Mobile</th><th>Owner</th><th>Property</th><th>Flat</th><th>Rent</th><th>Status</th></tr></thead>
                  <tbody>
                    {tenants.map(t => (
                      <tr key={t._id}>
                        <td style={{fontWeight:600}}>{t.userId?.name||'—'}</td>
                        <td>{t.userId?.mobileNumber||'—'}</td>
                        <td>{t.ownerId?.name||'—'}</td>
                        <td>{t.propertyId?.name||'—'}</td>
                        <td>{t.flatId?.flatNumber||'—'}</td>
                        <td>₹{t.flatId?.rentAmount||0}</td>
                        <td><StatusBadge status={t.status}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── BILLS ────────────────────────── */}
        {activeSection==='bills' && (
          <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
            <div className="card anim-fade-up" style={{padding:'1.5rem'}}>
              <h2 className="section-title" style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'1rem'}}>
                <Home size={18} strokeWidth={2}/> Rent Bills ({rentBills.length})
              </h2>
              {loading.bills ? <Loader/> : rentBills.length===0 ? <Empty Icon={FileText} text="No rent bills."/> : (
                <div style={{overflowX:'auto'}}>
                  <table className="tbl">
                    <thead><tr><th>Month</th><th>Tenant</th><th>Rent</th><th>Water</th><th>Total</th><th>Status</th></tr></thead>
                    <tbody>
                      {rentBills.map(b => (
                        <tr key={b._id}>
                          <td style={{fontWeight:600}}>{b.month}</td>
                          <td>{b.tenantId?.userId?.name || b.tenantId?.name || '—'}</td>
                          <td>₹{b.rentAmount}</td>
                          <td>₹{b.waterAmount}</td>
                          <td style={{fontWeight:700}}>₹{b.totalAmount}</td>
                          <td><StatusBadge status={b.status}/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card anim-fade-up anim-delay-1" style={{padding:'1.5rem'}}>
              <h2 className="section-title" style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'1rem'}}>
                <AlertTriangle size={18} strokeWidth={2}/> Electricity Bills ({electricityBills.length})
              </h2>
              {loading.bills ? <Loader/> : electricityBills.length===0 ? <Empty Icon={FileText} text="No electricity bills."/> : (
                <div style={{overflowX:'auto'}}>
                  <table className="tbl">
                    <thead><tr><th>Month</th><th>Tenant</th><th>Prev</th><th>Curr</th><th>Units</th><th>Total</th><th>Status</th></tr></thead>
                    <tbody>
                      {electricityBills.map(b => (
                        <tr key={b._id}>
                          <td style={{fontWeight:600}}>{b.month}</td>
                          <td>{b.tenantId?.userId?.name || b.tenantId?.name || '—'}</td>
                          <td>{b.prevReading}</td>
                          <td>{b.currReading}</td>
                          <td>{b.units}</td>
                          <td style={{fontWeight:700}}>₹{b.totalAmount}</td>
                          <td><StatusBadge status={b.status}/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PAYMENTS ─────────────────────── */}
        {activeSection==='payments' && (
          <div className="card anim-fade-up" style={{padding:'1.5rem'}}>
            <h2 className="section-title" style={{display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'1rem'}}>
              <CreditCard size={18} strokeWidth={2}/> All Payments ({payments.length})
            </h2>
            {loading.payments ? <Loader/> : payments.length===0 ? <Empty Icon={CreditCard} text="No payments found."/> : (
              <div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
                {payments.map(pay => {
                  const name = pay.tenantId?.userId?.name || 'Unknown'
                  const mobile = pay.tenantId?.userId?.mobileNumber || '—'
                  const owner = pay.ownerId?.name || '—'
                  const busy = processing.has(pay._id)
                  return (
                    <div key={pay._id} className="bill-inner">
                      <div style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',gap:'0.5rem'}}>
                        <div>
                          <p style={{fontWeight:700,color:'var(--text-primary)'}}>{name}</p>
                          <p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{mobile} · Owner: {owner}</p>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <p style={{fontSize:'1.25rem',fontWeight:800,color:'var(--text-primary)'}}>₹{pay.totalAmount?.toFixed(2)}</p>
                          <div style={{display:'flex',gap:'0.25rem',justifyContent:'flex-end',marginTop:'0.15rem'}}>
                            <span className="badge badge-accent">{pay.paymentType}</span>
                            <StatusBadge status={pay.status}/>
                          </div>
                        </div>
                      </div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:'0.375rem',marginTop:'0.625rem'}}>
                        {pay.bills?.map((b,i)=>(
                          <span key={i} style={{padding:'0.2rem 0.5rem',borderRadius:'var(--radius-full)',fontSize:'0.68rem',fontWeight:600,background:'var(--accent-subtle)',border:'1px solid #c7d2fe',color:'var(--accent)'}}>
                            {b.month} · {b.billType} · ₹{b.amount}
                          </span>
                        ))}
                      </div>
                      {pay.screenshotUrl && (
                        <div style={{marginTop:'0.625rem'}}>
                          <a href={pay.screenshotUrl} target="_blank" rel="noopener noreferrer">
                            <img src={pay.screenshotUrl} alt="Screenshot" style={{height:72,borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',objectFit:'cover'}}/>
                          </a>
                        </div>
                      )}
                      {pay.status==='pending' && (
                        <div style={{display:'flex',gap:'0.5rem',marginTop:'0.75rem',flexWrap:'wrap'}}>
                          <button className="btn btn-success btn-sm" disabled={busy} onClick={()=>handleApprovePayment(pay._id)}>
                            <Check size={14}/>{busy?'Processing…':'Approve'}
                          </button>
                          <button className="btn btn-danger btn-sm" disabled={busy} onClick={()=>handleRejectPayment(pay._id)}>
                            <X size={14}/>{busy?'Processing…':'Reject'}
                          </button>
                        </div>
                      )}
                      {pay.reviewNote && <p style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:'0.4rem',fontStyle:'italic'}}>Note: {pay.reviewNote}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
