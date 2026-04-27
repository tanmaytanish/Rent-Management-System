import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Building2, Home, Users, Clock, TrendingUp, KeyRound, LayoutDashboard, CreditCard, FileText, Check, X } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

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

function StatusBadge({ status }) {
  const cls = status==='active'?'badge-active':status==='paid'?'badge-paid':status==='pending'?'badge-pending':status==='unpaid'?'badge-unpaid':'badge-inactive'
  return <span className={`badge ${cls}`}>{status}</span>
}

function FormField({ id, label, children }) {
  return <div><label className="form-label" htmlFor={id}>{label}</label>{children}</div>
}

export default function OwnerDashboard() {
  const { user } = useAuth()
  const location = useLocation()
  const [activeSection, setActiveSection] = useState('overview')

  const [properties, setProperties] = useState([])
  const [flatsByProperty, setFlatsByProperty] = useState({})
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)

  const [propertyForm, setPropertyForm] = useState({ name:'', address:'' })
  const [flatForm, setFlatForm] = useState({ propertyId:'', flatNumber:'', rentAmount:'' })
  const [tenantForm, setTenantForm] = useState({ name:'', mobileNumber:'', propertyId:'', flatId:'', joinDate:'' })
  const [submittingProperty, setSubmittingProperty] = useState(false)
  const [submittingFlat, setSubmittingFlat] = useState(false)
  const [submittingTenant, setSubmittingTenant] = useState(false)

  const [pendingPayments, setPendingPayments] = useState([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [rejectNoteMap, setRejectNoteMap] = useState({})
  const [rejectOpenMap, setRejectOpenMap] = useState({})
  const [processingPayment, setProcessingPayment] = useState(null)

  const activeOccupiedFlatIds = useMemo(() => new Set(tenants.filter(t=>t.status==='active').map(t=>t.flatId?._id)), [tenants])
  const tenantFlatOptions = useMemo(() => {
    if (!tenantForm.propertyId) return []
    return (flatsByProperty[tenantForm.propertyId]||[]).filter(f=>!activeOccupiedFlatIds.has(f._id))
  }, [tenantForm.propertyId, flatsByProperty, activeOccupiedFlatIds])

  const totalFlats = Object.values(flatsByProperty).reduce((c,f)=>c+f.length, 0)
  const vacantFlats = totalFlats - activeOccupiedFlatIds.size
  const activeTenants = tenants.filter(t=>t.status==='active').length

  useEffect(() => {
    const hash = location.hash.replace('#','')
    if (['properties','tenants','payments'].includes(hash)) setActiveSection(hash)
    else setActiveSection('overview')
  }, [location.hash])

  useEffect(() => {
    if (location.state?.successMessage) toast.success(location.state.successMessage)
    const s = localStorage.getItem('post_login_notice')
    if (s) { toast.success(s); localStorage.removeItem('post_login_notice') }
  }, [location.state])

  const fetchProperties = async () => { const r = await api.get('/api/owner/properties'); const l=r.data.properties||[]; setProperties(l); return l }
  const fetchTenants = async () => { const r = await api.get('/api/owner/tenants'); setTenants(r.data.tenants||[]) }
  const fetchPayments = async () => { try { setLoadingPayments(true); const r = await api.get('/api/payments/pending'); setPendingPayments(r.data.payments||[]) } catch{} finally { setLoadingPayments(false) } }
  const fetchFlats = async (pid) => { if(!pid) return []; const r = await api.get(`/api/properties/${pid}/flats`); const l=r.data.flats||[]; setFlatsByProperty(p=>({...p,[pid]:l})); return l }

  useEffect(() => {
    const load = async () => {
      try { setLoading(true); const pl = await fetchProperties(); await fetchTenants(); await Promise.all(pl.map(p=>fetchFlats(p._id))) }
      catch(e) { toast.error(e?.response?.data?.error||'Failed to load data') } finally { setLoading(false) }
    }
    load(); fetchPayments()
  }, [])

  const handlePropertySubmit = async (e) => { e.preventDefault(); try { setSubmittingProperty(true); const r = await api.post('/api/properties', propertyForm); setProperties(p=>[r.data.property,...p]); setPropertyForm({name:'',address:''}); toast.success('Property created') } catch(e) { toast.error(e?.response?.data?.error||'Failed') } finally { setSubmittingProperty(false) } }
  const handleFlatSubmit = async (e) => { e.preventDefault(); try { setSubmittingFlat(true); const r = await api.post('/api/flats', { propertyId:flatForm.propertyId, flatNumber:flatForm.flatNumber, rentAmount:Number(flatForm.rentAmount) }); const f=r.data.flat; setFlatsByProperty(p=>({...p,[f.propertyId]:[...(p[f.propertyId]||[]),f]})); setFlatForm({propertyId:flatForm.propertyId,flatNumber:'',rentAmount:''}); toast.success('Flat created') } catch(e) { toast.error(e?.response?.data?.error||'Failed') } finally { setSubmittingFlat(false) } }
  const handleTenantPropertyChange = async (pid) => { setTenantForm(p=>({...p,propertyId:pid,flatId:''})); try { if(pid&&!flatsByProperty[pid]) await fetchFlats(pid) } catch(e) { toast.error(e?.response?.data?.error||'Failed to load flats') } }
  const handleTenantSubmit = async (e) => { e.preventDefault(); try { setSubmittingTenant(true); const r = await api.post('/api/tenants', tenantForm); await fetchTenants(); await fetchFlats(tenantForm.propertyId); setTenantForm({name:'',mobileNumber:'',propertyId:'',flatId:'',joinDate:''}); toast.success(`Tenant created. Default password: ${r.data.defaultPassword}`, { duration: 8000 }) } catch(e) { toast.error(e?.response?.data?.error||'Failed') } finally { setSubmittingTenant(false) } }
  const handleApprove = async (id) => { try { setProcessingPayment(id); await api.patch(`/api/payments/${id}/approve`); toast.success('Payment approved'); await fetchPayments() } catch(e) { toast.error(e?.response?.data?.error||'Failed') } finally { setProcessingPayment(null) } }
  const handleReject = async (id) => { try { setProcessingPayment(id); await api.patch(`/api/payments/${id}/reject`,{reviewNote:rejectNoteMap[id]||''}); toast.success('Payment rejected'); setRejectOpenMap(p=>({...p,[id]:false})); setRejectNoteMap(p=>({...p,[id]:''})); await fetchPayments() } catch(e) { toast.error(e?.response?.data?.error||'Failed') } finally { setProcessingPayment(null) } }

  const sections = [
    { key:'overview', label:'Overview', Icon: LayoutDashboard },
    { key:'properties', label:'Properties', Icon: Building2 },
    { key:'tenants', label:'Tenants', Icon: Users },
    { key:'payments', label:'Payments', Icon: CreditCard },
  ]

  return (
    <AppLayout>
      <div style={{ display:'flex',flexDirection:'column',gap:'1.25rem' }}>
        <div className="anim-fade-up">
          <h1 className="page-title">Welcome back, <span style={{color:'var(--accent)'}}>{user?.name}</span> 👋</h1>
          <p style={{ color:'var(--text-muted)',fontSize:'0.84rem',marginTop:'0.25rem' }}>Manage your properties, tenants, and payments.</p>
        </div>

        {/* Stats */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'0.75rem' }}>
          <StatCard Icon={Building2} iconCls="stat-icon-indigo" label="Properties" value={properties.length} />
          <StatCard Icon={Home} iconCls="stat-icon-sky" label="Total Flats" value={totalFlats} />
          <StatCard Icon={TrendingUp} iconCls="stat-icon-emerald" label="Occupied" value={activeOccupiedFlatIds.size} />
          <StatCard Icon={KeyRound} iconCls="stat-icon-amber" label="Vacant" value={vacantFlats} />
          <StatCard Icon={Users} iconCls="stat-icon-indigo" label="Tenants" value={activeTenants} />
          <StatCard Icon={Clock} iconCls="stat-icon-rose" label="Pending" value={pendingPayments.length} />
        </div>


        {/* ── OVERVIEW (Dashboard) ─────────── */}
        {activeSection==='overview' && (
          <div style={{ display:'flex',flexDirection:'column',gap:'1.5rem' }}>

            {/* Quick Actions */}
            <div className="anim-fade-up anim-delay-1">
              <h2 className="section-title" style={{marginBottom:'0.75rem'}}>Quick Actions</h2>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'0.75rem' }}>
                {[
                  { Icon: Building2, label:'Add Property', desc:'Register new property', hash:'#properties', color:'#6366f1', bg:'#eef2ff' },
                  { Icon: Home,      label:'Add Flat',     desc:'Add flat to property',  hash:'#properties', color:'#0284c7', bg:'#f0f9ff' },
                  { Icon: Users,     label:'Add Tenant',   desc:'Assign tenant to flat', hash:'#tenants',    color:'#059669', bg:'#ecfdf5' },
                  { Icon: FileText,  label:'Generate Bills',desc:'Create monthly bills', to:'/bills',        color:'#d97706', bg:'#fffbeb' },
                  { Icon: Users,     label:'View Tenants', desc:'See all tenants',       hash:'#tenants',    color:'#7c3aed', bg:'#f5f3ff' },
                  { Icon: CreditCard,label:'Payments',     desc:`${pendingPayments.length} pending`,hash:'#payments',color:'#e11d48',bg:'#fff1f2' },
                ].map((a,i) => (
                  <a key={i} href={a.to || `/owner/dashboard${a.hash}`} onClick={a.hash ? (e)=>{e.preventDefault();setActiveSection(a.hash.slice(1));window.history.replaceState(null,'',`/owner/dashboard${a.hash}`)} : undefined}
                    style={{
                      display:'flex',flexDirection:'column',gap:'0.5rem',padding:'1rem',
                      borderRadius:'var(--radius-md)',border:'1px solid var(--border-light)',
                      background:'#fff',textDecoration:'none',transition:'var(--transition)',
                      cursor:'pointer',
                    }}
                    className="card-hover"
                  >
                    <div style={{
                      width:36,height:36,borderRadius:'var(--radius-sm)',
                      background:a.bg,display:'flex',alignItems:'center',justifyContent:'center',
                    }}>
                      <a.Icon size={18} strokeWidth={1.8} style={{color:a.color}}/>
                    </div>
                    <div>
                      <p style={{fontSize:'0.82rem',fontWeight:700,color:'var(--text-primary)',letterSpacing:'-0.01em'}}>{a.label}</p>
                      <p style={{fontSize:'0.68rem',color:'var(--text-muted)',marginTop:'0.1rem'}}>{a.desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Property Summary */}
            <div className="anim-fade-up anim-delay-2">
              <h2 className="section-title" style={{marginBottom:'0.75rem'}}>Property Summary</h2>
              {loading ? <div style={{display:'flex',alignItems:'center',gap:'0.5rem',color:'var(--text-muted)',fontSize:'0.85rem'}}><span className="spinner"/>Loading…</div> :
              properties.length===0 ? (
                <div className="card" style={{padding:'2.5rem',textAlign:'center'}}>
                  <Building2 size={40} style={{color:'var(--text-muted)',margin:'0 auto 0.75rem'}} strokeWidth={1.2}/>
                  <p style={{fontWeight:700,color:'var(--text-primary)',fontSize:'1rem'}}>No properties yet</p>
                  <p style={{color:'var(--text-muted)',fontSize:'0.84rem',marginTop:'0.25rem'}}>Use <strong>Add Property</strong> above to get started.</p>
                </div>
              ) : (
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:'1rem' }}>
                {properties.map((prop, idx) => {
                  const flats = flatsByProperty[prop._id] || []
                  const occupied = flats.filter(f => activeOccupiedFlatIds.has(f._id)).length
                  const vacant = flats.length - occupied
                  const occupancyPct = flats.length > 0 ? Math.round((occupied / flats.length) * 100) : 0
                  return (
                    <div key={prop._id} className={`card card-hover anim-fade-up anim-delay-${Math.min(idx+1,5)}`} style={{ padding:0,overflow:'hidden' }}>
                      <div style={{ height:3, background:'linear-gradient(90deg, #6366f1, #818cf8, #a5b4fc)', borderRadius:'16px 16px 0 0' }}/>
                      <div style={{ padding:'1.25rem 1.25rem 0.875rem' }}>
                        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
                          <div style={{display:'flex',alignItems:'center',gap:'0.625rem'}}>
                            <div className="stat-icon stat-icon-indigo" style={{width:38,height:38}}>
                              <Building2 size={18} strokeWidth={1.8}/>
                            </div>
                            <div>
                              <h3 style={{ fontSize:'0.95rem',fontWeight:700,color:'var(--text-primary)',letterSpacing:'-0.01em' }}>{prop.name}</h3>
                              <p style={{ fontSize:'0.72rem',color:'var(--text-muted)',marginTop:'0.1rem',lineHeight:1.3 }}>{prop.address}</p>
                            </div>
                          </div>
                          <span className="badge badge-accent" style={{flexShrink:0}}>{flats.length} flats</span>
                        </div>
                        <div style={{ marginTop:'1rem' }}>
                          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'0.3rem' }}>
                            <span style={{ fontSize:'0.68rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Occupancy</span>
                            <span style={{ fontSize:'0.72rem',fontWeight:700,color: occupancyPct >= 75 ? 'var(--success)' : occupancyPct >= 40 ? 'var(--warning)' : 'var(--danger)' }}>{occupancyPct}%</span>
                          </div>
                          <div style={{ height:5,borderRadius:99,background:'var(--bg-inset)',overflow:'hidden' }}>
                            <div style={{
                              height:'100%',borderRadius:99,transition:'width 0.6s cubic-bezier(0.22,1,0.36,1)',
                              width:`${occupancyPct}%`,
                              background: occupancyPct >= 75 ? 'linear-gradient(90deg, #059669, #10b981)' : occupancyPct >= 40 ? 'linear-gradient(90deg, #d97706, #f59e0b)' : 'linear-gradient(90deg, #dc2626, #f43f5e)',
                            }}/>
                          </div>
                        </div>
                      </div>
                      <div className="prop-stat-group" style={{ borderTop:'1px solid var(--border-light)',background:'var(--bg-inset)' }}>
                        <div className="prop-stat"><div className="prop-stat-label">Occupied</div><div className="prop-stat-value" style={{color:'var(--success)'}}>{occupied}</div></div>
                        <div className="prop-stat"><div className="prop-stat-label">Vacant</div><div className="prop-stat-value" style={{color:'var(--warning)'}}>{vacant}</div></div>
                        <div className="prop-stat"><div className="prop-stat-label">Revenue</div><div className="prop-stat-value" style={{color:'var(--text-primary)',fontSize:'0.95rem'}}>₹{flats.reduce((s,f)=>s+f.rentAmount,0).toLocaleString()}</div></div>
                      </div>
                    </div>
                  )
                })}
              </div>)}
            </div>
          </div>
        )}

        {/* ── PROPERTIES ───────────────────── */}
        {activeSection==='properties' && (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:'1.25rem' }}>
            <form onSubmit={handlePropertySubmit} className="card anim-fade-up" style={{padding:'1.5rem'}}>
              <h3 className="section-title" style={{marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.5rem'}}><Building2 size={18} strokeWidth={2}/> Add Property</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
                <FormField id="pName" label="Property Name"><input id="pName" className="form-input" value={propertyForm.name} onChange={e=>setPropertyForm(p=>({...p,name:e.target.value}))} required placeholder="Skyline Residency"/></FormField>
                <FormField id="pAddr" label="Address"><textarea id="pAddr" className="form-input" rows={3} value={propertyForm.address} onChange={e=>setPropertyForm(p=>({...p,address:e.target.value}))} required placeholder="Street, city" style={{resize:'vertical'}}/></FormField>
                <button type="submit" className="btn btn-primary" disabled={submittingProperty} style={{width:'100%'}}>{submittingProperty?'Saving…':'Add Property'}</button>
              </div>
            </form>
            <form onSubmit={handleFlatSubmit} className="card anim-fade-up anim-delay-1" style={{padding:'1.5rem'}}>
              <h3 className="section-title" style={{marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.5rem'}}><Home size={18} strokeWidth={2}/> Add Flat</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
                <FormField id="fProp" label="Property"><select id="fProp" className="form-input" value={flatForm.propertyId} required onChange={e=>setFlatForm(p=>({...p,propertyId:e.target.value}))}><option value="">Select property</option>{properties.map(p=><option key={p._id} value={p._id}>{p.name}</option>)}</select></FormField>
                <FormField id="fNum" label="Flat Number"><input id="fNum" className="form-input" value={flatForm.flatNumber} required placeholder="A-101" onChange={e=>setFlatForm(p=>({...p,flatNumber:e.target.value}))}/></FormField>
                <FormField id="fRent" label="Rent (₹)"><input id="fRent" className="form-input" type="number" min="0" value={flatForm.rentAmount} required placeholder="15000" onChange={e=>setFlatForm(p=>({...p,rentAmount:e.target.value}))}/></FormField>
                <button type="submit" className="btn btn-primary" disabled={submittingFlat||!properties.length} style={{width:'100%'}}>{submittingFlat?'Saving…':'Add Flat'}</button>
              </div>
            </form>
          </div>
        )}

        {/* ── TENANTS ──────────────────────── */}
        {activeSection==='tenants' && (
          <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
            <form onSubmit={handleTenantSubmit} className="card anim-fade-up" style={{padding:'1.5rem'}}>
              <h3 className="section-title" style={{marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.5rem'}}><Users size={18} strokeWidth={2}/> Add Tenant</h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'0.875rem'}}>
                <FormField id="tN" label="Name"><input id="tN" className="form-input" value={tenantForm.name} required onChange={e=>setTenantForm(p=>({...p,name:e.target.value}))}/></FormField>
                <FormField id="tM" label="Mobile"><input id="tM" className="form-input" type="tel" inputMode="numeric" pattern="[0-9]{10}" value={tenantForm.mobileNumber} required onChange={e=>setTenantForm(p=>({...p,mobileNumber:e.target.value}))}/></FormField>
                <FormField id="tP" label="Property"><select id="tP" className="form-input" value={tenantForm.propertyId} required onChange={e=>handleTenantPropertyChange(e.target.value)}><option value="">Select</option>{properties.map(p=><option key={p._id} value={p._id}>{p.name}</option>)}</select></FormField>
                <FormField id="tF" label="Flat"><select id="tF" className="form-input" value={tenantForm.flatId} required onChange={e=>setTenantForm(p=>({...p,flatId:e.target.value}))}><option value="">Select</option>{tenantFlatOptions.map(f=><option key={f._id} value={f._id}>{f.flatNumber} (₹{f.rentAmount})</option>)}</select></FormField>
                <FormField id="tJ" label="Join Date"><input id="tJ" className="form-input" type="date" value={tenantForm.joinDate} required onChange={e=>setTenantForm(p=>({...p,joinDate:e.target.value}))}/></FormField>
              </div>
              <button type="submit" className="btn btn-primary" disabled={submittingTenant||!properties.length} style={{width:'100%',marginTop:'1rem'}}>{submittingTenant?'Saving…':'Add Tenant'}</button>
            </form>
            <div className="card anim-fade-up anim-delay-1" style={{padding:'1.5rem'}}>
              <h3 className="section-title" style={{marginBottom:'1rem'}}>Tenant List</h3>
              {loading ? <div style={{display:'flex',alignItems:'center',gap:'0.5rem',color:'var(--text-muted)',fontSize:'0.85rem'}}><span className="spinner"/>Loading…</div> :
              tenants.length===0 ? <p style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>No tenants added yet.</p> :
              <div style={{overflowX:'auto'}}>
                <table className="tbl"><thead><tr><th>Tenant</th><th>Mobile</th><th>Property</th><th>Flat</th><th>Rent</th><th>Joined</th><th>Status</th></tr></thead><tbody>
                  {tenants.map(t=><tr key={t._id}><td style={{fontWeight:600}}>{t.userId?.name}</td><td>{t.userId?.mobileNumber}</td><td>{t.propertyId?.name}</td><td>{t.flatId?.flatNumber}</td><td>₹{t.flatId?.rentAmount}</td><td>{t.joinDate?new Date(t.joinDate).toLocaleDateString():'—'}</td><td><StatusBadge status={t.status}/></td></tr>)}
                </tbody></table>
              </div>}
            </div>
          </div>
        )}

        {/* ── PAYMENTS ─────────────────────── */}
        {activeSection==='payments' && (
          <div className="card anim-fade-up" style={{padding:'1.5rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1rem'}}>
              <h2 className="section-title">Payment Requests</h2>
              {pendingPayments.length>0 && <span className="badge badge-pending">{pendingPayments.length} pending</span>}
            </div>
            {loadingPayments ? <div style={{display:'flex',alignItems:'center',gap:'0.5rem',color:'var(--text-muted)',fontSize:'0.85rem'}}><span className="spinner"/>Loading…</div> :
            pendingPayments.length===0 ? (
              <div style={{textAlign:'center',padding:'2rem'}}>
                <CreditCard size={36} style={{color:'var(--text-muted)',margin:'0 auto 0.75rem'}} strokeWidth={1.2}/>
                <p style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>No pending requests.</p>
              </div>
            ) :
            <div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
              {pendingPayments.map(pay => {
                const name=pay.tenantId?.userId?.name||'Unknown', mobile=pay.tenantId?.userId?.mobileNumber||'—', busy=processingPayment===pay._id
                return (
                  <div key={pay._id} className="bill-inner">
                    <div style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',gap:'0.5rem'}}>
                      <div><p style={{fontWeight:700,color:'var(--text-primary)'}}>{name}</p><p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{mobile}</p></div>
                      <div style={{textAlign:'right'}}><p style={{fontSize:'1.25rem',fontWeight:800,color:'var(--text-primary)'}}>₹{pay.totalAmount.toFixed(2)}</p><span className="badge badge-accent">{pay.paymentType}</span></div>
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:'0.375rem',marginTop:'0.625rem'}}>
                      {pay.bills.map((b,i)=><span key={i} style={{padding:'0.2rem 0.5rem',borderRadius:'var(--radius-full)',fontSize:'0.68rem',fontWeight:600,background:'var(--accent-subtle)',border:'1px solid #c7d2fe',color:'var(--accent)'}}>{b.month} · {b.billType} · ₹{b.amount}</span>)}
                    </div>
                    {pay.screenshotUrl && <div style={{marginTop:'0.625rem'}}><a href={pay.screenshotUrl} target="_blank" rel="noopener noreferrer"><img src={pay.screenshotUrl} alt="Screenshot" style={{height:72,borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',objectFit:'cover'}}/></a></div>}
                    <div style={{marginTop:'0.75rem'}}>
                      {!rejectOpenMap[pay._id] ? (
                        <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                          <button type="button" className="btn btn-success btn-sm" disabled={busy} onClick={()=>handleApprove(pay._id)}><Check size={14}/>{busy?'Processing…':'Approve'}</button>
                          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={()=>setRejectOpenMap(p=>({...p,[pay._id]:true}))}><X size={14}/>Reject</button>
                        </div>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                          <textarea rows={2} placeholder="Rejection reason (optional)" value={rejectNoteMap[pay._id]||''} className="form-input" onChange={e=>setRejectNoteMap(p=>({...p,[pay._id]:e.target.value}))}/>
                          <div style={{display:'flex',gap:'0.5rem'}}>
                            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={()=>handleReject(pay._id)}>{busy?'Processing…':'Confirm Reject'}</button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={()=>setRejectOpenMap(p=>({...p,[pay._id]:false}))}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
