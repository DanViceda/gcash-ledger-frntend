export function validateProductionSecurity({ NODE_ENV, DATABASE_SSL, AUTH_COOKIE_SECURE, CORS_ORIGINS }) {
  if (NODE_ENV !== 'production') return
  if (DATABASE_SSL !== 'true') throw new Error('DATABASE_SSL=true is required in production.')
  if (AUTH_COOKIE_SECURE === 'false') throw new Error('AUTH_COOKIE_SECURE cannot be false in production.')

  const origins = (CORS_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean)
  if (!origins.length) throw new Error('Set CORS_ORIGINS to the production frontend origin(s).')
  for (const origin of origins) {
    let parsed
    try { parsed = new URL(origin) } catch { throw new Error('Production CORS_ORIGINS must contain valid HTTPS origins.') }
    if (parsed.protocol !== 'https:' || parsed.origin !== origin) {
      throw new Error('Production CORS_ORIGINS must contain HTTPS origins without paths.')
    }
  }
}
