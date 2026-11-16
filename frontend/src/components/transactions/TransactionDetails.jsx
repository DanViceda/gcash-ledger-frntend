import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { dateTime, money } from '../../utils/format'
import Detail from '../ui/Detail'
import Modal from '../ui/Modal'
import Skeleton from '../ui/Skeleton'

function TransactionDetails({ item, onClose, onChanged }) {
  const { notify } = useToast()
  const [details, setDetails] = useState(item)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api.get(`/transactions/${item.id}`, { signal: controller.signal })
      .then(({ data }) => setDetails(data))
      .catch((err) => { if (!controller.signal.aborted) setError(errorMessage(err, 'Could not load transaction details.')) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [item.id])

  async function voidTransaction() {
    if (!reason.trim()) { setError('Enter a reason before voiding.'); return }
    if (!window.confirm('Void this transaction? This changes the ledger history and may be blocked if later activity depends on it.')) return
    setBusy(true); setError('')
    try { await api.post(`/transactions/${item.id}/void`, { reason: reason.trim() }); notify('Transaction voided.', 'success'); onChanged(); onClose() }
    catch (err) { setError(errorMessage(err, 'Could not void transaction.')) }
    finally { setBusy(false) }
  }

  return <Modal title={`Transaction #${item.id}`} onClose={onClose} wide>{loading ? <div className="skeleton-list"><Skeleton/><Skeleton/></div> : <div className="detail-grid"><Detail label="Service" value={details.type?.replace('_', ' ')} /><Detail label="Status" value={details.status} /><Detail label="Customer" value={details.customerName || details.customerPhoneNumber || 'Walk-in'} /><Detail label="Phone" value={details.customerName ? details.customerPhoneNumber : '—'} /><Detail label="Date" value={dateTime(details.createdAt)} /><Detail label="Amount" value={money(details.amountCentavos)} /><Detail label="Fee" value={money(details.feeCentavos)} /><Detail label="Fee mode" value={details.feeMode?.replace('_', ' ')} /><Detail label="Reference" value={details.referenceCode || '—'} /><Detail label="Recorded by" value={details.createdBy || '—'} /><Detail label="Notes" value={details.notes || '—'} /></div>}
    {error && <div className="alert alert-error">{error}</div>}
    {!loading && details.status === 'COMPLETED' && <div className="void-box"><div><strong>Void transaction</strong></div><label className="field"><span>Reason</span><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows="2" maxLength="2000" /></label><button className="button button-danger" disabled={busy} onClick={voidTransaction}>{busy ? 'Voiding…' : 'Void transaction'}</button></div>}
    <div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Close</button></div>
  </Modal>
}

export default TransactionDetails
