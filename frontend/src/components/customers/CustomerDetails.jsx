import { useCallback, useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { api, errorMessage } from '../../services/api'
import { dateTime } from '../../utils/format'
import EmptyState from '../ui/EmptyState'
import Modal from '../ui/Modal'
import Pagination from '../ui/Pagination'
import Skeleton from '../ui/Skeleton'
import TransactionTable from '../transactions/TransactionTable'
import { isValidPhilippineMobile } from '../../utils/customerPhone'

function CustomerDetails({ customer, onClose, onUpdated }) {
  const [result, setResult] = useState({ content: [], totalPages: 0, totalElements: 0 })
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [phone, setPhone] = useState(customer.phoneNumber)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [name, setName] = useState(customer.name || '')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const phoneValid = isValidPhilippineMobile(phone)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const { data } = await api.get(`/customers/${customer.id}/transactions`, { params: { page, size: 10 } }); setResult(data) }
    catch (err) { setError(errorMessage(err, 'Could not load customer history.')) }
    finally { setLoading(false) }
  }, [customer.id, page])
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  async function updatePhone(event) {
    event.preventDefault(); setPhoneTouched(true)
    if (!phoneValid) return
    setBusy(true); setError('')
    try { const { data } = await api.put(`/customers/${customer.id}`, { name: name.trim() || null, phoneNumber: phone }); setPhone(data.phoneNumber); setName(data.name || ''); setEditing(false); await onUpdated(data) }
    catch (err) { setError(errorMessage(err, 'Could not update phone number.')) }
    finally { setBusy(false) }
  }

  return <Modal title="Customer details" onClose={onClose} wide><div className="customer-detail-head"><div>{editing ? <form className="inline-edit customer-edit" onSubmit={updatePhone}><input value={name} maxLength="100" onChange={(e) => setName(e.target.value)} placeholder="Name · optional" aria-label="Customer name" /><div><input required type="tel" inputMode="numeric" pattern="09[0-9]{9}" maxLength="11" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneTouched(true) }} placeholder="09XXXXXXXXX" aria-label="Customer phone number" aria-invalid={phoneTouched && !phoneValid} aria-describedby="edit-phone-help" /><small id="edit-phone-help" className={phoneTouched && !phoneValid ? 'field-error' : 'form-note'} role={phoneTouched && !phoneValid ? 'alert' : undefined}>Enter 11 digits starting with 09.{phoneTouched && !phoneValid ? ' This phone number is invalid.' : ''}</small></div><button className="button button-primary button-small" disabled={busy || !phoneValid}>Save</button></form> : <><h2 className="customer-phone">{customer.name || phone}</h2>{customer.name && <div className="muted phone-cell">{phone}</div>}</>}<small className="muted">Added {dateTime(customer.createdAt)}</small></div><button className="button button-secondary button-small" onClick={() => { if (editing) { setName(customer.name || ''); setPhone(customer.phoneNumber); setPhoneTouched(false) } setEditing(!editing) }}>{editing ? 'Cancel' : 'Edit'}</button></div>{error && <div className="alert alert-error">{error}</div>}<h3 className="modal-section-title">Transactions</h3>{loading ? <div className="skeleton-list"><Skeleton/><Skeleton/></div> : result.content.length ? <><TransactionTable items={result.content} compact/><Pagination page={page} totalPages={result.totalPages} totalElements={result.totalElements} onChange={setPage}/></> : <EmptyState icon={Activity} title="No transaction history" />}</Modal>
}

export default CustomerDetails
