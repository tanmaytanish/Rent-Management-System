import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import RoleNav from '../components/RoleNav'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

function statusBadge(status) {
  if (status === 'paid') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'pending') {
    return 'bg-amber-100 text-amber-700'
  }

  return 'bg-rose-100 text-rose-700'
}

function BillsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [ownerTenants, setOwnerTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [rentBills, setRentBills] = useState([])
  const [electricityBills, setElectricityBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(new Set())

  const [generateForm, setGenerateForm] = useState({
    month: '',
    waterAmount: '',
    dueDate: '',
    prevReading: '',
    currReading: '',
    rate: '',
  })

  const groupedBills = useMemo(() => {
    const monthMap = new Map()

    for (const bill of rentBills) {
      if (!monthMap.has(bill.month)) {
        monthMap.set(bill.month, { month: bill.month, rentBill: null, electricityBill: null })
      }
      monthMap.get(bill.month).rentBill = bill
    }

    for (const bill of electricityBills) {
      if (!monthMap.has(bill.month)) {
        monthMap.set(bill.month, { month: bill.month, rentBill: null, electricityBill: null })
      }
      monthMap.get(bill.month).electricityBill = bill
    }

    return Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month))
  }, [rentBills, electricityBills])

  const statusLabel = (status) => {
    if (status === 'paid') {
      return 'Paid'
    }

    if (status === 'pending') {
      return 'Pending'
    }

    return 'Unpaid'
  }

  const fetchBills = async (tenantIdOverride) => {
    const tenantIdToUse = tenantIdOverride || selectedTenantId

    if (user?.role === 'owner') {
      if (!tenantIdToUse) {
        setRentBills([])
        setElectricityBills([])
        return
      }

      const response = await api.get(`/api/bills/tenant/${tenantIdToUse}`)
      setRentBills(response.data.rentBills || [])
      setElectricityBills(response.data.electricityBills || [])
      return
    }

    const response = await api.get('/api/bills/my')
    setRentBills(response.data.rentBills || [])
    setElectricityBills(response.data.electricityBills || [])
  }

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)

        if (user?.role === 'owner') {
          const tenantsResponse = await api.get('/api/owner/tenants')
          const tenants = tenantsResponse.data.tenants || []
          setOwnerTenants(tenants)

          if (tenants.length > 0) {
            const defaultTenantId = tenants[0]._id
            setSelectedTenantId(defaultTenantId)
            await fetchBills(defaultTenantId)
          }
        } else {
          await fetchBills()
        }
      } catch (error) {
        setNotice({ type: 'error', text: error?.response?.data?.error || 'Failed to load bills' })
      } finally {
        setLoading(false)
      }
    }

    if (user?.role) {
      loadInitialData()
    }
  }, [user?.role])

  useEffect(() => {
    if (location.state?.notice) {
      setNotice(location.state.notice)
    }
  }, [location.state])

  const handleTenantChange = async (tenantId) => {
    setSelectedTenantId(tenantId)
    setNotice(null)

    try {
      setLoading(true)
      await fetchBills(tenantId)
    } catch (error) {
      setNotice({ type: 'error', text: error?.response?.data?.error || 'Failed to load tenant bills' })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateBills = async (event) => {
    event.preventDefault()

    if (!selectedTenantId) {
      setNotice({ type: 'error', text: 'Select a tenant before generating bills' })
      return
    }

    try {
      setGenerating(true)
      setNotice(null)

      await api.post('/api/bills/generate-monthly', {
        tenantId: selectedTenantId,
        month: generateForm.month,
        waterAmount: Number(generateForm.waterAmount),
        dueDate: generateForm.dueDate,
        prevReading: Number(generateForm.prevReading),
        currReading: Number(generateForm.currReading),
        rate: Number(generateForm.rate),
      })

      await fetchBills(selectedTenantId)
      setGenerateForm({ month: '', waterAmount: '', dueDate: '', prevReading: '', currReading: '', rate: '' })
      setNotice({ type: 'success', text: 'Monthly bills generated successfully' })
    } catch (error) {
      setNotice({ type: 'error', text: error?.response?.data?.error || 'Failed to generate bills' })
    } finally {
      setGenerating(false)
    }
  }

  const handlePayNow = () => {
    navigate('/payment')
  }

  const handleMarkPaid = async (billType, billId) => {
    setMarkingPaid((prev) => new Set(prev).add(billId))
    setNotice(null)
    try {
      await api.post('/api/payments/manual', { billType, billId })
      await fetchBills(selectedTenantId)
      setNotice({ type: 'success', text: `${billType === 'rent' ? 'Rent' : 'Electricity'} bill marked as paid.` })
    } catch (error) {
      setNotice({ type: 'error', text: error?.response?.data?.error || 'Failed to mark bill as paid' })
    } finally {
      setMarkingPaid((prev) => {
        const next = new Set(prev)
        next.delete(billId)
        return next
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <RoleNav />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Bills</h1>
          <p className="mt-1 text-slate-600">
            {user?.role === 'owner'
              ? 'Generate monthly bills and monitor payment statuses for your tenants.'
              : 'Review your rent-water and electricity bills grouped by month.'}
          </p>
        </section>

        {notice && (
          <section
            className={`rounded-lg border px-4 py-3 text-sm ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {notice.text}
          </section>
        )}

        {user?.role === 'owner' && (
          <section className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Select Tenant</h2>
              <select
                value={selectedTenantId}
                onChange={(event) => handleTenantChange(event.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
              >
                <option value="">Select tenant</option>
                {ownerTenants.map((tenant) => (
                  <option key={tenant._id} value={tenant._id}>
                    {tenant.userId?.name} - {tenant.flatId?.flatNumber}
                  </option>
                ))}
              </select>
            </article>

            <form
              onSubmit={handleGenerateBills}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">Generate Monthly Bills</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  type="month"
                  required
                  value={generateForm.month}
                  onChange={(event) => setGenerateForm((prev) => ({ ...prev, month: event.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                />
                <input
                  type="date"
                  required
                  value={generateForm.dueDate}
                  onChange={(event) =>
                    setGenerateForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Water amount"
                  required
                  value={generateForm.waterAmount}
                  onChange={(event) =>
                    setGenerateForm((prev) => ({ ...prev, waterAmount: event.target.value }))
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Rate per unit"
                  required
                  value={generateForm.rate}
                  onChange={(event) => setGenerateForm((prev) => ({ ...prev, rate: event.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Previous reading"
                  required
                  value={generateForm.prevReading}
                  onChange={(event) =>
                    setGenerateForm((prev) => ({ ...prev, prevReading: event.target.value }))
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Current reading"
                  required
                  value={generateForm.currReading}
                  onChange={(event) =>
                    setGenerateForm((prev) => ({ ...prev, currReading: event.target.value }))
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                />
              </div>

              <button
                type="submit"
                disabled={generating || !selectedTenantId}
                className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {generating ? 'Generating...' : 'Generate Bills'}
              </button>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Monthly Bills</h2>

          {loading ? (
            <p className="mt-4 text-sm text-slate-600">Loading bills...</p>
          ) : groupedBills.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No bills available.</p>
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
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(item.rentBill.status)}`}
                          >
                            {statusLabel(item.rentBill.status)}
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
                          {item.rentBill.dueDate && (
                            <p>Due: {new Date(item.rentBill.dueDate).toLocaleDateString()}</p>
                          )}
                        </div>
                      )}

                      {user?.role === 'tenant' && item.rentBill && item.rentBill.status === 'unpaid' && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={handlePayNow}
                            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Make Payment
                          </button>
                        </div>
                      )}

                      {user?.role === 'owner' && item.rentBill && item.rentBill.status === 'unpaid' && (
                        <div className="mt-3">
                          <button
                            type="button"
                            disabled={markingPaid.has(item.rentBill._id)}
                            onClick={() => handleMarkPaid('rent', item.rentBill._id)}
                            className="rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                          >
                            {markingPaid.has(item.rentBill._id) ? 'Marking…' : '✓ Mark Rent Paid'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">Electricity Bill</p>
                        {item.electricityBill ? (
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(item.electricityBill.status)}`}
                          >
                            {statusLabel(item.electricityBill.status)}
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

                      {user?.role === 'tenant' &&
                        item.electricityBill &&
                        item.electricityBill.status === 'unpaid' && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={handlePayNow}
                              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                              Make Payment
                            </button>
                          </div>
                        )}

                      {user?.role === 'owner' &&
                        item.electricityBill &&
                        item.electricityBill.status === 'unpaid' && (
                          <div className="mt-3">
                            <button
                              type="button"
                              disabled={markingPaid.has(item.electricityBill._id)}
                              onClick={() => handleMarkPaid('electricity', item.electricityBill._id)}
                              className="rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                            >
                              {markingPaid.has(item.electricityBill._id) ? 'Marking…' : '✓ Mark Electricity Paid'}
                            </button>
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

export default BillsPage
