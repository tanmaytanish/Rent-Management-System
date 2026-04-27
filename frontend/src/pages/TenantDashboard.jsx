import { useEffect, useMemo, useState } from 'react'
import RoleNav from '../components/RoleNav'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

function TenantDashboard() {
  const { user } = useAuth()
  const [rentBills, setRentBills] = useState([])
  const [electricityBills, setElectricityBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true)
        const response = await api.get('/api/bills/my')

        setRentBills(response.data.rentBills || [])
        setElectricityBills(response.data.electricityBills || [])
      } catch (requestError) {
        setError(requestError?.response?.data?.error || 'Failed to load bills')
      } finally {
        setLoading(false)
      }
    }

    fetchBills()
  }, [])

  const groupedBills = useMemo(() => {
    const map = new Map()

    for (const bill of rentBills) {
      if (!map.has(bill.month)) {
        map.set(bill.month, { month: bill.month, rentBill: null, electricityBill: null })
      }
      map.get(bill.month).rentBill = bill
    }

    for (const bill of electricityBills) {
      if (!map.has(bill.month)) {
        map.set(bill.month, { month: bill.month, rentBill: null, electricityBill: null })
      }
      map.get(bill.month).electricityBill = bill
    }

    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month))
  }, [rentBills, electricityBills])

  const totalUnpaid = useMemo(() => {
    const unpaidRent = rentBills
      .filter((bill) => bill.status !== 'paid')
      .reduce((sum, bill) => sum + bill.totalAmount, 0)

    const unpaidElectricity = electricityBills
      .filter((bill) => bill.status !== 'paid')
      .reduce((sum, bill) => sum + bill.totalAmount, 0)

    return unpaidRent + unpaidElectricity
  }, [rentBills, electricityBills])

  const unpaidCount = useMemo(() => {
    return [...rentBills, ...electricityBills].filter((bill) => bill.status !== 'paid').length
  }, [rentBills, electricityBills])

  const renderStatus = (status) => {
    if (status === 'paid') {
      return 'bg-emerald-100 text-emerald-700'
    }

    if (status === 'pending') {
      return 'bg-amber-100 text-amber-700'
    }

    return 'bg-rose-100 text-rose-700'
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <RoleNav />

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Tenant Dashboard</h1>
          <p className="mt-1 text-slate-600">
            Hi {user?.name}, check rent status, lease details, and payment reminders here.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Debug: role={user?.role} | token={localStorage.getItem('token') ? 'present' : 'missing'}
          </p>
        </section>

        {error && (
          <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Billing Months
            </h2>
            <p className="mt-2 text-2xl font-bold text-slate-900">{groupedBills.length}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Unpaid Bills</h2>
            <p className="mt-2 text-2xl font-bold text-slate-900">{unpaidCount}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Outstanding Amount
            </h2>
            <p className="mt-2 text-2xl font-bold text-slate-900">Rs {totalUnpaid.toFixed(2)}</p>
          </article>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Monthly Bills</h2>

          {loading ? (
            <p className="mt-4 text-sm text-slate-600">Loading monthly bills...</p>
          ) : groupedBills.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No monthly bills generated yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {groupedBills.map((item) => (
                <article key={item.month} className="rounded-lg border border-slate-200 p-4">
                  <h3 className="text-base font-semibold text-slate-900">{item.month}</h3>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">Rent + Water Bill</p>
                        {item.rentBill ? (
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${renderStatus(item.rentBill.status)}`}
                          >
                            {item.rentBill.status}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Not generated</span>
                        )}
                      </div>

                      {item.rentBill && (
                        <div className="mt-2 space-y-1 text-sm text-slate-700">
                          <p>Rent: Rs {item.rentBill.rentAmount}</p>
                          <p>Water: Rs {item.rentBill.waterAmount}</p>
                          <p>Total: Rs {item.rentBill.totalAmount}</p>
                        </div>
                      )}
                    </div>

                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">Electricity Bill</p>
                        {item.electricityBill ? (
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${renderStatus(item.electricityBill.status)}`}
                          >
                            {item.electricityBill.status}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Not generated</span>
                        )}
                      </div>

                      {item.electricityBill && (
                        <div className="mt-2 space-y-1 text-sm text-slate-700">
                          <p>
                            Reading: {item.electricityBill.prevReading} - {item.electricityBill.currReading}
                          </p>
                          <p>Units: {item.electricityBill.units}</p>
                          <p>Rate: Rs {item.electricityBill.rate}</p>
                          <p>Total: Rs {item.electricityBill.totalAmount}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default TenantDashboard
