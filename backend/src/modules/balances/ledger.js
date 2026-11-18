import { cents, jsonMoney } from '../../utils/money.js'

const ZERO_OPENING = Object.freeze({ cash_centavos: '0', gcash_centavos: '0' })
const MAX_BALANCE = 9223372036854775807n

export function applyFunding(balances, account, amount) {
  if (amount <= 0n) throw Object.assign(new Error('Funding amount must be positive.'), { status: 400 })
  if (account === 'CASH') return { ...balances, cash: balances.cash + amount }
  if (account === 'GCASH') return { ...balances, gcash: balances.gcash + amount }
  throw Object.assign(new Error('Funding account is invalid.'), { status: 400 })
}

export function applyAdjustment(balances, account, adjustmentType, amount) {
  if (amount <= 0n) throw Object.assign(new Error('Adjustment amount must be positive.'), { status: 400 })
  if (!['CASH', 'GCASH'].includes(account)) throw Object.assign(new Error('Adjustment account is invalid.'), { status: 400 })
  if (!['ADD', 'DEDUCT'].includes(adjustmentType)) throw Object.assign(new Error('Adjustment type is invalid.'), { status: 400 })
  const signedAmount = adjustmentType === 'ADD' ? amount : -amount
  const adjusted = account === 'CASH'
    ? { ...balances, cash: balances.cash + signedAmount }
    : { ...balances, gcash: balances.gcash + signedAmount }
  if (adjusted.cash > MAX_BALANCE || adjusted.gcash > MAX_BALANCE) throw Object.assign(new Error('Adjustment exceeds the supported balance range.'), { status: 409 })
  return adjusted
}

export function delta(type, mode, amount, fee) {
  const receives = mode === 'ON_TOP' ? amount : amount - fee
  const pays = mode === 'ON_TOP' ? amount + fee : amount
  if (mode === 'DEDUCTED' && amount <= fee) throw Object.assign(new Error('Amount must be greater than fee.'), { status: 400 })
  if (type === 'CASH_IN' || type === 'LOAD') return [pays, -receives]
  if (type === 'CASH_OUT') return [-receives, pays]
  throw Object.assign(new Error('Transaction type is invalid.'), { status: 400 })
}
export async function lockOpening(client) {
  await client.query('SELECT id FROM balance_ledger_lock WHERE id=1 FOR UPDATE')
  const { rows } = await client.query('SELECT * FROM opening_balances WHERE id=1')
  return rows[0] ?? ZERO_OPENING
}
export async function expectedBalances(client, opening = ZERO_OPENING) {
  let cash = cents(opening.cash_centavos), gcash = cents(opening.gcash_centavos)
  const { rows: fundings } = await client.query('SELECT account,amount_centavos FROM balance_fundings')
  for (const funding of fundings) ({ cash, gcash } = applyFunding({ cash, gcash }, funding.account, cents(funding.amount_centavos)))
  const { rows: adjustments } = await client.query('SELECT account,adjustment_type,amount_centavos FROM balance_adjustments ORDER BY id')
  for (const adjustment of adjustments) ({ cash, gcash } = applyAdjustment({ cash, gcash }, adjustment.account, adjustment.adjustment_type, cents(adjustment.amount_centavos)))
  const { rows: txs } = await client.query("SELECT type,amount_centavos,fee_centavos,fee_mode FROM transactions WHERE status='COMPLETED'")
  for (const tx of txs) { const [dc, dg] = delta(tx.type, tx.fee_mode, cents(tx.amount_centavos), cents(tx.fee_centavos)); cash += dc; gcash += dg }
  const { rows: transfers } = await client.query('SELECT source,destination,amount_centavos FROM balance_transfers')
  for (const t of transfers) { const amount = cents(t.amount_centavos); if (t.source === 'CASH') cash -= amount; else gcash -= amount; if (t.destination === 'CASH') cash += amount; else gcash += amount }
  return { cash, gcash }
}
export function safeBalanceView({ cash, gcash }) { return { cashCentavos: jsonMoney(cash), gcashCentavos: jsonMoney(gcash), combinedCentavos: jsonMoney(cash + gcash) } }
export function ensureNonnegative({ cash, gcash }, message = 'Operation would make an expected balance negative.') { if (cash < 0n || gcash < 0n) throw Object.assign(new Error(message), { status: 409 }) }
