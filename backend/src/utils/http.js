export function pageParams(query) {
  const page = Number(query.page ?? 0), size = Number(query.size ?? 20)
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) throw Object.assign(new Error('Page must be nonnegative and size must be between 1 and 100.'), { status: 400 })
  return { page, size, offset: page * size }
}
export function paged(content, page, size, total) { return { content, page, size, totalElements: Number(total), totalPages: Math.ceil(Number(total) / size) } }
export function idParam(value) { if (!/^\d+$/.test(value) || BigInt(value) <= 0n) throw Object.assign(new Error('Resource not found.'), { status: 404 }); return value }
export function dateInstant(value, label) { if (!value) return null; const date = new Date(value); if (!Number.isFinite(date.getTime())) throw Object.assign(new Error(`${label} must be a valid ISO date-time.`), { status: 400 }); return date.toISOString() }
