import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import RoleNav from '../components/RoleNav'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

function OwnerDashboard() {
  const { user } = useAuth()
  const location = useLocation()

  const [properties, setProperties] = useState([])
  const [flatsByProperty, setFlatsByProperty] = useState({})
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  const [propertyForm, setPropertyForm] = useState({ name: '', address: '' })
  const [flatForm, setFlatForm] = useState({ propertyId: '', flatNumber: '', rentAmount: '' })
  const [tenantForm, setTenantForm] = useState({
    name: '',
    mobileNumber: '',
    propertyId: '',
    flatId: '',
    joinDate: '',
  })

  const [submittingProperty, setSubmittingProperty] = useState(false)
  const [submittingFlat, setSubmittingFlat] = useState(false)
  const [submittingTenant, setSubmittingTenant] = useState(false)

  const [pendingPayments, setPendingPayments] = useState([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [rejectNoteMap, setRejectNoteMap] = useState({})
  const [rejectOpenMap, setRejectOpenMap] = useState({})
  const [processingPayment, setProcessingPayment] = useState(null)

  const activeOccupiedFlatIds = useMemo(
    () => new Set(tenants.filter((tenant) => tenant.status === 'active').map((tenant) => tenant.flatId?._id)),
    [tenants],
  )

  const tenantFlatOptions = useMemo(() => {
    if (!tenantForm.propertyId) {
      return []
    }

    const flats = flatsByProperty[tenantForm.propertyId] || []

    return flats.filter((flat) => !activeOccupiedFlatIds.has(flat._id))
  }, [tenantForm.propertyId, flatsByProperty, activeOccupiedFlatIds])

  const showError = (error, fallbackMessage) => {
    setNotice({ type: 'error', text: error?.response?.data?.error || fallbackMessage })
  }

  const showSuccess = (text) => {
    setNotice({ type: 'success', text })
  }

  useEffect(() => {
    if (location.state?.successMessage) {
      showSuccess(location.state.successMessage)
    }

    const storedNotice = localStorage.getItem('post_login_notice')
    if (storedNotice) {
      showSuccess(storedNotice)
      localStorage.removeItem('post_login_notice')
    }
  }, [location.state])

  const fetchOwnerProperties = async () => {
    const response = await api.get('/api/owner/properties')
    const list = response.data.properties || []
    setProperties(list)
    return list
  }

  const fetchOwnerTenants = async () => {
    const response = await api.get('/api/owner/tenants')
    setTenants(response.data.tenants || [])
  }

  const fetchPendingPayments = async () => {
    try {
      setLoadingPayments(true)
      const res = await api.get('/api/payments/pending')
      setPendingPayments(res.data.payments || [])
    } catch (error) {
      // non-critical: don't block the dashboard
    } finally {
      setLoadingPayments(false)
    }
  }

  const fetchFlatsForProperty = async (propertyId) => {
    if (!propertyId) {
      return []
    }

    const response = await api.get(`/api/properties/${propertyId}/flats`)
    const list = response.data.flats || []

    setFlatsByProperty((prev) => ({ ...prev, [propertyId]: list }))
    return list
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const propertyList = await fetchOwnerProperties()
        await fetchOwnerTenants()
        await Promise.all(propertyList.map((property) => fetchFlatsForProperty(property._id)))
      } catch (error) {
        showError(error, 'Failed to load owner management data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
    fetchPendingPayments()
  }, [])

  const handlePropertySubmit = async (event) => {
    event.preventDefault()

    try {
      setSubmittingProperty(true)
      const response = await api.post('/api/properties', propertyForm)
      const newProperty = response.data.property

      setProperties((prev) => [newProperty, ...prev])
      setPropertyForm({ name: '', address: '' })
      showSuccess('Property created successfully')
    } catch (error) {
      showError(error, 'Failed to create property')
    } finally {
      setSubmittingProperty(false)
    }
  }

  const handleFlatSubmit = async (event) => {
    event.preventDefault()

    try {
      setSubmittingFlat(true)

      const payload = {
        propertyId: flatForm.propertyId,
        flatNumber: flatForm.flatNumber,
        rentAmount: Number(flatForm.rentAmount),
      }

      const response = await api.post('/api/flats', payload)
      const createdFlat = response.data.flat

      setFlatsByProperty((prev) => {
        const existing = prev[createdFlat.propertyId] || []
        return { ...prev, [createdFlat.propertyId]: [...existing, createdFlat] }
      })

      setFlatForm({ propertyId: flatForm.propertyId, flatNumber: '', rentAmount: '' })
      showSuccess('Flat created successfully')
    } catch (error) {
      showError(error, 'Failed to create flat')
    } finally {
      setSubmittingFlat(false)
    }
  }

  const handleTenantPropertyChange = async (propertyId) => {
    setTenantForm((prev) => ({ ...prev, propertyId, flatId: '' }))

    try {
      if (propertyId && !flatsByProperty[propertyId]) {
        await fetchFlatsForProperty(propertyId)
      }
    } catch (error) {
      showError(error, 'Failed to load flats for selected property')
    }
  }

  const handleTenantSubmit = async (event) => {
    event.preventDefault()

    try {
      setSubmittingTenant(true)

      const payload = {
        name: tenantForm.name,
        mobileNumber: tenantForm.mobileNumber,
        propertyId: tenantForm.propertyId,
        flatId: tenantForm.flatId,
        joinDate: tenantForm.joinDate,
      }

      const response = await api.post('/api/tenants', payload)

      await fetchOwnerTenants()
      await fetchFlatsForProperty(tenantForm.propertyId)

      setTenantForm({ name: '', mobileNumber: '', propertyId: '', flatId: '', joinDate: '' })
      showSuccess(
        `Tenant created successfully. Default password: ${response.data.defaultPassword}`,
      )
    } catch (error) {
      showError(error, 'Failed to create tenant')
    } finally {
      setSubmittingTenant(false)
    }
  }

  const handleApprovePayment = async (paymentId) => {
    try {
      setProcessingPayment(paymentId)
      await api.patch(`/api/payments/${paymentId}/approve`)
      showSuccess('Payment approved successfully')
      await fetchPendingPayments()
    } catch (error) {
      showError(error, 'Failed to approve payment')
    } finally {
      setProcessingPayment(null)
    }
  }

  const handleRejectPayment = async (paymentId) => {
    const note = rejectNoteMap[paymentId] || ''
    try {
      setProcessingPayment(paymentId)
      await api.patch(`/api/payments/${paymentId}/reject`, { reviewNote: note })
      showSuccess('Payment rejected')
      setRejectOpenMap((prev) => ({ ...prev, [paymentId]: false }))
      setRejectNoteMap((prev) => ({ ...prev, [paymentId]: '' }))
      await fetchPendingPayments()
    } catch (error) {
      showError(error, 'Failed to reject payment')
    } finally {
      setProcessingPayment(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <RoleNav />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Owner Management</h1>
          <p className="mt-1 text-slate-600">
            Logged in as <span className="font-semibold">{user?.name}</span>. Manage properties,
            flats, and tenants from one place.
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

        {/* ── Payment Requests ─────────────────────────────────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Payment Requests</h2>
            {pendingPayments.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                {pendingPayments.length} pending
              </span>
            )}
          </div>

          {loadingPayments ? (
            <p className="mt-4 text-sm text-slate-500">Loading payment requests…</p>
          ) : pendingPayments.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No pending payment requests.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {pendingPayments.map((payment) => {
                const tenantName = payment.tenantId?.userId?.name || 'Unknown'
                const tenantMobile = payment.tenantId?.userId?.mobileNumber || '—'
                const isBusy = processingPayment === payment._id

                return (
                  <article
                    key={payment._id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    {/* Tenant info row */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{tenantName}</p>
                        <p className="text-xs text-slate-500">{tenantMobile}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">Rs {payment.totalAmount.toFixed(2)}</p>
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold capitalize text-sky-700">
                          {payment.paymentType}
                        </span>
                      </div>
                    </div>

                    {/* Bills list */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {payment.bills.map((bill, idx) => (
                        <span
                          key={idx}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                        >
                          {bill.month} · {bill.billType} · Rs {bill.amount}
                        </span>
                      ))}
                    </div>

                    {/* Screenshot (UPI) */}
                    {payment.screenshotUrl && (
                      <div className="mt-3">
                        <a
                          href={payment.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          <img
                            src={payment.screenshotUrl}
                            alt="Payment screenshot"
                            className="h-24 w-auto rounded-lg border border-slate-200 object-cover shadow-sm transition hover:opacity-80"
                          />
                        </a>
                        <p className="mt-1 text-xs text-slate-400">Click to view full size</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 space-y-2">
                      {!rejectOpenMap[payment._id] ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleApprovePayment(payment._id)}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {isBusy ? 'Processing…' : '✓ Approve'}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              setRejectOpenMap((prev) => ({ ...prev, [payment._id]: true }))
                            }
                            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            placeholder="Rejection reason (optional)"
                            value={rejectNoteMap[payment._id] || ''}
                            onChange={(e) =>
                              setRejectNoteMap((prev) => ({ ...prev, [payment._id]: e.target.value }))
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-red-400 focus:ring-2"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRejectPayment(payment._id)}
                              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                            >
                              {isBusy ? 'Processing…' : 'Confirm Reject'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setRejectOpenMap((prev) => ({ ...prev, [payment._id]: false }))
                              }
                              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Properties</h2>
            <p className="mt-2 text-3xl font-bold text-slate-900">{properties.length}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Flats</h2>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {Object.values(flatsByProperty).reduce((count, flats) => count + flats.length, 0)}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Active Tenants</h2>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {tenants.filter((tenant) => tenant.status === 'active').length}
            </p>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={handlePropertySubmit}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-900">Add Property</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="propertyName">
                  Property Name
                </label>
                <input
                  id="propertyName"
                  value={propertyForm.name}
                  onChange={(event) => setPropertyForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                  placeholder="Skyline Residency"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="propertyAddress">
                  Address
                </label>
                <textarea
                  id="propertyAddress"
                  value={propertyForm.address}
                  onChange={(event) =>
                    setPropertyForm((prev) => ({ ...prev, address: event.target.value }))
                  }
                  required
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                  placeholder="Street, city, state"
                />
              </div>

              <button
                type="submit"
                disabled={submittingProperty}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submittingProperty ? 'Saving...' : 'Add Property'}
              </button>
            </div>
          </form>

          <form
            onSubmit={handleFlatSubmit}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-900">Add Flat</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="flatProperty">
                  Property
                </label>
                <select
                  id="flatProperty"
                  value={flatForm.propertyId}
                  onChange={(event) =>
                    setFlatForm((prev) => ({ ...prev, propertyId: event.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property._id} value={property._id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="flatNumber">
                  Flat Number
                </label>
                <input
                  id="flatNumber"
                  value={flatForm.flatNumber}
                  onChange={(event) =>
                    setFlatForm((prev) => ({ ...prev, flatNumber: event.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                  placeholder="A-101"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="rentAmount">
                  Rent Amount
                </label>
                <input
                  id="rentAmount"
                  type="number"
                  min="0"
                  value={flatForm.rentAmount}
                  onChange={(event) =>
                    setFlatForm((prev) => ({ ...prev, rentAmount: event.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                  placeholder="15000"
                />
              </div>

              <button
                type="submit"
                disabled={submittingFlat || properties.length === 0}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submittingFlat ? 'Saving...' : 'Add Flat'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Add Tenant</h3>

          <form onSubmit={handleTenantSubmit} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tenantName">
                Name
              </label>
              <input
                id="tenantName"
                value={tenantForm.name}
                onChange={(event) => setTenantForm((prev) => ({ ...prev, name: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tenantMobile">
                Mobile
              </label>
              <input
                id="tenantMobile"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                value={tenantForm.mobileNumber}
                onChange={(event) =>
                  setTenantForm((prev) => ({ ...prev, mobileNumber: event.target.value }))
                }
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tenantProperty">
                Property
              </label>
              <select
                id="tenantProperty"
                value={tenantForm.propertyId}
                onChange={(event) => handleTenantPropertyChange(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
              >
                <option value="">Select property</option>
                {properties.map((property) => (
                  <option key={property._id} value={property._id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="tenantFlat">
                Flat
              </label>
              <select
                id="tenantFlat"
                value={tenantForm.flatId}
                onChange={(event) => setTenantForm((prev) => ({ ...prev, flatId: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
              >
                <option value="">Select flat</option>
                {tenantFlatOptions.map((flat) => (
                  <option key={flat._id} value={flat._id}>
                    {flat.flatNumber} (Rs {flat.rentAmount})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="joinDate">
                Join Date
              </label>
              <input
                id="joinDate"
                type="date"
                value={tenantForm.joinDate}
                onChange={(event) => setTenantForm((prev) => ({ ...prev, joinDate: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={submittingTenant || properties.length === 0}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submittingTenant ? 'Saving...' : 'Add Tenant'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Tenant List</h3>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-600">Loading tenant data...</p>
          ) : tenants.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No tenants added yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Tenant</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Mobile</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Property</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Flat</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Rent</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Join Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants.map((tenant) => (
                    <tr key={tenant._id}>
                      <td className="px-3 py-2 text-slate-900">{tenant.userId?.name}</td>
                      <td className="px-3 py-2 text-slate-700">{tenant.userId?.mobileNumber}</td>
                      <td className="px-3 py-2 text-slate-700">{tenant.propertyId?.name}</td>
                      <td className="px-3 py-2 text-slate-700">{tenant.flatId?.flatNumber}</td>
                      <td className="px-3 py-2 text-slate-700">Rs {tenant.flatId?.rentAmount}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {tenant.joinDate ? new Date(tenant.joinDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            tenant.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default OwnerDashboard
