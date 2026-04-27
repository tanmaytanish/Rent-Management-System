import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import RoleNav from '../components/RoleNav'
import api from '../lib/api'

function PaymentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const billId = searchParams.get('billId')
  const billType = searchParams.get('billType')

  const [bill, setBill] = useState(null)
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    const loadBill = async () => {
      if (!billId || !billType) {
        setNotice({ type: 'error', text: 'Invalid payment request. Missing bill details.' })
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await api.get(`/api/bills/${billType}/${billId}`)
        setBill(response.data.bill)
      } catch (error) {
        setNotice({ type: 'error', text: error?.response?.data?.error || 'Failed to load bill details' })
      } finally {
        setLoading(false)
      }
    }

    loadBill()
  }, [billId, billType])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!billId || !billType) {
      setNotice({ type: 'error', text: 'Missing bill information' })
      return
    }

    try {
      setSubmitting(true)
      setNotice(null)

      await api.post('/api/payments/submit', {
        billId,
        billType,
        reference,
      })

      navigate('/bills', {
        replace: true,
        state: { notice: { type: 'success', text: 'Payment submitted. Bill is now pending approval.' } },
      })
    } catch (error) {
      setNotice({ type: 'error', text: error?.response?.data?.error || 'Failed to submit payment' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <RoleNav />

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Payment</h1>
          <p className="mt-1 text-slate-600">Submit a payment request for this bill.</p>
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

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {loading ? (
            <p className="text-sm text-slate-600">Loading bill details...</p>
          ) : !bill ? (
            <p className="text-sm text-slate-600">Bill not found.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase text-slate-500">Bill Type</p>
                  <p className="text-sm font-semibold text-slate-900">{billType}</p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase text-slate-500">Month</p>
                  <p className="text-sm font-semibold text-slate-900">{bill.month}</p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase text-slate-500">Current Status</p>
                  <p className="text-sm font-semibold text-slate-900">{bill.status}</p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase text-slate-500">Amount</p>
                  <p className="text-sm font-semibold text-slate-900">Rs {bill.totalAmount}</p>
                </div>
              </div>

              <div>
                <label htmlFor="reference" className="mb-1 block text-sm font-medium text-slate-700">
                  Payment Reference (optional)
                </label>
                <input
                  id="reference"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                  placeholder="Transaction ID / UPI Ref"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting || bill.status !== 'unpaid'}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Submit Payment'}
                </button>

                <Link
                  to="/bills"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Back to Bills
                </Link>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  )
}

export default PaymentPage
