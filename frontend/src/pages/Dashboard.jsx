import { useEffect, useState } from 'react'
import { Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Banknote, Clock3, Smartphone, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../services/api'
import { money } from '../utils/format'
import EmptyState from '../components/ui/EmptyState'
import PageHeading from '../components/ui/PageHeading'
import Skeleton from '../components/ui/Skeleton'
import TransactionTable from '../components/transactions/TransactionTable'

function DashboardPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const [report, tx] = await Promise.all([api.get('/reports/today'), api.get('/transactions', { params: { page: 0, size: 6 } })])
      setSummary(report.data); setRecent(tx.data.content || [])
    } catch (err) {
      setError(errorMessage(err, 'Could not load the dashboard.'))
    } finally { setLoading(false) }
  }
  useEffect(() => { void Promise.resolve().then(load) }, [])

  const actions = [
    ['CASH_IN', 'Cash in', ArrowDownLeft], ['CASH_OUT', 'Cash out', ArrowUpRight], ['LOAD', 'Sell load', Smartphone],
  ]
  const totalBalanceCentavos = summary
    ? (summary.cashCentavos || 0) + (summary.gcashCentavos || 0)
    : null
  return <>
    <PageHeading title="Overview" action={<button className="button button-secondary" onClick={() => navigate('/transactions')}><Clock3 size={17} /> View history</button>} />
    {error && <div className="alert alert-error"><span>{error}</span><button className="text-button" onClick={load}>Retry</button></div>}
    <section className="balance-overview" aria-label="Balances">
      <div className="balance-total"><span className="balance-label">Total balance</span>{loading ? <Skeleton className="sk-total"/> : <strong>{money(totalBalanceCentavos)}</strong>}</div>
      <div className="balance-breakdown">
        <div><span><Banknote size={17}/> Cash balance</span>{loading ? <Skeleton className="sk-breakdown"/> : <strong>{money(summary?.cashCentavos)}</strong>}</div>
        <div><span><Wallet size={17}/> GCash balance</span>{loading ? <Skeleton className="sk-breakdown"/> : <strong>{money(summary?.gcashCentavos)}</strong>}</div>
      </div>
    </section>
    <section className="dashboard-stat-strip" aria-label="Today's activity">
      <div><span>Today's earnings</span>{loading ? <Skeleton className="sk-strip"/> : <strong>{money(summary?.earningsTodayCentavos)}</strong>}</div>
      <div><span>Transactions today</span>{loading ? <Skeleton className="sk-strip"/> : <strong>{summary?.transactionCountToday ?? 0}</strong>}<small>{money(summary?.transactionVolumeTodayCentavos)} total amount</small></div>
    </section>
    <section className="quick-actions"><div className="section-header"><div><h2>New transaction</h2></div></div><div className="quick-grid">{actions.map(([type, label, Icon]) => <button key={type} className="quick-card" onClick={() => navigate(`/transactions/new?type=${type}`)}><span className={`quick-icon ${type.toLowerCase()}`}><Icon size={19} /></span><span><strong>{label}</strong></span><ArrowRight size={17} className="quick-arrow" /></button>)}</div></section>
    <section className="panel recent-panel dashboard-history"><div className="section-header"><div><h2>Recent transactions</h2></div><button className="button button-quiet" onClick={() => navigate('/transactions')}>View all <ArrowRight size={16} /></button></div>
      {loading ? <div className="skeleton-list"><Skeleton/><Skeleton/><Skeleton/></div> : recent.length ? <TransactionTable items={recent.slice(0, 5)} compact /> : <EmptyState icon={Activity} title="No transactions yet" action={<button className="button button-primary" onClick={() => navigate('/transactions/new')}>Create transaction</button>} />}
    </section>
  </>
}

export default DashboardPage
