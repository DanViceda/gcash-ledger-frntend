import { useCallback, useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../services/api'
import EmptyState from '../components/ui/EmptyState'
import PageHeading from '../components/ui/PageHeading'
import Pagination from '../components/ui/Pagination'
import Skeleton from '../components/ui/Skeleton'
import TransactionDetails from '../components/transactions/TransactionDetails'
import TransactionTable from '../components/transactions/TransactionTable'

function useQueryState(initial = {}) {
  const [state, setState] = useState(initial)
  return [state, (key, value) => setState((current) => ({ ...current, [key]: value }))]
}

function TransactionsPage() {
  const navigate = useNavigate()
  const [filters, setFilter] = useQueryState({ search: '', type: '', status: '', from: '', to: '', page: 0 })
  const [result, setResult] = useState({ content: [], totalPages: 0, totalElements: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const params = { page: filters.page, size: 20 }
    if (filters.search.trim()) params.search = filters.search.trim()
    if (filters.type) params.type = filters.type
    if (filters.status) params.status = filters.status
    if (filters.from) params.from = new Date(`${filters.from}T00:00:00+08:00`).toISOString()
    if (filters.to) params.to = new Date(new Date(`${filters.to}T00:00:00+08:00`).getTime() + 86400000).toISOString()
    try { const { data } = await api.get('/transactions', { params }); setResult(data) }
    catch (err) { setError(errorMessage(err, 'Could not load transactions.')) }
    finally { setLoading(false) }
  }, [filters])
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  return <>
    <PageHeading title="Transaction history" action={<button className="button button-primary" onClick={() => navigate('/transactions/new')}><Plus size={18}/> New transaction</button>} />
    <div className="filters-bar"><label className="field compact-field transaction-search"><span>Search</span><input value={filters.search} onChange={(e) => { setFilter('search', e.target.value); setFilter('page', 0) }} placeholder="Name, phone, or reference" /></label><label className="field compact-field"><span>Service</span><select value={filters.type} onChange={(e) => { setFilter('type', e.target.value); setFilter('page', 0) }}><option value="">All services</option><option value="CASH_IN">Cash in</option><option value="CASH_OUT">Cash out</option><option value="LOAD">Load</option></select></label><label className="field compact-field"><span>Status</span><select value={filters.status} onChange={(e) => { setFilter('status', e.target.value); setFilter('page', 0) }}><option value="">All statuses</option><option value="COMPLETED">Completed</option><option value="VOIDED">Voided</option></select></label><label className="field compact-field"><span>From</span><input type="date" value={filters.from} onChange={(e) => { setFilter('from', e.target.value); setFilter('page', 0) }} /></label><label className="field compact-field"><span>To</span><input type="date" value={filters.to} onChange={(e) => { setFilter('to', e.target.value); setFilter('page', 0) }} /></label><button className="button button-quiet filter-clear" onClick={() => { setFilter('search', ''); setFilter('type', ''); setFilter('status', ''); setFilter('from', ''); setFilter('to', ''); setFilter('page', 0) }}>Clear filters</button></div>
    {error && <div className="alert alert-error">{error}<button className="text-button" onClick={load}>Retry</button></div>}
    <section className="panel table-panel">{loading ? <div className="skeleton-list"><Skeleton/><Skeleton/><Skeleton/><Skeleton/></div> : result.content.length ? <><TransactionTable items={result.content} onSelect={setSelected} /><Pagination page={filters.page} totalPages={result.totalPages} totalElements={result.totalElements} onChange={(page) => setFilter('page', page)} /></> : <EmptyState icon={Search} title="No matching transactions" body="Try a different filter, or create your first transaction." action={<button className="button button-primary" onClick={() => navigate('/transactions/new')}>New transaction</button>} />}</section>
    {selected && <TransactionDetails item={selected} onClose={() => setSelected(null)} onChanged={load} />}
  </>
}

export default TransactionsPage
