import { Router } from 'express'
import bcrypt from 'bcrypt'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { pool, transaction } from '../../database/pool.js'
import { config } from '../../config/env.js'
import { requireAuth, issueToken, COOKIE, cookieOptions } from '../../middleware/auth.js'
import { createCsrfToken } from '../../middleware/csrf.js'
import { asyncRoute } from '../../middleware/errors.js'
import { changePasswordForAdmin } from './password.js'

export const authRouter = Router()
const loginIpLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => ipKeyGenerator(req.ip, 56) })
authRouter.get('/csrf', (req, res) => {
  const token = createCsrfToken()
  res.cookie('XSRF-TOKEN', token, { httpOnly: false, secure: config.cookieSecure, sameSite: 'strict', path: '/', maxAge: 86_400_000 })
  res.set('Cache-Control', 'no-store').json({ token, headerName: 'X-XSRF-TOKEN' })
})
authRouter.post('/login', loginIpLimiter, asyncRoute(async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!username || username.length > 50 || !password || Buffer.byteLength(password) > 72) return res.status(401).json({ status: 401, message: 'Invalid username or password.' })
  const normalizedUsername=username.toLowerCase()
  const { rows: recent } = await pool.query("SELECT count(*)::int AS failures FROM login_attempts WHERE username_key=$1 AND succeeded=FALSE AND attempted_at > now()-interval '15 minutes'", [normalizedUsername])
  if (recent[0].failures >= 5) return res.status(429).json({ status: 429, message: 'Too many failed login attempts for this username. Try again in 15 minutes.' })
  const { rows } = await pool.query('SELECT id,username,password_hash,auth_version FROM admins WHERE username=$1', [username])
  const admin = rows[0], dummy = '$2b$12$LJ3m4ys3Lz0xX7TFrW6CEuGFMn9U8Ub8qS0FB1I7wQCGo3UymUUpK'
  const valid = await bcrypt.compare(password, admin?.password_hash ?? dummy)
  if (!admin || !valid) { await pool.query('INSERT INTO login_attempts(username_key,ip_key) VALUES($1,$2)',[normalizedUsername,req.ip]); return res.status(401).json({ status: 401, message: 'Invalid username or password.' }) }
  await pool.query('INSERT INTO login_attempts(username_key,ip_key,succeeded) VALUES($1,$2,TRUE)',[normalizedUsername,req.ip])
  const token = issueToken(admin)
  res.cookie(COOKIE, token, cookieOptions(86_400_000)).set('Cache-Control', 'no-store').json({ username: admin.username, expiresInSeconds: 86400 })
}))
authRouter.get('/me', requireAuth, (req, res) => res.json({ username: req.admin.username }))
authRouter.post('/logout', requireAuth, asyncRoute(async (req, res) => {
  await pool.query('UPDATE admins SET auth_version=auth_version+1 WHERE id=$1', [req.admin.id])
  res.clearCookie(COOKIE, cookieOptions()).status(204).end()
}))
authRouter.post('/change-password', requireAuth, asyncRoute(async (req, res) => {
  await transaction((client) => changePasswordForAdmin(client, req.admin.id, req.body))
  res.clearCookie(COOKIE, cookieOptions()).status(204).end()
}))
export async function bootstrapAdmin() {
  if (!config.ADMIN_BOOTSTRAP_USERNAME && !config.ADMIN_BOOTSTRAP_PASSWORD) return
  const username = config.ADMIN_BOOTSTRAP_USERNAME.trim(), password = config.ADMIN_BOOTSTRAP_PASSWORD
  if (!username || username.length > 50 || password.length < 12) throw new Error('Administrator bootstrap username must be 1-50 characters and password at least 12 characters.')
  await transaction(async (client) => {
    await client.query('LOCK TABLE admins IN SHARE ROW EXCLUSIVE MODE')
    const { rowCount } = await client.query('SELECT id FROM admins LIMIT 1')
    if (!rowCount) await client.query('INSERT INTO admins(username,password_hash) VALUES($1,$2)', [username, await bcrypt.hash(password, 12)])
  })
}
