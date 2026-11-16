import assert from 'node:assert/strict'
import test from 'node:test'
import { api, errorMessage, newIdempotencyKey, REQUEST_TIMEOUT_MS } from './api.js'

test('API requests have a bounded timeout', () => {
  assert.equal(api.defaults.timeout, REQUEST_TIMEOUT_MS)
  assert.ok(REQUEST_TIMEOUT_MS > 0)
})

test('financial POST without a response warns that the result may be committed', () => {
  for (const code of ['ECONNABORTED', 'ERR_NETWORK']) {
    for (const url of ['/transactions', '/transactions/12/void', '/balances/transfers', '/balances/reconciliations']) {
      const message = errorMessage({ config: { method: 'post', url }, code })
      assert.match(message, /may have been saved/i)
      assert.match(message, /check .*history before trying again/i)
    }
  }
})

test('non-financial no-response errors retain the connection guidance', () => {
  const message = errorMessage({ config: { method: 'get', url: '/reports/today' }, code: 'ECONNABORTED' })
  assert.match(message, /could not reach the server/i)
})

test('HTTP validation errors show the backend message', () => {
  const message = errorMessage({ response: { status: 422, data: { message: 'Amount is invalid.' } } })
  assert.equal(message, 'Amount is invalid.')
})

test('HTTP authentication errors ask the operator to sign in again', () => {
  const message = errorMessage({ response: { status: 401, data: {} } })
  assert.match(message, /session has ended/i)
})

test('idempotency keys are valid and unique for independent operations', () => {
  const first = newIdempotencyKey()
  const second = newIdempotencyKey()
  assert.match(first, /^[A-Za-z0-9._:-]{8,128}$/)
  assert.notEqual(first, second)
})
