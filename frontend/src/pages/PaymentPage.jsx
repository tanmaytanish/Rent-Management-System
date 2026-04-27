import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RoleNav from '../components/RoleNav'
import api from '../lib/api'

const STATUS_STYLES = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  unpaid: 'bg-rose-100 text-rose-700',
}

function PaymentPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [rentBills, setRentBills] = useState([])
  const [electricityBills, setElectricityBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [paymentType, setPaymentType] = useState('upi')
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)

  // ── Load bills ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await api.get('/api/bills/my')
        setRentBills(res.data.rentBills || [])
        setElectricityBills(res.data.electricityBills || [])
      } catch (err) {
        setFetchError(err?.response?.data?.error || 'Failed to load bills')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Group by month ────────────────────────────────────────────────────────
  const groupedBills = useMemo(() => {
    const map = new Map()
    for (const bill of rentBills) {
      if (!map.has(bill.month)) map.set(bill.month, { month: bill.month, rentBill: null, electricityBill: null })
      map.get(bill.month).rentBill = bill
    }
    for (const bill of electricityBills) {
      if (!map.has(bill.month)) map.set(bill.month, { month: bill.month, rentBill: null, electricityBill: null })
      map.get(bill.month).electricityBill = bill
    }
    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month))
  }, [rentBills, electricityBills])

  // Flat map for quick lookup: id → { bill, billType }
  const billMap = useMemo(() => {
    const m = new Map()
    for (const b of rentBills) m.set(b._id, { ...b, billType: 'rent' })
    for (const b of electricityBills) m.set(b._id, { ...b, billType: 'electricity' })
    return m
  }, [rentBills, electricityBills])

  // ── Derived: auto-calculated total ───────────────────────────────────────
  const totalAmount = useMemo(() => {
    let sum = 0
    for (const id of selectedIds) {
      const bill = billMap.get(id)
      if (bill) sum += bill.totalAmount
    }
    return sum
  }, [selectedIds, billMap])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleBill = (billId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(billId) ? next.delete(billId) : next.add(billId)
      return next
    })
  }

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScreenshot(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  const clearScreenshot = () => {
    setScreenshot(null)
    setScreenshotPreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type)
    if (type !== 'upi') clearScreenshot()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setNotice(null)

    if (selectedIds.size === 0) {
      setNotice({ type: 'error', text: 'Please select at least one bill to pay.' })
      return
    }
    if (paymentType === 'upi' && !screenshot) {
      setNotice({ type: 'error', text: 'Please upload your UPI payment screenshot.' })
      return
    }

    const billsArray = Array.from(selectedIds).map((id) => {
      const bill = billMap.get(id)
      return { billType: bill.billType, billId: id }
    })

    const formData = new FormData()
    formData.append('bills', JSON.stringify(billsArray))
    formData.append('paymentType', paymentType)
    formData.append('totalAmount', String(totalAmount))
    if (screenshot) formData.append('screenshot', screenshot)

    try {
      setSubmitting(true)
      await api.post('/api/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigate('/bills', {
        replace: true,
        state: {
          notice: {
            type: 'success',
            text: 'Payment submitted! Awaiting owner approval.',
          },
        },
      })
    } catch (err) {
      setNotice({ type: 'error', text: err?.response?.data?.error || 'Failed to submit payment' })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const hasSelectableBills = [...billMap.values()].some((b) => b.status === 'unpaid')

  return (
    <div className="min-h-screen bg-slate-100">
      <RoleNav />

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
        {/* Header */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Make a Payment</h1>
          <p className="mt-1 text-slate-600">
            Select the bills you want to pay, choose payment method, and submit for owner approval.
          </p>
        </section>

        {/* Notice */}
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

        {loading ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Loading your bills...</p>
          </section>
        ) : fetchError ? (
          <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {fetchError}
          </section>
        ) : groupedBills.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">No bills found. Bills will appear once your owner generates them.</p>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Bill Selection */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Select Bills to Pay</h2>
              <p className="mt-0.5 text-xs text-slate-500">Only unpaid bills can be selected.</p>

              <div className="mt-4 space-y-4">
                {groupedBills.map((group) => (
                  <div key={group.month} className="rounded-lg border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-700">{group.month}</p>
                    <div className="space-y-2">
                      {/* Rent Bill */}
                      {group.rentBill && (
                        <BillCheckbox
                          bill={group.rentBill}
                          label={`Rent + Water — Rs ${group.rentBill.totalAmount}`}
                          checked={selectedIds.has(group.rentBill._id)}
                          onChange={() => toggleBill(group.rentBill._id)}
                          statusStyles={STATUS_STYLES}
                        />
                      )}
                      {/* Electricity Bill */}
                      {group.electricityBill && (
                        <BillCheckbox
                          bill={group.electricityBill}
                          label={`Electricity — Rs ${group.electricityBill.totalAmount}`}
                          checked={selectedIds.has(group.electricityBill._id)}
                          onChange={() => toggleBill(group.electricityBill._id)}
                          statusStyles={STATUS_STYLES}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Payment Type */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-slate-900">Payment Method</h2>
              <div className="flex flex-wrap gap-3">
                {[
                  { value: 'upi', label: '📱 UPI' },
                  { value: 'cash', label: '💵 Cash' },
                  { value: 'manual', label: '🏦 Manual Transfer' },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                      paymentType === value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value={value}
                      checked={paymentType === value}
                      onChange={() => handlePaymentTypeChange(value)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>

              {/* Screenshot upload — UPI only */}
              {paymentType === 'upi' && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Payment Screenshot <span className="text-red-500">*</span>
                  </p>

                  {screenshotPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={screenshotPreview}
                        alt="Payment screenshot preview"
                        className="h-48 w-auto rounded-lg border border-slate-200 object-cover shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={clearScreenshot}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="screenshot"
                      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-8 text-center transition hover:border-slate-400 hover:bg-slate-100"
                    >
                      <span className="text-2xl">📷</span>
                      <span className="mt-2 text-sm font-medium text-slate-600">
                        Click to upload screenshot
                      </span>
                      <span className="text-xs text-slate-400">PNG, JPG, WEBP — max 5 MB</span>
                      <input
                        id="screenshot"
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotChange}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>
              )}
            </section>

            {/* Summary + Submit */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Amount</p>
                  <p className="text-2xl font-bold text-slate-900">
                    Rs {totalAmount.toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {selectedIds.size} bill{selectedIds.size !== 1 ? 's' : ''} selected
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={submitting || selectedIds.size === 0 || !hasSelectableBills}
                  className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Payment'}
                </button>
              </div>
            </section>
          </form>
        )}
      </main>
    </div>
  )
}

// ── Sub-component: single bill checkbox row ────────────────────────────────
function BillCheckbox({ bill, label, checked, onChange, statusStyles }) {
  const isSelectable = bill.status === 'unpaid'

  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 transition ${
        isSelectable
          ? 'cursor-pointer hover:bg-slate-50'
          : 'cursor-not-allowed opacity-60'
      } ${checked ? 'bg-slate-50 ring-1 ring-slate-300' : ''}`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={!isSelectable}
          className="h-4 w-4 rounded border-slate-400 text-slate-900 accent-slate-800"
        />
        <span className="text-sm text-slate-800">{label}</span>
      </div>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusStyles[bill.status] || ''}`}>
        {bill.status}
      </span>
    </label>
  )
}

export default PaymentPage
