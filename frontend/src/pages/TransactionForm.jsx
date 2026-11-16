import { useEffect, useRef, useState } from 'react'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, Search, Smartphone, X, LoaderCircle } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, errorMessage, newIdempotencyKey } from '../services/api'
import { money, pesosToCentavos } from '../utils/format'
import { useToast } from '../context/ToastContext'
import Detail from '../components/ui/Detail'
import Modal from '../components/ui/Modal'
import PageHeading from '../components/ui/PageHeading'

function TransactionFormPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const location = useLocation()
  const defaultType = new URLSearchParams(location.search).get('type') || 'CASH_IN'
  const [form, setForm] = useState({ type: defaultType, amount: '', feeMode: 'ON_TOP', customerId: '', customerName: '', phone: '', referenceCode: '', notes: '' })
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState([])
  const [customerError, setCustomerError] = useState('')
  const [customerLoading, setCustomerLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [feePreview, setFeePreview] = useState(null)
  const [previewAmount, setPreviewAmount] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewAttempt, setPreviewAttempt] = useState(0)
  const idempotencyKey = useRef(null)
  const submitInFlight = useRef(false)
  const amount = pesosToCentavos(form.amount)
  const fee = previewAmount === amount ? feePreview : null
  const feeMode = form.feeMode
  const customerPayment = feeMode === 'ON_TOP' ? amount + (fee || 0) : amount
  const customerReceives = feeMode === 'ON_TOP' ? amount : Math.max(0, amount - (fee || 0))

  function updateForm(field, value) {
    idempotencyKey.current = null
    setForm((current) => ({ ...current, [field]: value }))
  }

  useEffect(() => {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return undefined
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setPreviewLoading(true); setPreviewError(''); setFeePreview(null); setPreviewAmount(null)
      api.get('/transactions/fee-preview', { params: { amountCentavos: amount }, signal: controller.signal })
        .then(({ data }) => { setFeePreview(data.feeCentavos); setPreviewAmount(amount) })
        .catch((err) => { if (!controller.signal.aborted) setPreviewError(errorMessage(err, 'Fee preview unavailable.')) })
        .finally(() => { if (!controller.signal.aborted) setPreviewLoading(false) })
    }, 180)
    return () => { clearTimeout(timer); controller.abort() }
  }, [amount, previewAttempt])

  useEffect(() => {
    const term = customerSearch.trim()
    if (term.length < 2 || form.customerId) return undefined
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setCustomerError(''); setCustomerLoading(true)
      api.get('/customers', { params: { search: term, page: 0, size: 10 }, signal: controller.signal })
        .then(({ data }) => {
          if (!controller.signal.aborted) {
            setCustomerOptions(data.content || [])
            if (!data.content?.length) setCustomerError('No matching customers.')
          }
        })
        .catch((err) => { if (!controller.signal.aborted) setCustomerError(errorMessage(err, 'Could not search customers.')) })
        .finally(() => { if (!controller.signal.aborted) setCustomerLoading(false) })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [customerSearch, form.customerId])

  async function submit(event) {
    event.preventDefault(); setError(''); setDone(null)
    if (busy || submitInFlight.current) return
    if (!amount || amount <= 0) { setError('Enter an amount greater than zero.'); return }
    if (fee == null) { setError(previewError || 'Wait for the server fee preview before submitting.'); return }
    if (feeMode === 'DEDUCTED' && amount <= fee) { setError('The amount must be greater than the fee for deducted fees.'); return }
    if (!form.referenceCode.trim()) { setError('Enter the actual GCash transaction reference number.'); return }
    setConfirmOpen(true)
  }

  async function confirmTransaction() {
    if (busy || submitInFlight.current) return
    submitInFlight.current = true
    setBusy(true)
    try {
      if (!idempotencyKey.current) idempotencyKey.current = newIdempotencyKey()
      const { data } = await api.post('/transactions', {
        customerId: form.customerId ? Number(form.customerId) : null,
        phoneNumber: form.customerId ? form.phone : null,
        type: form.type, amountCentavos: amount, feeMode: form.feeMode,
        referenceCode: form.referenceCode.trim(), notes: form.notes.trim() || null,
      }, { headers: { 'Idempotency-Key': idempotencyKey.current } })
      idempotencyKey.current = null
      setConfirmOpen(false)
      setDone({ transaction: data })
      notify('Transaction saved.', 'success')
    } catch (err) { setError(errorMessage(err, 'Transaction could not be created.')) }
    finally { submitInFlight.current = false; setBusy(false) }
  }

  if (done) return <><PageHeading title="Transaction saved" /><section className="success-card"><span className="success-icon"><Check size={25}/></span><h2>{done.transaction.type.replace('_', ' ')} · #{done.transaction.id}</h2><p className="muted">{money(done.transaction.amountCentavos)} · {money(done.transaction.feeCentavos)} fee</p><div className="success-actions"><button className="button button-primary" onClick={() => { setDone(null); setForm({ ...form, amount: '', referenceCode: '', notes: '', phone: '', customerId: '', customerName: '' }); setCustomerSearch(''); idempotencyKey.current = null }}>Record another</button><button className="button button-secondary" onClick={() => navigate('/transactions')}>View transactions</button><button className="button button-quiet" onClick={() => navigate('/')}>Dashboard</button></div></section></>

  return <><PageHeading title="New transaction" action={<button className="button button-quiet" onClick={() => navigate('/transactions')}><X size={17}/> Cancel</button>} />
    <form className="transaction-layout" onSubmit={submit}>
      <section className="panel form-panel"><div className="form-section"><div className="section-kicker"><div><h2>Service</h2></div></div><div className="service-picker">{[['CASH_IN','Cash in',ArrowDownLeft],['CASH_OUT','Cash out',ArrowUpRight],['LOAD','Load',Smartphone]].map(([type,label,Icon]) => <button type="button" key={type} className={`service-option ${form.type === type ? 'selected' : ''}`} onClick={() => updateForm('type', type)}><Icon size={20}/><strong>{label}</strong></button>)}</div></div>
        <div className="form-section"><h2>Customer details <small className="optional-label">· optional</small></h2>{form.customerId ? <div className="selected-customer"><div><strong>{form.customerName || 'Customer'}</strong><span>{form.phone}</span></div><button type="button" className="button button-quiet button-small" onClick={() => { updateForm('customerId', ''); setForm((current) => ({ ...current, customerId: '', customerName: '', phone: '' })); setCustomerSearch(''); setCustomerOptions([]); setCustomerLoading(false); setCustomerError('') }}>Clear</button></div> : <div className="customer-search"><label className="field"><span>Search by name or phone</span><div className="input-icon-wrap"><Search size={18}/><input type="search" autoComplete="off" value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setCustomerOptions([]); setCustomerError(''); setCustomerLoading(false) }} placeholder="Name or phone number" aria-label="Search customers by name or phone" aria-expanded={customerOptions.length > 0} /></div></label>{customerLoading && <small className="form-note customer-search-status"><LoaderCircle size={14} className="search-spinner"/> Searching customers…</small>}{customerError && !customerLoading && <small className="form-note customer-search-status">{customerError}</small>}{customerOptions.length > 0 && <div className="customer-suggestions" role="listbox" aria-label="Matching customers">{customerOptions.map((customer) => <button type="button" role="option" key={customer.id} className="suggestion" onClick={() => { updateForm('customerId', String(customer.id)); setForm((current) => ({ ...current, customerId: String(customer.id), customerName: customer.name || '', phone: customer.phoneNumber })); setCustomerOptions([]); setCustomerSearch(''); setCustomerError(''); setCustomerLoading(false) }}><span><strong>{customer.name || 'Customer'}</strong><small>{customer.phoneNumber}</small></span></button>)}</div>}</div>}<small className="form-note">Leave blank to record this transaction without a customer.</small></div>
        <div className="form-section"><h2>Amount and fee</h2><label className="field"><span>Amount in pesos</span><div className="amount-input"><span>₱</span><input type="number" inputMode="decimal" min="0.01" step="0.01" required value={form.amount} onChange={(e) => updateForm('amount', e.target.value)} placeholder="0.00" /></div></label><label className="field"><span>Fee handling</span><select value={form.feeMode} onChange={(e) => updateForm('feeMode', e.target.value)}><option value="ON_TOP">Add fee to customer payment</option><option value="DEDUCTED">Deduct fee from customer amount</option></select></label></div>
        <div className="form-section"><h2>Transaction details</h2><label className="field"><span>Actual GCash transaction reference number</span><input required maxLength="100" value={form.referenceCode} onChange={(e) => updateForm('referenceCode', e.target.value)} /></label><label className="field"><span>Notes · optional</span><textarea rows="2" maxLength="4000" value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} /></label></div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}<button className="button button-primary button-wide submit-transaction" disabled={busy || previewLoading || fee == null}>{busy ? <><span className="spinner spinner-light"/> Saving transaction…</> : <>Review and confirm <ArrowRight size={17}/></>}</button>
      </section>
      <aside className="panel receipt-panel"><div className="receipt-head"><div><strong>Payment breakdown</strong></div></div><div className="receipt-type"><span>Service</span><strong>{form.type.replace('_', ' ')}</strong></div><div className="receipt-line"><span>Transaction amount</span><strong>{money(amount)}</strong></div><div className="receipt-line"><span>Service fee</span><strong>{previewLoading ? 'Loading…' : fee == null ? 'Unavailable' : money(fee)}</strong></div>{previewError && <div className="fee-error" role="alert">{previewError} <button type="button" className="text-button" onClick={() => setPreviewAttempt((value) => value + 1)}>Retry</button></div>}<div className="receipt-total"><span>{feeMode === 'ON_TOP' ? 'Customer pays' : 'Customer receives'}</span><strong>{money(feeMode === 'ON_TOP' ? customerPayment : customerReceives)}</strong></div></aside>
    </form>
    {confirmOpen && <Modal title="Confirm transaction" onClose={() => { if (!busy) setConfirmOpen(false) }}>
      <div className="detail-grid">
        <Detail label="Service" value={form.type.replace('_', ' ')} />
        <Detail label="Transaction amount" value={money(amount)} />
        <Detail label="Service fee" value={money(fee)} />
        <Detail label={feeMode === 'ON_TOP' ? 'Customer pays' : 'Customer receives'} value={money(feeMode === 'ON_TOP' ? customerPayment : customerReceives)} />
        <Detail label="Fee handling" value={feeMode === 'ON_TOP' ? 'Added to payment' : 'Deducted from amount'} />
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="modal-actions">
        <button className="button button-secondary" disabled={busy} onClick={() => setConfirmOpen(false)}>Cancel</button>
        <button className="button button-primary" disabled={busy} onClick={confirmTransaction}>
          {busy ? <><span className="spinner spinner-light"/> Saving transaction…</> : 'Confirm and save'}
        </button>
      </div>
    </Modal>}
  </>
}

export default TransactionFormPage
