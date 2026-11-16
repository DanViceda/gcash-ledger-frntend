import 'dotenv/config'
import { z } from 'zod'
import { validateProductionSecurity } from './production.js'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8081),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z.enum(['true', 'false']).default('false'),
  DATABASE_SSL_CA_FILE: z.string().optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  JWT_SECRET_BASE64: z.string().min(1), JWT_ISSUER: z.string().default('gcash-ledger'),
  AUTH_COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  FEE_STEP_CENTAVOS: z.coerce.bigint().positive().default(50000n),
  FEE_RATE_CENTAVOS: z.coerce.bigint().positive().default(500n),
  ADMIN_BOOTSTRAP_USERNAME: z.string().optional(), ADMIN_BOOTSTRAP_PASSWORD: z.string().optional(),
})
const parsed = schema.safeParse(process.env)
if (!parsed.success) throw new Error(`Invalid server configuration: ${parsed.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`)
const raw = parsed.data
validateProductionSecurity(raw)
const secret = Buffer.from(raw.JWT_SECRET_BASE64, 'base64')
if (secret.length < 32) throw new Error('JWT_SECRET_BASE64 must decode to at least 32 bytes.')
if (raw.DATABASE_SSL_CA_FILE && raw.DATABASE_SSL !== 'true') throw new Error('DATABASE_SSL_CA_FILE requires DATABASE_SSL=true.')
if ((raw.ADMIN_BOOTSTRAP_USERNAME && !raw.ADMIN_BOOTSTRAP_PASSWORD) || (!raw.ADMIN_BOOTSTRAP_USERNAME && raw.ADMIN_BOOTSTRAP_PASSWORD)) throw new Error('Set both ADMIN_BOOTSTRAP_USERNAME and ADMIN_BOOTSTRAP_PASSWORD for admin bootstrap.')
if (raw.ADMIN_BOOTSTRAP_PASSWORD && Buffer.byteLength(raw.ADMIN_BOOTSTRAP_PASSWORD) > 72) throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at most 72 UTF-8 bytes.')
export const config = Object.freeze({ ...raw, DATABASE_SSL_CA_FILE: raw.DATABASE_SSL_CA_FILE || undefined, jwtSecret: secret, cookieSecure: raw.AUTH_COOKIE_SECURE ? raw.AUTH_COOKIE_SECURE === 'true' : raw.NODE_ENV === 'production', corsOrigins: raw.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) })
