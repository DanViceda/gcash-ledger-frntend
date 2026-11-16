import { randomBytes, timingSafeEqual } from 'node:crypto'
const safe = new Set(['GET', 'HEAD', 'OPTIONS'])
export function csrf(req, res, next) {
  if (req.path === '/auth/csrf' || req.path === '/auth/login' && req.method === 'POST') return next()
  if (safe.has(req.method)) return next()
  const cookie = req.cookies?.['XSRF-TOKEN'], header = req.get('X-XSRF-TOKEN')
  if (!cookie || !header || cookie.length !== header.length || !timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) return res.status(403).json({ status: 403, message: 'Access denied.' })
  next()
}
export function createCsrfToken() { return randomBytes(32).toString('base64url') }
