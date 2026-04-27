function AuthCard({ title, subtitle, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-cyan-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <h1 className="text-center text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-center text-sm text-slate-600">{subtitle}</p>
        {children}
      </section>
    </main>
  )
}

export default AuthCard
