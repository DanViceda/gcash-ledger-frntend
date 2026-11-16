const MAX = 9223372036854775807n
export function cents(value, label = 'Amount', { positive = false, nonnegative = false } = {}) {
  let n
  try {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') throw new Error()
    if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error()
    const s = String(value)
    if (!/^-?\d+$/.test(s)) throw new Error()
    n = BigInt(s)
  } catch { throw Object.assign(new Error(`${label} must be an exact integer number of centavos. Send large values as digit strings.`), { status: 400 }) }
  if (n > MAX || n < -MAX - 1n || (positive && n <= 0n) || (nonnegative && n < 0n)) throw Object.assign(new Error(`${label} is outside the supported range.`), { status: 400 })
  return n
}
export function jsonMoney(value) { const n = BigInt(value); return n <= BigInt(Number.MAX_SAFE_INTEGER) && n >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(n) : n.toString() }
export function feeFor(amount, step, rate) { return ((amount + step - 1n) / step) * rate }
