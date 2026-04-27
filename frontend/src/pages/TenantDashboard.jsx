import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarDays, FileWarning, IndianRupee, Home, Zap } from 'lucide-react'
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
  const cls = status==='paid'?'badge-paid':status==='pending'?'badge-pending':'badge-unpaid'
  return <span className={`badge ${cls}`}>{status}</span>
}

export default function TenantDashboard() {
  const { user } = useAuth()
  const [rentBills, setRentBills] = useState([])
  const [electricityBills, setElectricityBills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try { setLoading(true); const r = await api.get('/api/bills/my'); setRentBills(r.data.rentBills||[]); setElectricityBills(r.data.electricityBills||[]) }
      catch(e) { toast.error(e?.response?.data?.error||'Failed to load bills') } finally { setLoading(false) }
    }; fetch()
  }, [])

  const groupedBills = useMemo(() => {
    const map = new Map()
    for (const b of rentBills) { if(!map.has(b.month)) map.set(b.month,{month:b.month,rentBill:null,electricityBill:null}); map.get(b.month).rentBill=b }
    for (const b of electricityBills) { if(!map.has(b.month)) map.set(b.month,{month:b.month,rentBill:null,electricityBill:null}); map.get(b.month).electricityBill=b }
    return Array.from(map.values()).sort((a,b)=>b.month.localeCompare(a.month))
  }, [rentBills, electricityBills])

  const totalUnpaid = useMemo(() => [...rentBills,...electricityBills].filter(b=>b.status!=='paid').reduce((s,b)=>s+b.totalAmount,0), [rentBills, electricityBills])
  const unpaidCount = useMemo(() => [...rentBills,...electricityBills].filter(b=>b.status!=='paid').length, [rentBills, electricityBills])

  return (
    <AppLayout>
      <div style={{ display:'flex',flexDirection:'column',gap:'1.25rem' }}>
        <div className="anim-fade-up">
          <h1 className="page-title">Welcome back, <span style={{color:'var(--accent)'}}>{user?.name}</span> 👋</h1>
          <p style={{ color:'var(--text-muted)',fontSize:'0.84rem',marginTop:'0.25rem' }}>Check rent status, lease details, and payment reminders.</p>
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'0.75rem' }}>
          <StatCard Icon={CalendarDays} iconCls="stat-icon-indigo" label="Billing Months" value={groupedBills.length} />
          <StatCard Icon={FileWarning} iconCls="stat-icon-amber" label="Unpaid Bills" value={unpaidCount} />
          <StatCard Icon={IndianRupee} iconCls="stat-icon-rose" label="Outstanding" value={`₹${totalUnpaid.toFixed(0)}`} />
        </div>

        <div className="card anim-fade-up anim-delay-1" style={{ padding:'1.5rem' }}>
          <h2 className="section-title">Monthly Bills</h2>
          {loading ? (
            <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginTop:'1rem',color:'var(--text-muted)',fontSize:'0.85rem'}}><span className="spinner"/>Loading…</div>
          ) : groupedBills.length===0 ? (
            <div style={{textAlign:'center',padding:'2rem'}}>
              <FileWarning size={36} style={{color:'var(--text-muted)',margin:'0 auto 0.75rem'}} strokeWidth={1.2}/>
              <p style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>No monthly bills generated yet.</p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'0.875rem',marginTop:'1rem'}}>
              {groupedBills.map(item => (
                <div key={item.month} style={{padding:'1rem',borderRadius:'var(--radius-md)',border:'1px solid var(--border-light)',background:'var(--bg-inset)'}}>
                  <h3 style={{fontSize:'0.88rem',fontWeight:700,color:'var(--text-primary)',marginBottom:'0.625rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
                    <CalendarDays size={15} strokeWidth={2} style={{color:'var(--accent)'}}/> {item.month}
                  </h3>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'0.625rem'}}>
                    {/* Rent */}
                    <div className="bill-inner">
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.375rem'}}>
                        <span style={{fontWeight:600,fontSize:'0.8rem',color:'var(--text-primary)',display:'flex',alignItems:'center',gap:'0.35rem'}}><Home size={14} strokeWidth={2}/> Rent + Water</span>
                        {item.rentBill ? <StatusBadge status={item.rentBill.status}/> : <span style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>Not generated</span>}
                      </div>
                      {item.rentBill && (
                        <div style={{fontSize:'0.78rem',color:'var(--text-secondary)',display:'flex',flexDirection:'column',gap:'0.15rem'}}>
                          <span>Rent: ₹{item.rentBill.rentAmount} · Water: ₹{item.rentBill.waterAmount}</span>
                          <span style={{fontWeight:700,color:'var(--text-primary)'}}>Total: ₹{item.rentBill.totalAmount}</span>
                        </div>
                      )}
                    </div>
                    {/* Electricity */}
                    <div className="bill-inner">
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.375rem'}}>
                        <span style={{fontWeight:600,fontSize:'0.8rem',color:'var(--text-primary)',display:'flex',alignItems:'center',gap:'0.35rem'}}><Zap size={14} strokeWidth={2}/> Electricity</span>
                        {item.electricityBill ? <StatusBadge status={item.electricityBill.status}/> : <span style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>Not generated</span>}
                      </div>
                      {item.electricityBill && (
                        <div style={{fontSize:'0.78rem',color:'var(--text-secondary)',display:'flex',flexDirection:'column',gap:'0.15rem'}}>
                          <span>Reading: {item.electricityBill.prevReading} → {item.electricityBill.currReading} · Units: {item.electricityBill.units}</span>
                          <span style={{fontWeight:700,color:'var(--text-primary)'}}>Total: ₹{item.electricityBill.totalAmount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
