import { useCallback, useEffect, useState } from 'react'
import { ChartNoAxesCombined } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, errorMessage } from '../services/api'
import { localDate, money } from '../utils/format'
import EmptyState from '../components/ui/EmptyState'
import PageHeading from '../components/ui/PageHeading'
import Skeleton from '../components/ui/Skeleton'

function ReportsPage() {
  const today = localDate()
  const [summary, setSummary] = useState(null)
  const [report, setReport] = useState(null)
  const [serviceBreakdown, setServiceBreakdown] = useState([])
  const [from, setFrom] = useState(today.slice(0, 7) + '-01')
  const [to, setTo] = useState(today)
  const [groupBy, setGroupBy] = useState('day')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const weekStart = new Date(`${today}T12:00:00+08:00`)
      weekStart.setDate(weekStart.getDate() - 6)
      const lastSevenDays = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(weekStart)
      const [todayResult, earnings, weekly] = await Promise.all([api.get('/reports/today'), api.get('/reports/earnings', { params: { from, to, groupBy } }), api.get('/reports/earnings', { params: { from: lastSevenDays, to: today, groupBy: 'day' } })])
      setSummary(todayResult.data); setReport(earnings.data); setServiceBreakdown(weekly.data.periods || [])
    } catch (err) { setError(errorMessage(err, 'Could not load reports.')) }
    finally { setLoading(false) }
  }, [from, to, groupBy, today, setError, setLoading, setReport, setServiceBreakdown, setSummary])
  useEffect(() => { void Promise.resolve().then(load) }, [load])
  const chartData = (report?.periods || []).map((period) => ({ ...period, label: new Intl.DateTimeFormat('en-PH', groupBy === 'day' ? { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' } : groupBy === 'month' ? { month: 'short', year: '2-digit', timeZone: 'Asia/Manila' } : { year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(`${period.periodStart}T12:00:00+08:00`)) }))
  return <><PageHeading title="Reports" />
    {error && <div className="alert alert-error">{error}<button className="text-button" onClick={load}>Retry</button></div>}
    <section className="stats-grid report-today">{loading ? <><div className="stat-card"><Skeleton className="sk-label"/><Skeleton className="sk-metric"/></div><div className="stat-card"><Skeleton className="sk-label"/><Skeleton className="sk-metric"/></div></> : <><div className="stat-card"><span>Today's earnings</span><strong>{money(summary?.earningsTodayCentavos)}</strong><small>{summary?.businessDate} · Asia/Manila</small></div><div className="stat-card"><span>Completed transactions</span><strong>{summary?.transactionCountToday ?? 0}</strong><small>{money(summary?.transactionVolumeTodayCentavos)} total amount</small></div></>}</section>
    <section className="panel report-panel"><div className="section-header report-heading"><div><h2>Fee earnings</h2><p className="muted">Voided transactions are excluded.</p></div><div className="report-filters"><label className="field compact-field"><span>Group by</span><select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}><option value="day">Day</option><option value="month">Month</option><option value="year">Year</option></select></label><label className="field compact-field"><span>From</span><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label><label className="field compact-field"><span>To</span><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label></div></div>
      {loading ? <Skeleton className="chart-skeleton"/> : chartData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5"/><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#737373', fontSize: 12 }}/><YAxis tickLine={false} axisLine={false} tick={{ fill: '#737373', fontSize: 12 }} tickFormatter={(value) => `₱${(value / 100).toLocaleString('en-PH')}`} width={66}/><Tooltip formatter={(value) => money(value)} contentStyle={{ border: '1px solid #e5e5e5', borderRadius: 10, fontSize: 13 }}/><Area type="monotone" dataKey="earningsCentavos" name="Earnings" stroke="#1351AA" strokeWidth={2} fill="none" activeDot={{ r: 4 }}/></AreaChart></ResponsiveContainer></div> : <EmptyState icon={ChartNoAxesCombined} title="No earnings in this period" body="Completed service earnings will appear here once recorded." />}
    </section>
    <section className="panel table-panel"><div className="section-header"><div><h2>Service breakdown</h2><p className="muted">Last 7 days</p></div></div>{loading ? <div className="skeleton-list"><Skeleton/><Skeleton/><Skeleton/></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Period</th><th>Service</th><th>Transactions</th><th>Earnings</th></tr></thead><tbody>{serviceBreakdown.flatMap((period) => period.byType.map((type) => ({ period, type }))).map(({ period, type }, index) => <tr key={`${period.periodStart}-${type.type}-${index}`}><td>{period.periodStart}</td><td><span className={`type-pill type-${type.type.toLowerCase()}`}>{type.type.replace('_', ' ')}</span></td><td>{type.transactionCount}</td><td className="money-cell">{money(type.earningsCentavos)}</td></tr>)}</tbody></table></div>}</section>
  </>
}

export default ReportsPage
