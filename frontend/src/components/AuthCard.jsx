export default function AuthCard({ title, subtitle, children }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'var(--bg-base)' }}>
      {/* Left decorative panel */}
      <div style={{
        display:'none', flex:'0 0 45%',
        background:'linear-gradient(135deg, #4338ca 0%, #6366f1 40%, #818cf8 100%)',
        padding:'3rem', flexDirection:'column', justifyContent:'space-between',
        position:'relative', overflow:'hidden',
      }} className="auth-left-panel">
        <div style={{ position:'absolute',top:'-80px',right:'-80px',width:300,height:300,borderRadius:'50%',background:'rgba(255,255,255,0.08)' }}/>
        <div style={{ position:'absolute',bottom:'-60px',left:'-60px',width:200,height:200,borderRadius:'50%',background:'rgba(255,255,255,0.06)' }}/>

        <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',position:'relative' }}>
          <div style={{ width:44,height:44,borderRadius:12,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.25rem',fontWeight:800,color:'#fff',backdropFilter:'blur(8px)' }}>R</div>
          <span style={{ fontWeight:800,fontSize:'1.4rem',color:'#fff' }}>RentEase</span>
        </div>

        <div style={{ position:'relative' }}>
          <h2 style={{ fontSize:'2rem',fontWeight:800,color:'#fff',lineHeight:1.25,marginBottom:'1rem' }}>
            Manage rentals<br/><span style={{ color:'#c7d2fe' }}>effortlessly.</span>
          </h2>
          <p style={{ color:'#e0e7ff',fontSize:'0.95rem',lineHeight:1.6,maxWidth:'280px' }}>
            Track properties, bills, and payments — all in one place.
          </p>
          <div style={{ display:'flex',flexDirection:'column',gap:'0.75rem',marginTop:'2rem' }}>
            {['🏠 Multi-property management','📄 Auto bill generation','💳 UPI payment tracking'].map(f=>(
              <div key={f} style={{ display:'inline-flex',alignItems:'center',gap:'0.5rem',padding:'0.5rem 1rem',borderRadius:99,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.15)',color:'#e0e7ff',fontSize:'0.85rem',fontWeight:500,width:'fit-content' }}>{f}</div>
            ))}
          </div>
        </div>
        <p style={{ color:'rgba(255,255,255,0.4)',fontSize:'0.75rem',position:'relative' }}>© 2026 RentEase</p>
      </div>

      {/* Right form panel */}
      <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem 1rem' }}>
        <div style={{ width:'100%',maxWidth:'400px' }} className="anim-fade-up">
          <div style={{ display:'flex',alignItems:'center',gap:'0.625rem',marginBottom:'2rem' }} className="mobile-logo">
            <div style={{ width:38,height:38,borderRadius:10,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',fontWeight:800,color:'#fff',boxShadow:'0 2px 8px rgba(99,102,241,0.3)' }}>R</div>
            <span style={{ fontWeight:800,fontSize:'1.2rem',color:'var(--text-primary)' }}>Rent<span style={{color:'#6366f1'}}>Ease</span></span>
          </div>
          <h1 style={{ fontSize:'1.75rem',fontWeight:800,color:'var(--text-primary)',marginBottom:'0.35rem' }}>{subtitle}</h1>
          <p style={{ fontSize:'0.875rem',color:'var(--text-muted)',marginBottom:'2rem' }}>Welcome to {title}</p>
          {children}
        </div>
      </div>
      <style>{`
        @media (min-width: 768px) { .auth-left-panel { display: flex !important; } .mobile-logo { display: none !important; } }
      `}</style>
    </div>
  )
}
