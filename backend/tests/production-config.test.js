import assert from 'node:assert/strict'
import test from 'node:test'
import { validateProductionSecurity } from '../src/config/production.js'

const valid = { NODE_ENV: 'production', DATABASE_SSL: 'true', CORS_ORIGINS: 'https://ledger.example.com' }

test('production requires TLS, secure cookies, and HTTPS CORS origins', () => {
  assert.throws(() => validateProductionSecurity({ ...valid, DATABASE_SSL: 'false' }), /DATABASE_SSL=true/)
  assert.throws(() => validateProductionSecurity({ ...valid, AUTH_COOKIE_SECURE: 'false' }), /cannot be false/)
  assert.throws(() => validateProductionSecurity({ ...valid, CORS_ORIGINS: 'http://ledger.example.com' }), /HTTPS origins/)
  assert.throws(() => validateProductionSecurity({ ...valid, CORS_ORIGINS: '' }), /Set CORS_ORIGINS/)
  assert.doesNotThrow(() => validateProductionSecurity(valid))
  assert.doesNotThrow(() => validateProductionSecurity({ ...valid, NODE_ENV: 'development', DATABASE_SSL: 'false', CORS_ORIGINS: 'http://localhost:5173' }))
})
