import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Phone, Lock, Eye, EyeOff, Building2, FileText, CreditCard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function InputField({ id, label, type='text', value, onChange, placeholder, Icon, rightElement, ...rest }) {
  return (
    <div style={{ marginBottom:'1.125rem' }}>
      <label style={{ display:'block',fontSize:'0.78rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:'0.4rem',letterSpacing:'0.01em' }} htmlFor={id}>{label}</label>
      <div style={{ position:'relative' }}>
        {Icon&&<span style={{ position:'absolute',left:'0.85rem',top:'50%',transform:'translateY(-50%)',color:'#94a3b8',pointerEvents:'none',display:'flex' }}><Icon size={16} strokeWidth={1.8}/></span>}
        <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder}
          style={{
            width:'100%',padding:'0.7rem 0.875rem',paddingLeft:Icon?'2.5rem':'0.875rem',
            paddingRight:rightElement?'2.75rem':'0.875rem',
            background:'#f8f9fc',border:'1.5px solid #e2e5f0',borderRadius:'10px',
            fontSize:'0.875rem',color:'#0f172a',fontFamily:'inherit',outline:'none',
            transition:'all 0.2s ease',
          }}
          onFocus={e=>{e.target.style.borderColor='#6366f1';e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.12)';e.target.style.background='#fff'}}
          onBlur={e=>{e.target.style.borderColor='#e2e5f0';e.target.style.boxShadow='none';e.target.style.background='#f8f9fc'}}
          {...rest}/>
        {rightElement&&<div style={{ position:'absolute',right:'0.5rem',top:'50%',transform:'translateY(-50%)' }}>{rightElement}</div>}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [mobileNumber, setMobileNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (isAuthenticated && user) return <Navigate to={user.role==='tenant'?'/tenant/dashboard':'/owner/dashboard'} replace/>

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      const u = await login(mobileNumber.trim(), password)
      toast.success('Login successful!')
      const dest = u.role==='admin'?'/admin/dashboard':u.role==='tenant'?'/tenant/dashboard':'/owner/dashboard'
      window.location.assign(dest)
    }
    catch(err) { setError(err?.response?.data?.error||'Login failed.'); toast.error(err?.response?.data?.error||'Login failed.') } finally { setSubmitting(false) }
  }

  const EyeToggle = (
    <button type="button" onClick={()=>setShowPassword(p=>!p)} tabIndex={-1}
      style={{ background:'none',border:'none',cursor:'pointer',padding:'0.3rem',display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',borderRadius:'6px',transition:'all 0.15s' }}
      onMouseEnter={e=>e.currentTarget.style.color='#6366f1'}
      onMouseLeave={e=>e.currentTarget.style.color='#94a3b8'}
      aria-label={showPassword?'Hide password':'Show password'}>
      {showPassword ? <EyeOff size={16} strokeWidth={1.8}/> : <Eye size={16} strokeWidth={1.8}/>}
    </button>
  )

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'#f0f2f8' }}>
      {/* Left panel */}
      <div className="auth-left-panel" style={{
        display:'none', flex:'0 0 48%',
        background:'linear-gradient(160deg, #312e81 0%, #4f46e5 35%, #6366f1 60%, #818cf8 100%)',
        padding:'2.5rem', flexDirection:'column', justifyContent:'space-between',
        position:'relative', overflow:'hidden',
      }}>
        {/* Decorative shapes */}
        <div style={{ position:'absolute',top:'-120px',right:'-120px',width:380,height:380,borderRadius:'50%',background:'rgba(255,255,255,0.05)' }}/>
        <div style={{ position:'absolute',bottom:'-80px',left:'-80px',width:260,height:260,borderRadius:'50%',background:'rgba(255,255,255,0.04)' }}/>
        <div style={{ position:'absolute',top:'40%',right:'15%',width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,0.03)' }}/>

        <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',position:'relative' }}>
          <div style={{
            width:42,height:42,borderRadius:12,
            background:'rgba(255,255,255,0.15)',backdropFilter:'blur(12px)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:'1.2rem',fontWeight:900,color:'#fff',
            border:'1px solid rgba(255,255,255,0.2)',
          }}>R</div>
          <span style={{ fontWeight:800,fontSize:'1.35rem',color:'#fff',letterSpacing:'-0.02em' }}>RentEase</span>
        </div>

        <div style={{ position:'relative',flex:1,display:'flex',flexDirection:'column',justifyContent:'center' }}>
          <h2 style={{ fontSize:'2.25rem',fontWeight:800,color:'#fff',lineHeight:1.2,marginBottom:'0.75rem',letterSpacing:'-0.02em' }}>
            Manage rentals<br/><span style={{ color:'#c7d2fe' }}>effortlessly.</span>
          </h2>
          <p style={{ color:'#e0e7ff',fontSize:'0.95rem',lineHeight:1.7,maxWidth:'320px',fontWeight:400 }}>
            Track properties, bills, and payments — all in one streamlined platform.
          </p>
          <div style={{ display:'flex',flexDirection:'column',gap:'0.625rem',marginTop:'2rem' }}>
            {[
              { Icon: Building2, text: 'Multi-property management' },
              { Icon: FileText,  text: 'Auto bill generation' },
              { Icon: CreditCard,text: 'UPI payment tracking' },
            ].map((f,i) => (
              <div key={i} style={{
                display:'inline-flex',alignItems:'center',gap:'0.625rem',
                padding:'0.6rem 1.1rem',borderRadius:12,
                background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',
                color:'#e0e7ff',fontSize:'0.84rem',fontWeight:500,width:'fit-content',
                backdropFilter:'blur(4px)',
              }}>
                <f.Icon size={16} strokeWidth={1.8}/>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        <p style={{ color:'rgba(255,255,255,0.35)',fontSize:'0.72rem',position:'relative',letterSpacing:'0.02em' }}>© 2026 RentEase. All rights reserved.</p>
      </div>

      {/* Right form */}
      <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem 1.5rem' }}>
        <div style={{ width:'100%',maxWidth:'380px' }} className="anim-fade-up">
          {/* Mobile logo */}
          <div className="mobile-logo" style={{ display:'flex',alignItems:'center',gap:'0.625rem',marginBottom:'2.5rem' }}>
            <div style={{
              width:38,height:38,borderRadius:10,
              background:'linear-gradient(135deg,#6366f1,#4f46e5)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:'1rem',fontWeight:900,color:'#fff',
              boxShadow:'0 4px 12px rgba(99,102,241,0.3)',
            }}>R</div>
            <span style={{ fontWeight:800,fontSize:'1.2rem',color:'#0f172a',letterSpacing:'-0.02em' }}>Rent<span style={{color:'#6366f1'}}>Ease</span></span>
          </div>

          <h1 style={{ fontSize:'1.75rem',fontWeight:800,color:'#0f172a',marginBottom:'0.3rem',letterSpacing:'-0.025em' }}>Welcome back</h1>
          <p style={{ fontSize:'0.875rem',color:'#94a3b8',marginBottom:'2rem',fontWeight:400 }}>Sign in to your RentEase account</p>

          <form onSubmit={handleSubmit}>
            <InputField id="mobileNumber" label="Mobile Number" type="tel" inputMode="numeric" pattern="[0-9]{10}" value={mobileNumber} onChange={e=>setMobileNumber(e.target.value)} placeholder="Enter 10-digit mobile" Icon={Phone} required/>
            <InputField id="password" label="Password" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" Icon={Lock} rightElement={EyeToggle} required/>

            {error && (
              <div style={{
                padding:'0.65rem 0.875rem',borderRadius:'8px',fontSize:'0.82rem',fontWeight:500,
                background:'#fef2f2',border:'1px solid #fecaca',color:'#991b1b',
                display:'flex',alignItems:'center',gap:'0.4rem',marginBottom:'1rem',
              }}>
                <span style={{fontWeight:700,color:'#dc2626'}}>!</span> {error}
              </div>
            )}

            <button type="submit" disabled={submitting} style={{
              width:'100%',padding:'0.75rem',fontSize:'0.9rem',fontWeight:700,
              background:'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color:'#fff',border:'none',borderRadius:'10px',cursor:'pointer',
              fontFamily:'inherit',transition:'all 0.2s ease',
              boxShadow:'0 2px 8px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
              display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem',
              opacity: submitting ? 0.7 : 1,
            }}
            onMouseEnter={e=>{if(!submitting){e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 16px rgba(99,102,241,0.4)'}}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 2px 8px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'}}>
              {submitting?<><span className="spinner" style={{width:16,height:16,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}}/>Signing in…</>:'Sign In →'}
            </button>

            <div style={{display:'flex',alignItems:'center',gap:'0.75rem',margin:'1.75rem 0'}}>
              <div style={{flex:1,height:1,background:'#e2e5f0'}}/>
              <span style={{fontSize:'0.72rem',color:'#94a3b8',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.08em'}}>or</span>
              <div style={{flex:1,height:1,background:'#e2e5f0'}}/>
            </div>

            <p style={{textAlign:'center',fontSize:'0.84rem',color:'#64748b'}}>
              <Link to="/register" style={{color:'#6366f1',fontWeight:700,textDecoration:'none',transition:'color 0.15s'}} onMouseEnter={e=>e.currentTarget.style.color='#4f46e5'} onMouseLeave={e=>e.currentTarget.style.color='#6366f1'}>Owner Registration →</Link>
            </p>
          </form>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) { .auth-left-panel { display: flex !important; } .mobile-logo { display: none !important; } }
      `}</style>
    </div>
  )
}
