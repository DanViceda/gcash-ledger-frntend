import jwt from 'jsonwebtoken'
import { pool } from '../database/pool.js'
import { config } from '../config/env.js'
import { asyncRoute } from './errors.js'

export const COOKIE = 'auth_token'
export const cookieOptions = (maxAge) => ({ httpOnly: true, secure: config.cookieSecure, sameSite: 'strict', path: '/', ...(maxAge === undefined ? {} : { maxAge }) })
export const requireAuth = asyncRoute(async (req, res, next) => {
  const token = req.cookies?.[COOKIE]
  if (!token || token.length > 4096) return res.status(401).json({ status: 401, message: 'Authentication required.' })
  let claims
  try { claims = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: config.JWT_ISSUER }) } catch { return res.status(401).json({ status: 401, message: 'Authentication required.' }) }
  const { rows } = await pool.query('SELECT id,username,auth_version FROM admins WHERE id=$1', [claims.aid])
  const admin = rows[0]
  if (!admin || admin.username !== claims.sub || String(admin.auth_version) !== String(claims.ver)) return res.status(401).json({ status: 401, message: 'Authentication required.' })
  req.admin = { id: admin.id, username: admin.username, authVersion: admin.auth_version }
  next()
})
export function issueToken(admin) { const now = Math.floor(Date.now() / 1000); return jwt.sign({ aid: String(admin.id), ver: String(admin.auth_version), iat: now }, config.jwtSecret, { algorithm: 'HS256', issuer: config.JWT_ISSUER, subject: admin.username, expiresIn: '1d' }) }
