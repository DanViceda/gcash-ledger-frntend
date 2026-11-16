const wholePesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0,
})

export const money = (centavos = 0) => {
  let amount
  try { amount = BigInt(centavos ?? 0) } catch { amount = 0n }
  const negative = amount < 0n
  const absolute = negative ? -amount : amount
  const wholePesos = absolute / 100n
  const fraction = String(absolute % 100n).padStart(2, '0')
  return `${negative ? '-' : ''}${wholePesoFormatter.format(wholePesos)}.${fraction}`
}

export const pesosToCentavos = (pesos) => {
  const value = String(pesos ?? '').trim()
  if (!value) return 0
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return Number.NaN
  const [whole, fraction = ''] = value.split('.')
  const centavos = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0') || '0')
  return centavos <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(centavos) : Number.NaN
}

export function localDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

export function dateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value))
}


