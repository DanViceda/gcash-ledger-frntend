import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, ArrowLeftRight, ArrowRight, Banknote, CircleHelp, FileText, Wallet } from 'lucide-react'
import { api, errorMessage, newIdempotencyKey } from '../services/api'
import { dateTime, money, pesosToCentavos } from '../utils/format'
import { useToast } from '../context/ToastContext'
import EmptyState from '../components/ui/EmptyState'
import MetricCard from '../components/ui/MetricCard'
import PageHeading from '../components/ui/PageHeading'
import Pagination from '../components/ui/Pagination'
import Skeleton from '../components/ui/Skeleton'
import Modal from '../components/ui/Modal'
import { MoneyInput, Variance } from '../components/ui/BalanceFields'

function BalancesPage() {
  const { notify } = useToast()
  const [balances, setBalances] = useState(null)
  const [fundings, setFundings] = useState([])
  const [transfers, setTransfers] = useState([])
  const [reconciliations, setReconciliations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fundingOpen, setFundingOpen] = useState(false)
  const [fundingAccount, setFundingAccount] = useState('CASH')
  const [fundingAmount, setFundingAmount] = useState('')
  const [fundingNotes, setFundingNotes] = useState('')
  const [direction, setDirection] = useState('CASH_TO_GCASH')
  const [transferPage, setTransferPage] = useState(0)
  const [transferPages, setTransferPages] = useState(0)
  const [transferCount, setTransferCount] = useState(0)
  const [reconciliationPage, setReconciliationPage] = useState(0)
  const [reconciliationPages, setReconciliationPages] = useState(0)
  const [reconciliationCount, setReconciliationCount] = useState(0)
  const [transferAmount, setTransferAmount] = useState('')
  const [actualCash, setActualCash] = useState('')
  const [actualGcash, setActualGcash] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const fundingKey = useRef(null)
  const transferKey = useRef(null)
  const reconciliationKey = useRef(null)
  const reversalKeys = useRef(new Map())

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [balanceResult, fundingResult, transferResult, reconciliationResult] = await Promise.allSettled([
        api.get('/balances'),
        api.get('/balances/fundings', { params: { page: 0, size: 8 } }),
        api.get('/balances/transfers', { params: { page: transferPage, size: 8 } }),
        api.get('/balances/reconciliations', { params: { page: reconciliationPage, size: 5 } }),
      ])
      if (balanceResult.status === 'fulfilled') setBalances(balanceResult.value.data)
      if (fundingResult.status === 'fulfilled') setFundings(fundingResult.value.data.content || [])
      if (transferResult.status === 'fulfilled') { setTransfers(transferResult.value.data.content || []); setTransferPages(transferResult.value.data.totalPages); setTransferCount(transferResult.value.data.totalElements) }
      if (reconciliationResult.status === 'fulfilled') { setReconciliations(reconciliationResult.value.data.content || []); setReconciliationPages(reconciliationResult.value.data.totalPages); setReconciliationCount(reconciliationResult.value.data.totalElements) }
      const failed = [balanceResult, fundingResult, transferResult, reconciliationResult].find((item) => item.status === 'rejected')
      if (failed) setError(errorMessage(failed.reason, 'Some balance information could not be loaded.'))
    } catch (err) { setError(errorMessage(err, 'Could not load balances.')) }
    finally { setLoading(false) }
  }, [transferPage, reconciliationPage])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  function openFunding(account) {
    setFundingAccount(account); setFundingAmount(''); setFundingNotes(''); fundingKey.current = null; setError(''); setFundingOpen(true)
  }

  async function addFunding(event) {
    event.preventDefault()
    const amountCentavos = pesosToCentavos(fundingAmount)
    if (!Number.isSafeInteger(amountCentavos) || amountCentavos <= 0) { setError('Enter an amount greater than zero.'); return }
    setBusy(true); setError('')
    try {
      if (!fundingKey.current) fundingKey.current = { key: newIdempotencyKey(), account: fundingAccount, amountCentavos, notes: fundingNotes.trim() || null }
      const request = fundingKey.current
      await api.post('/balances/fundings', { account: request.account, amountCentavos: request.amountCentavos, notes: request.notes }, { headers: { 'Idempotency-Key': request.key } })
      fundingKey.current = null; setFundingOpen(false); setFundingAmount(''); setFundingNotes('')
      notify(`${fundingAccount === 'CASH' ? 'Cash' : 'GCash'} balance updated.`, 'success')
      await load()
    } catch (err) { setError(errorMessage(err, 'Could not add funds.')) }
    finally { setBusy(false) }
  }

  async function createTransfer(event) {
    event.preventDefault()
    if (!window.confirm(`Transfer ${money(pesosToCentavos(transferAmount))} ${direction === 'CASH_TO_GCASH' ? 'from cash to GCash' : 'from GCash to cash'}?`)) return
    setBusy(true); setError('')
    try { if (!transferKey.current) transferKey.current = newIdempotencyKey(); await api.post('/balances/transfers', { direction, amountCentavos: pesosToCentavos(transferAmount), notes: notes.trim() || null }, { headers: { 'Idempotency-Key': transferKey.current } }); transferKey.current = null; setTransferAmount(''); setNotes(''); notify('Balance transfer recorded.', 'success'); await load() }
    catch (err) { setError(errorMessage(err, 'Could not record transfer.')) }
    finally { setBusy(false) }
  }

  async function reverseTransfer(transfer) {
    const reason = window.prompt(`Enter a reason to reverse transfer #${transfer.id}:`)
    if (!reason?.trim()) return
    if (!window.confirm(`Reverse transfer #${transfer.id}?`)) return
    setBusy(true); setError('')
    try { const payload = { reason: reason.trim() }; const keyName = `${transfer.id}:${payload.reason}`; if (!reversalKeys.current.has(keyName)) reversalKeys.current.set(keyName, newIdempotencyKey()); await api.post(`/balances/transfers/${transfer.id}/reverse`, payload, { headers: { 'Idempotency-Key': reversalKeys.current.get(keyName) } }); notify(`Transfer #${transfer.id} reversed.`, 'success'); await load() }
    catch (err) { setError(errorMessage(err, 'Could not reverse transfer.')) }
    finally { setBusy(false) }
  }

  async function reconcile(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { if (!reconciliationKey.current) reconciliationKey.current = newIdempotencyKey(); const { data } = await api.post('/balances/reconciliations', { actualCashCentavos: pesosToCentavos(actualCash), actualGcashCentavos: pesosToCentavos(actualGcash), notes: notes.trim() || null }, { headers: { 'Idempotency-Key': reconciliationKey.current } }); reconciliationKey.current = null; setActualCash(''); setActualGcash(''); setNotes(''); notify(`Reconciliation saved · cash ${data.cashVariance.toLowerCase()}, GCash ${data.gcashVariance.toLowerCase()}.`, 'success'); await load() }
    catch (err) { setError(errorMessage(err, 'Could not save reconciliation.')) }
    finally { setBusy(false) }
  }

  return <><PageHeading title="Balances" action={<button className="button button-secondary" onClick={load}><Activity size={16}/> Refresh</button>} />
    {error && <div className="alert alert-error" role="alert">{error}<button className="text-button" onClick={load}>Retry</button></div>}
    <section className="balance-grid">
      {loading ? <><div className="metric-card"><Skeleton className="sk-label"/><Skeleton className="sk-metric"/></div><div className="metric-card"><Skeleton className="sk-label"/><Skeleton className="sk-metric"/></div></> : <>
        <div className="balance-account"><MetricCard icon={Banknote} label="Cash Balance" amount={money(balances?.cashCentavos)} tone="metric-green"/><button className="button button-primary" onClick={() => openFunding('CASH')}>Add Cash</button></div>
        <div className="balance-account"><MetricCard icon={Wallet} label="GCash Balance" amount={money(balances?.gcashCentavos)} tone="metric-ink"/><button className="button button-primary" onClick={() => openFunding('GCASH')}>Add GCash</button></div>
      </>}
    </section>
    <div className="two-column-grid"><section className="panel balance-form-card"><div className="section-header"><div><h2>Balance transfer</h2><p className="muted">Transfers do not have a fee.</p></div><span className="subtle-icon"><ArrowLeftRight size={20}/></span></div><form className="form-stack" onSubmit={createTransfer}><label className="field"><span>Direction</span><select value={direction} onChange={(e) => setDirection(e.target.value)}><option value="CASH_TO_GCASH">Cash to GCash</option><option value="GCASH_TO_CASH">GCash to cash</option></select></label><label className="field"><span>Amount in pesos</span><MoneyInput value={transferAmount} onChange={setTransferAmount}/></label><label className="field"><span>Notes · optional</span><input maxLength="2000" value={notes} onChange={(e) => setNotes(e.target.value)} /></label><button className="button button-primary" disabled={busy || !transferAmount}>Record transfer <ArrowRight size={17}/></button></form></section>
      <section className="panel balance-form-card"><div className="section-header"><div><h2>Reconcile balances</h2></div><span className="subtle-icon amber"><CircleHelp size={20}/></span></div><form className="form-stack" onSubmit={reconcile}><label className="field"><span>Actual cash in pesos</span><MoneyInput value={actualCash} onChange={setActualCash}/></label><label className="field"><span>Actual GCash in pesos</span><MoneyInput value={actualGcash} onChange={setActualGcash}/></label><label className="field"><span>Notes · optional</span><input maxLength="4000" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Explain any difference" /></label><button className="button button-secondary" disabled={busy || actualCash === '' || actualGcash === ''}>Save reconciliation</button></form><p className="reconcile-note">Reconciliation records a difference; it does not adjust expected balances.</p></section></div>
    <section className="panel table-panel"><div className="section-header"><h2>Balance additions</h2></div>{loading ? <div className="skeleton-list"><Skeleton/><Skeleton/></div> : fundings.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Account</th><th>Amount</th><th>Note</th><th>Added by</th><th>Date</th></tr></thead><tbody>{fundings.map((funding) => <tr key={funding.id}><td>{funding.account === 'CASH' ? 'Cash' : 'GCash'}</td><td className="money-cell">{money(funding.amountCentavos)}</td><td>{funding.notes || '—'}</td><td>{funding.addedBy}</td><td>{dateTime(funding.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState icon={Banknote} title="No balance additions yet" />}</section>
    <section className="panel table-panel"><div className="section-header"><h2>Transfer history</h2></div>{loading ? <div className="skeleton-list"><Skeleton/><Skeleton/></div> : transfers.length ? <><div className="table-scroll"><table className="data-table"><thead><tr><th>Direction</th><th>Amount</th><th>Balances before</th><th>Balances after</th><th>Date</th><th>Reversal</th></tr></thead><tbody>{transfers.map((transfer) => { const reversedBy = transfers.find((entry) => entry.reversalOfId === transfer.id); return <tr key={transfer.id}><td><span className="transfer-direction">{transfer.direction === 'CASH_TO_GCASH' ? 'Cash → GCash' : 'GCash → Cash'}</span><small className="table-subline">#{transfer.id}{transfer.reversalOfId ? ` · reverses #${transfer.reversalOfId}` : ''}</small></td><td className="money-cell">{money(transfer.amountCentavos)}</td><td className="balance-pair">Cash {money(transfer.previousCashCentavos)}<br/>GCash {money(transfer.previousGcashCentavos)}</td><td className="balance-pair">Cash {money(transfer.resultingCashCentavos)}<br/>GCash {money(transfer.resultingGcashCentavos)}</td><td>{dateTime(transfer.createdAt)}</td><td>{transfer.reversalOfId ? <span className="status-pill status-voided">Reversal</span> : reversedBy ? <span className="status-pill status-voided">Reversed #{reversedBy.id}</span> : <button className="button button-quiet button-small" disabled={busy} onClick={() => reverseTransfer(transfer)}>Reverse</button>}</td></tr>})}</tbody></table></div><Pagination page={transferPage} totalPages={transferPages} totalElements={transferCount} onChange={setTransferPage}/></> : <EmptyState icon={ArrowLeftRight} title="No transfers recorded" />}</section>
    <section className="panel table-panel"><div className="section-header"><h2>Reconciliation history</h2></div>{loading ? <div className="skeleton-list"><Skeleton/><Skeleton/></div> : reconciliations.length ? <><div className="table-scroll"><table className="data-table"><thead><tr><th>Recorded</th><th>Cash variance</th><th>GCash variance</th><th>Notes</th></tr></thead><tbody>{reconciliations.map((record) => <tr key={record.id}><td>{dateTime(record.createdAt)}</td><td><Variance amount={record.cashDifferenceCentavos} status={record.cashVariance}/></td><td><Variance amount={record.gcashDifferenceCentavos} status={record.gcashVariance}/></td><td>{record.notes || '—'}</td></tr>)}</tbody></table></div><Pagination page={reconciliationPage} totalPages={reconciliationPages} totalElements={reconciliationCount} onChange={setReconciliationPage}/></> : <EmptyState icon={FileText} title="No reconciliations yet" />}</section>
    {fundingOpen && <Modal title={`Add ${fundingAccount === 'CASH' ? 'Cash' : 'GCash'} Balance`} onClose={() => { if (!busy) setFundingOpen(false) }}><form className="form-stack" onSubmit={addFunding}>
      <label className="field"><span>Amount in pesos</span><MoneyInput min="0.01" value={fundingAmount} onChange={(value) => { setFundingAmount(value); if (fundingKey.current?.amountCentavos !== pesosToCentavos(value)) fundingKey.current = null }}/></label>
      <label className="field"><span>Note · optional</span><input maxLength="2000" value={fundingNotes} onChange={(event) => { setFundingNotes(event.target.value); if (fundingKey.current?.notes !== event.target.value.trim()) fundingKey.current = null }} /></label>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => setFundingOpen(false)}>Cancel</button><button className="button button-primary" disabled={busy || !fundingAmount}>{busy ? <><span className="spinner spinner-light"/> Adding…</> : `Confirm Add ${fundingAccount === 'CASH' ? 'Cash' : 'GCash'}`}</button></div>
    </form></Modal>}
  </>
}

export default BalancesPage
