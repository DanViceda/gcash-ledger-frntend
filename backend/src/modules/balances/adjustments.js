import { cents } from '../../utils/money.js'

export function parseAdjustmentRequest(body = {}) {
  const account = body.account
  const adjustmentType = body.adjustmentType
  const amount = cents(body.amountCentavos, 'Adjustment amount', { positive: true })
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (!['CASH', 'GCASH'].includes(account)) throw Object.assign(new Error('Account must be CASH or GCASH.'), { status: 400 })
  if (!['ADD', 'DEDUCT'].includes(adjustmentType)) throw Object.assign(new Error('Adjustment type must be ADD or DEDUCT.'), { status: 400 })
  if (!reason || reason.length > 2000) throw Object.assign(new Error('A reason of 1 to 2000 characters is required.'), { status: 400 })
  return { account, adjustmentType, amount, reason }
}
