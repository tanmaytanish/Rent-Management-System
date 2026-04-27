import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FileText, CalendarDays, Home, Zap, Check, UserCheck } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

function StatusBadge({ status }) {
  const cls = status==='paid'?'badge-paid':status==='pending'?'badge-pending':'badge-unpaid'
  return <span className={`badge ${cls}`}>{status.charAt(0).toUpperCase()+status.slice(1)}</span>
}
function FormField({ id, label, children }) {
  return <div><label className="form-label" htmlFor={id}>{label}</label>{children}</div>
}

export default function BillsPage() {
  const { user } = useAuth(); const navigate = useNavigate(); const location = useLocation()
  const [ownerTenants, setOwnerTenants] = useState([]); const [selectedTenantId, setSelectedTenantId] = useState('')
  const [rentBills, setRentBills] = useState([]); const [electricityBills, setElectricityBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false); const [markingPaid, setMarkingPaid] = useState(new Set())
  const [generateForm, setGenerateForm] = useState({ month:'', waterAmount:'', dueDate:'', prevReading:'', currReading:'', rate:'' })

  const groupedBills = useMemo(() => {
    const map = new Map()
    for (const b of rentBills) { if(!map.has(b.month)) map.set(b.month,{month:b.month,rentBill:null,electricityBill:null}); map.get(b.month).rentBill=b }
    for (const b of electricityBills) { if(!map.has(b.month)) map.set(b.month,{month:b.month,rentBill:null,electricityBill:null}); map.get(b.month).electricityBill=b }
    return Array.from(map.values()).sort((a,b)=>b.month.localeCompare(a.month))
  }, [rentBills, electricityBills])

  const fetchBills = async (tid) => {
    const id = tid||selectedTenantId
    if (user?.role==='owner') { if(!id){setRentBills([]);setElectricityBills([]);return}; const r=await api.get(`/api/bills/tenant/${id}`); setRentBills(r.data.rentBills||[]); setElectricityBills(r.data.electricityBills||[]); return }
    const r=await api.get('/api/bills/my'); setRentBills(r.data.rentBills||[]); setElectricityBills(r.data.electricityBills||[])
  }

  useEffect(() => {
    const load = async () => {
      try { setLoading(true)
        if(user?.role==='owner'){ const r=await api.get('/api/owner/tenants'); const t=r.data.tenants||[]; setOwnerTenants(t); if(t.length>0){setSelectedTenantId(t[0]._id); await fetchBills(t[0]._id)} }
        else { await fetchBills() }
      } catch(e){ toast.error(e?.response?.data?.error||'Failed to load bills') } finally{setLoading(false)}
    }; if(user?.role) load()
  }, [user?.role])

  useEffect(()=>{if(location.state?.notice) { location.state.notice.type==='success' ? toast.success(location.state.notice.text) : toast.error(location.state.notice.text) }},[location.state])

  const handleTenantChange = async (tid) => { setSelectedTenantId(tid); try{setLoading(true);await fetchBills(tid)}catch(e){toast.error(e?.response?.data?.error||'Failed')}finally{setLoading(false)} }

  const handleGenerateBills = async (e) => {
    e.preventDefault(); if(!selectedTenantId){toast.error('Select a tenant first');return}
    try { setGenerating(true)
      await api.post('/api/bills/generate-monthly',{tenantId:selectedTenantId,month:generateForm.month,waterAmount:Number(generateForm.waterAmount),dueDate:generateForm.dueDate,prevReading:Number(generateForm.prevReading),currReading:Number(generateForm.currReading),rate:Number(generateForm.rate)})
      await fetchBills(selectedTenantId); setGenerateForm({month:'',waterAmount:'',dueDate:'',prevReading:'',currReading:'',rate:''}); toast.success('Bills generated successfully')
    } catch(e){toast.error(e?.response?.data?.error||'Failed')} finally{setGenerating(false)}
  }

  const handleMarkPaid = async (billType, billId) => {
    setMarkingPaid(p=>new Set(p).add(billId))
    try { await api.post('/api/payments/manual',{billType,billId}); await fetchBills(selectedTenantId); toast.success(`${billType==='rent'?'Rent':'Electricity'} bill marked paid`) }
    catch(e){toast.error(e?.response?.data?.error||'Failed')}
    finally{setMarkingPaid(p=>{const n=new Set(p);n.delete(billId);return n})}
  }

  return (
    <AppLayout>
      <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
        <div className="anim-fade-up">
          <h1 className="page-title" style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <FileText size={22} strokeWidth={2} style={{color:'var(--accent)'}}/> <span style={{color:'var(--accent)'}}>Bills</span>
          </h1>
          <p style={{color:'var(--text-muted)',fontSize:'0.84rem',marginTop:'0.25rem'}}>
            {user?.role==='owner'?'Generate monthly bills and track payment statuses.':'Review your rent and electricity bills.'}
          </p>
        </div>

        {user?.role==='owner' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'1rem'}}>
            <div className="card anim-fade-up" style={{padding:'1.25rem'}}>
              <h2 className="section-title" style={{marginBottom:'0.625rem',display:'flex',alignItems:'center',gap:'0.4rem'}}><UserCheck size={16} strokeWidth={2}/> Select Tenant</h2>
              <select value={selectedTenantId} onChange={e=>handleTenantChange(e.target.value)} className="form-input">
                <option value="">Select tenant</option>
                {ownerTenants.map(t=><option key={t._id} value={t._id}>{t.userId?.name} — {t.flatId?.flatNumber}</option>)}
              </select>
            </div>
            <form onSubmit={handleGenerateBills} className="card anim-fade-up anim-delay-1" style={{padding:'1.25rem'}}>
              <h2 className="section-title" style={{marginBottom:'0.625rem',display:'flex',alignItems:'center',gap:'0.4rem'}}><FileText size={16} strokeWidth={2}/> Generate Bills</h2>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'0.625rem'}}>
                <FormField id="bM" label="Month"><input id="bM" type="month" className="form-input" required value={generateForm.month} onChange={e=>setGenerateForm(p=>({...p,month:e.target.value}))}/></FormField>
                <FormField id="bD" label="Due Date"><input id="bD" type="date" className="form-input" required value={generateForm.dueDate} onChange={e=>setGenerateForm(p=>({...p,dueDate:e.target.value}))}/></FormField>
                <FormField id="bW" label="Water ₹"><input id="bW" type="number" min="0" className="form-input" required placeholder="200" value={generateForm.waterAmount} onChange={e=>setGenerateForm(p=>({...p,waterAmount:e.target.value}))}/></FormField>
                <FormField id="bR" label="Rate/unit"><input id="bR" type="number" min="0" className="form-input" required placeholder="8" value={generateForm.rate} onChange={e=>setGenerateForm(p=>({...p,rate:e.target.value}))}/></FormField>
                <FormField id="bP" label="Prev Reading"><input id="bP" type="number" min="0" className="form-input" required placeholder="1200" value={generateForm.prevReading} onChange={e=>setGenerateForm(p=>({...p,prevReading:e.target.value}))}/></FormField>
                <FormField id="bC" label="Curr Reading"><input id="bC" type="number" min="0" className="form-input" required placeholder="1350" value={generateForm.currReading} onChange={e=>setGenerateForm(p=>({...p,currReading:e.target.value}))}/></FormField>
              </div>
              <button type="submit" className="btn btn-primary" disabled={generating||!selectedTenantId} style={{width:'100%',marginTop:'0.75rem'}}>{generating?'Generating…':'Generate Bills'}</button>
            </form>
          </div>
        )}

        <div className="card anim-fade-up anim-delay-2" style={{padding:'1.5rem'}}>
          <h2 className="section-title">Monthly Bills</h2>
          {loading ? <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginTop:'1rem',color:'var(--text-muted)',fontSize:'0.85rem'}}><span className="spinner"/>Loading…</div> :
          groupedBills.length===0 ? (
            <div style={{textAlign:'center',padding:'2rem'}}>
              <FileText size={36} style={{color:'var(--text-muted)',margin:'0 auto 0.75rem'}} strokeWidth={1.2}/>
              <p style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>No bills available.</p>
            </div>
          ) :
          <div style={{display:'flex',flexDirection:'column',gap:'0.875rem',marginTop:'1rem'}}>
            {groupedBills.map(item=>(
              <div key={item.month} style={{padding:'1rem',borderRadius:'var(--radius-md)',border:'1px solid var(--border-light)',background:'var(--bg-inset)'}}>
                <h3 style={{fontSize:'0.88rem',fontWeight:700,color:'var(--text-primary)',marginBottom:'0.625rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
                  <CalendarDays size={15} strokeWidth={2} style={{color:'var(--accent)'}}/> {item.month}
                </h3>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'0.625rem'}}>
                  <div className="bill-inner">
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.375rem'}}>
                      <span style={{fontWeight:600,fontSize:'0.8rem',display:'flex',alignItems:'center',gap:'0.35rem'}}><Home size={14} strokeWidth={2}/> Rent + Water</span>
                      {item.rentBill?<StatusBadge status={item.rentBill.status}/>:<span style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>Not generated</span>}
                    </div>
                    {item.rentBill&&<div style={{fontSize:'0.78rem',color:'var(--text-secondary)'}}>
                      <span>Rent: ₹{item.rentBill.rentAmount} · Water: ₹{item.rentBill.waterAmount}</span>
                      <p style={{fontWeight:700,color:'var(--text-primary)',marginTop:'0.15rem'}}>Total: ₹{item.rentBill.totalAmount}</p>
                      {item.rentBill.dueDate&&<p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Due: {new Date(item.rentBill.dueDate).toLocaleDateString()}</p>}
                    </div>}
                    {user?.role==='tenant'&&item.rentBill?.status==='unpaid'&&<button type="button" className="btn btn-primary btn-sm" style={{marginTop:'0.5rem'}} onClick={()=>navigate('/payment')}>Make Payment</button>}
                    {user?.role==='owner'&&item.rentBill?.status==='unpaid'&&<button type="button" className="btn btn-success btn-sm" style={{marginTop:'0.5rem'}} disabled={markingPaid.has(item.rentBill._id)} onClick={()=>handleMarkPaid('rent',item.rentBill._id)}><Check size={13}/>{markingPaid.has(item.rentBill._id)?'Marking…':'Mark Paid'}</button>}
                  </div>
                  <div className="bill-inner">
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.375rem'}}>
                      <span style={{fontWeight:600,fontSize:'0.8rem',display:'flex',alignItems:'center',gap:'0.35rem'}}><Zap size={14} strokeWidth={2}/> Electricity</span>
                      {item.electricityBill?<StatusBadge status={item.electricityBill.status}/>:<span style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>Not generated</span>}
                    </div>
                    {item.electricityBill&&<div style={{fontSize:'0.78rem',color:'var(--text-secondary)'}}>
                      <span>Reading: {item.electricityBill.prevReading} → {item.electricityBill.currReading} · Units: {item.electricityBill.units}</span>
                      <p style={{fontWeight:700,color:'var(--text-primary)',marginTop:'0.15rem'}}>Total: ₹{item.electricityBill.totalAmount}</p>
                    </div>}
                    {user?.role==='tenant'&&item.electricityBill?.status==='unpaid'&&<button type="button" className="btn btn-primary btn-sm" style={{marginTop:'0.5rem'}} onClick={()=>navigate('/payment')}>Make Payment</button>}
                    {user?.role==='owner'&&item.electricityBill?.status==='unpaid'&&<button type="button" className="btn btn-success btn-sm" style={{marginTop:'0.5rem'}} disabled={markingPaid.has(item.electricityBill._id)} onClick={()=>handleMarkPaid('electricity',item.electricityBill._id)}><Check size={13}/>{markingPaid.has(item.electricityBill._id)?'Marking…':'Mark Paid'}</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>}
        </div>
      </div>
    </AppLayout>
  )
}
