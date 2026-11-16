import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Plus, Search, Users } from 'lucide-react'
import { api, errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { dateTime } from '../utils/format'
import { isValidPhilippineMobile } from '../utils/customerPhone'
import CustomerDetails from '../components/customers/CustomerDetails'
import EmptyState from '../components/ui/EmptyState'
import PageHeading from '../components/ui/PageHeading'
import Pagination from '../components/ui/Pagination'
import Skeleton from '../components/ui/Skeleton'

function CustomersPage() {
  const { notify } = useToast()
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const phoneValid = isValidPhilippineMobile(newPhone)

  const load = useCallback(() => setReload((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true); setError('')
      api.get('/customers', { params: { search: search.trim() || undefined, page, size: 20 }, signal: controller.signal })
        .then(({ data }) => { setCustomers(data.content || []); setTotalPages(data.totalPages); setTotalElements(data.totalElements) })
        .catch((err) => { if (!controller.signal.aborted) setError(errorMessage(err, 'Could not load customers.')) })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, search ? 250 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [search, page, reload])

  async function createCustomer(event) {
    event.preventDefault(); setPhoneTouched(true)
    if (!phoneValid) return
    setBusy(true); setError('')
    try { const { data } = await api.post('/customers', { name: newName.trim() || null, phoneNumber: newPhone }); setNewName(''); setNewPhone(''); setPhoneTouched(false); notify(`${data.name || data.phoneNumber} added.`, 'success'); setPage(0); load() }
    catch (err) { setError(errorMessage(err, 'Could not add customer.')) }
    finally { setBusy(false) }
  }

  return <><PageHeading title="Customers" />
    <section className="customer-tools"><form onSubmit={createCustomer} className="add-customer"><div><h2>Add customer</h2></div><div className="add-customer-controls"><input maxLength="100" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name · optional" aria-label="Customer name" /><input required type="tel" inputMode="numeric" pattern="09[0-9]{9}" maxLength="11" value={newPhone} onChange={(e) => { setNewPhone(e.target.value); setPhoneTouched(true) }} placeholder="09XXXXXXXXX" aria-label="Customer phone number" aria-invalid={phoneTouched && !phoneValid} aria-describedby="customer-phone-help" /><button className="button button-primary" disabled={busy || !phoneValid}><Plus size={17}/> Add</button></div><small id="customer-phone-help" className={`form-note${phoneTouched && !phoneValid ? ' field-error' : ''}`} role={phoneTouched && !phoneValid ? 'alert' : undefined}>Enter 11 digits starting with 09.{phoneTouched && !phoneValid ? ' This phone number is invalid.' : ''}</small></form>
      <label className="search-field"><Search size={18}/><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} placeholder="Search name or phone" aria-label="Search customers by name or phone" /></label></section>
    {error && <div className="alert alert-error">{error}<button className="text-button" onClick={load}>Retry</button></div>}
    <section className="panel table-panel">{loading ? <div className="skeleton-list"><Skeleton/><Skeleton/><Skeleton/></div> : customers.length ? <><div className="table-scroll"><table className="data-table"><thead><tr><th>Customer</th><th>Added</th><th>Customer ID</th><th /></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><strong>{customer.name || customer.phoneNumber}</strong>{customer.name && <small className="table-subline">{customer.phoneNumber}</small>}</td><td>{dateTime(customer.createdAt)}</td><td>#{customer.id}</td><td><button className="button button-secondary button-small" onClick={() => setSelected(customer)}>Details <ArrowRight size={15}/></button></td></tr>)}</tbody></table></div><Pagination page={page} totalPages={totalPages} totalElements={totalElements} onChange={setPage}/></> : <EmptyState icon={Users} title={search ? 'No customers found' : 'No customers yet'} />}</section>
    {selected && <CustomerDetails customer={selected} onClose={() => setSelected(null)} onUpdated={async (updated) => { setSelected(updated); load() }} />}
  </>
}

export default CustomersPage
