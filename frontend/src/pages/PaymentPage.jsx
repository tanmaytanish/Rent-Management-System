import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CreditCard, Smartphone, Banknote, Landmark, Upload, X, CalendarDays } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import api from '../lib/api'

function StatusBadge({ status }) {
  const cls = status==='paid'?'badge-paid':status==='pending'?'badge-pending':'badge-unpaid'
  return <span className={`badge ${cls}`}>{status}</span>
}

function BillCheckbox({ bill, label, checked, onChange }) {
  const ok = bill.status==='unpaid'
  return (
    <label style={{
      display:'flex',alignItems:'center',justifyContent:'space-between',gap:'0.5rem',
      padding:'0.5rem 0.75rem',borderRadius:'var(--radius-sm)',cursor:ok?'pointer':'not-allowed',
      opacity:ok?1:0.5,transition:'var(--transition)',
      background:checked?'var(--accent-subtle)':'#fff',
      border:checked?'1.5px solid rgba(99,102,241,0.35)':'1.5px solid var(--border-light)',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
        <input type="checkbox" checked={checked} onChange={onChange} disabled={!ok} style={{width:16,height:16,accentColor:'#6366f1',cursor:'inherit'}}/>
        <span style={{fontSize:'0.84rem',color:'var(--text-primary)',fontWeight:500}}>{label}</span>
      </div>
      <StatusBadge status={bill.status}/>
    </label>
  )
}

export default function PaymentPage() {
  const navigate = useNavigate(); const fileInputRef = useRef(null)
  const [rentBills, setRentBills] = useState([]); const [electricityBills, setElectricityBills] = useState([])
  const [loading, setLoading] = useState(true); const [fetchError, setFetchError] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set()); const [paymentType, setPaymentType] = useState('upi')
  const [screenshot, setScreenshot] = useState(null); const [screenshotPreview, setScreenshotPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(()=>{
    const load=async()=>{try{setLoading(true);const r=await api.get('/api/bills/my');setRentBills(r.data.rentBills||[]);setElectricityBills(r.data.electricityBills||[])}catch(e){setFetchError(e?.response?.data?.error||'Failed')}finally{setLoading(false)}}; load()
  },[])

  const groupedBills = useMemo(()=>{
    const m=new Map()
    for(const b of rentBills){if(!m.has(b.month))m.set(b.month,{month:b.month,rentBill:null,electricityBill:null});m.get(b.month).rentBill=b}
    for(const b of electricityBills){if(!m.has(b.month))m.set(b.month,{month:b.month,rentBill:null,electricityBill:null});m.get(b.month).electricityBill=b}
    return Array.from(m.values()).sort((a,b)=>b.month.localeCompare(a.month))
  },[rentBills,electricityBills])

  const billMap = useMemo(()=>{const m=new Map();for(const b of rentBills)m.set(b._id,{...b,billType:'rent'});for(const b of electricityBills)m.set(b._id,{...b,billType:'electricity'});return m},[rentBills,electricityBills])
  const totalAmount = useMemo(()=>{let s=0;for(const id of selectedIds){const b=billMap.get(id);if(b)s+=b.totalAmount};return s},[selectedIds,billMap])
  const toggleBill=(id)=>setSelectedIds(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n})
  const clearScreenshot=()=>{setScreenshot(null);setScreenshotPreview('');if(fileInputRef.current)fileInputRef.current.value=''}
  const handleScreenshotChange=(e)=>{const f=e.target.files[0];if(!f)return;setScreenshot(f);setScreenshotPreview(URL.createObjectURL(f))}
  const handlePaymentTypeChange=(t)=>{setPaymentType(t);if(t!=='upi')clearScreenshot()}
  const hasSelectableBills=[...billMap.values()].some(b=>b.status==='unpaid')

  const handleSubmit=async(e)=>{
    e.preventDefault()
    if(selectedIds.size===0){toast.error('Select at least one bill.');return}
    if(paymentType==='upi'&&!screenshot){toast.error('Upload your UPI screenshot.');return}
    const bills=Array.from(selectedIds).map(id=>{const b=billMap.get(id);return{billType:b.billType,billId:id}})
    const fd=new FormData();fd.append('bills',JSON.stringify(bills));fd.append('paymentType',paymentType);fd.append('totalAmount',String(totalAmount));if(screenshot)fd.append('screenshot',screenshot)
    try{setSubmitting(true);await api.post('/api/payments',fd,{headers:{'Content-Type':'multipart/form-data'}});toast.success('Payment submitted! Awaiting approval.');navigate('/bills',{replace:true})}
    catch(e){toast.error(e?.response?.data?.error||'Failed')}finally{setSubmitting(false)}
  }

  const METHODS=[
    {value:'upi',label:'UPI',Icon:Smartphone},
    {value:'cash',label:'Cash',Icon:Banknote},
    {value:'manual',label:'Transfer',Icon:Landmark},
  ]

  return (
    <AppLayout>
      <div style={{display:'flex',flexDirection:'column',gap:'1.25rem',maxWidth:680}}>
        <div className="anim-fade-up">
          <h1 className="page-title" style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <CreditCard size={22} strokeWidth={2} style={{color:'var(--accent)'}}/> Make a <span style={{color:'var(--accent)'}}>Payment</span>
          </h1>
          <p style={{color:'var(--text-muted)',fontSize:'0.84rem',marginTop:'0.25rem'}}>Select bills, choose payment method, and submit.</p>
        </div>

        {loading?(
          <div className="card" style={{padding:'2rem',textAlign:'center'}}><span className="spinner" style={{width:24,height:24}}/><p style={{color:'var(--text-muted)',fontSize:'0.85rem',marginTop:'0.75rem'}}>Loading bills…</p></div>
        ):fetchError?(<div className="alert alert-error">{fetchError}</div>
        ):groupedBills.length===0?(
          <div className="card" style={{padding:'2rem',textAlign:'center'}}>
            <CreditCard size={36} style={{color:'var(--text-muted)',margin:'0 auto 0.75rem'}} strokeWidth={1.2}/>
            <p style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>No bills found.</p>
          </div>
        ):(
          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
            <div className="card anim-fade-up" style={{padding:'1.25rem'}}>
              <h2 className="section-title">Select Bills</h2>
              <p className="section-subtitle">Only unpaid bills can be selected.</p>
              <div style={{display:'flex',flexDirection:'column',gap:'0.625rem',marginTop:'0.875rem'}}>
                {groupedBills.map(g=>(
                  <div key={g.month} style={{padding:'0.625rem',borderRadius:'var(--radius-sm)',border:'1px solid var(--border-light)',background:'var(--bg-inset)'}}>
                    <p style={{fontSize:'0.78rem',fontWeight:700,color:'var(--text-primary)',marginBottom:'0.375rem',display:'flex',alignItems:'center',gap:'0.35rem'}}>
                      <CalendarDays size={13} strokeWidth={2} style={{color:'var(--accent)'}}/> {g.month}
                    </p>
                    <div style={{display:'flex',flexDirection:'column',gap:'0.25rem'}}>
                      {g.rentBill&&<BillCheckbox bill={g.rentBill} label={`Rent + Water — ₹${g.rentBill.totalAmount}`} checked={selectedIds.has(g.rentBill._id)} onChange={()=>toggleBill(g.rentBill._id)}/>}
                      {g.electricityBill&&<BillCheckbox bill={g.electricityBill} label={`Electricity — ₹${g.electricityBill.totalAmount}`} checked={selectedIds.has(g.electricityBill._id)} onChange={()=>toggleBill(g.electricityBill._id)}/>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card anim-fade-up anim-delay-1" style={{padding:'1.25rem'}}>
              <h2 className="section-title" style={{marginBottom:'0.625rem'}}>Payment Method</h2>
              <div style={{display:'flex',flexWrap:'wrap',gap:'0.375rem'}}>
                {METHODS.map(({value,label,Icon})=>(
                  <label key={value} style={{
                    display:'flex',alignItems:'center',gap:'0.4rem',padding:'0.5rem 0.875rem',borderRadius:'var(--radius-sm)',cursor:'pointer',fontSize:'0.84rem',fontWeight:600,transition:'var(--transition)',
                    background:paymentType===value?'var(--accent-subtle)':'#fff',
                    border:paymentType===value?'1.5px solid rgba(99,102,241,0.35)':'1.5px solid var(--border)',
                    color:paymentType===value?'var(--accent)':'var(--text-muted)',
                  }}><input type="radio" name="pt" value={value} checked={paymentType===value} onChange={()=>handlePaymentTypeChange(value)} style={{display:'none'}}/><Icon size={16} strokeWidth={1.8}/> {label}</label>
                ))}
              </div>
              {paymentType==='upi'&&(
                <div style={{marginTop:'0.875rem'}}>
                  <p className="form-label">Screenshot <span style={{color:'var(--danger)'}}>*</span></p>
                  {screenshotPreview?(
                    <div style={{position:'relative',display:'inline-block'}}>
                      <img src={screenshotPreview} alt="Preview" style={{height:140,borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',objectFit:'cover'}}/>
                      <button type="button" onClick={clearScreenshot} style={{position:'absolute',top:-8,right:-8,width:22,height:22,borderRadius:'50%',background:'var(--danger)',color:'#fff',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <X size={12} strokeWidth={3}/>
                      </button>
                    </div>
                  ):(
                    <label htmlFor="ss" style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'1.5rem',borderRadius:'var(--radius-md)',border:'2px dashed var(--border)',background:'var(--bg-inset)',cursor:'pointer',textAlign:'center',transition:'var(--transition)'}}>
                      <Upload size={28} strokeWidth={1.5} style={{color:'var(--text-muted)'}}/>
                      <span style={{fontSize:'0.84rem',fontWeight:500,color:'var(--text-secondary)',marginTop:'0.5rem'}}>Click to upload</span>
                      <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>PNG, JPG, WEBP — max 5 MB</span>
                      <input id="ss" ref={fileInputRef} type="file" accept="image/*" onChange={handleScreenshotChange} style={{display:'none'}}/>
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className="card anim-fade-up anim-delay-2" style={{padding:'1.25rem'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'0.875rem'}}>
                <div>
                  <p style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>Total Amount</p>
                  <p style={{fontSize:'1.5rem',fontWeight:800,color:'var(--text-primary)',letterSpacing:'-0.02em'}}>₹{totalAmount.toFixed(2)}</p>
                  <p style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{selectedIds.size} bill{selectedIds.size!==1?'s':''} selected</p>
                </div>
                <button type="submit" className="btn btn-primary" disabled={submitting||selectedIds.size===0||!hasSelectableBills} style={{padding:'0.65rem 1.75rem'}}>
                  {submitting?<><span className="spinner" style={{width:14,height:14}}/>Submitting…</>:'Submit Payment →'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
