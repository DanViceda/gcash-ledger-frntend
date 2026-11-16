export function normalizePhone(value) {
  if (typeof value !== 'string' || !value) throw Object.assign(new Error('Phone number is required.'), { status: 400 })
  if (!/^09[0-9]{9}$/.test(value)) throw Object.assign(new Error('Phone number must start with 09 and contain exactly 11 digits.'), { status: 400 })
  return value
}
