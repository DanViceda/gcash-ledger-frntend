import { money } from '../../utils/format'

function MoneyInput({ value, onChange, min = '0' }) { return <div className="amount-input"><span>₱</span><input type="number" inputMode="decimal" min={min} step="0.01" required value={value} onChange={(e) => onChange(e.target.value)} placeholder="0.00" /></div> }

function Variance({ amount, status }) { return <span className={`variance variance-${status?.toLowerCase()}`}>{status === 'EXCESS' ? '+' : status === 'SHORTAGE' ? '−' : ''}{money(Math.abs(amount || 0))} <small>{status?.toLowerCase()}</small></span> }

export { MoneyInput, Variance }
