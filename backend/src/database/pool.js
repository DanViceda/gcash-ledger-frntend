import pg from 'pg'
import { readFileSync } from 'node:fs'
import { config } from '../config/env.js'
const { Pool } = pg
const ssl = config.DATABASE_SSL === 'true' ? {
  rejectUnauthorized: true,
  ...(config.DATABASE_SSL_CA_FILE ? { ca: readFileSync(config.DATABASE_SSL_CA_FILE, 'utf8') } : {}),
} : undefined
export const pool = new Pool({ connectionString: config.DATABASE_URL, max: config.DATABASE_POOL_MAX, ssl, application_name: 'gcash-ledger-express' })
pool.on('error', (error) => console.error(JSON.stringify({ level: 'error', message: 'Unexpected idle PostgreSQL client error', code: error.code })))
export async function transaction(fn, isolation = 'READ COMMITTED') {
  const client = await pool.connect()
  try { await client.query(`BEGIN ISOLATION LEVEL ${isolation}`); const result = await fn(client); await client.query('COMMIT'); return result }
  catch (error) { try { await client.query('ROLLBACK') } catch {} throw error }
  finally { client.release() }
}
