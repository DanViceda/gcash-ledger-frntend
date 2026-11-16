import assert from 'node:assert/strict'
import test from 'node:test'
import bcrypt from 'bcrypt'
import { changePasswordForAdmin, validatePasswordChange } from '../src/modules/auth/password.js'

const valid = { currentPassword: 'Correct-horse-1', newPassword: 'Another-safe-pass-2', confirmPassword: 'Another-safe-pass-2' }
const failure = async (fn, message) => assert.rejects(fn, (error) => error.status === 400 && error.message === message)

test('rejects missing current, new, or confirmation password', () => {
  assert.throws(() => validatePasswordChange({ ...valid, currentPassword: '' }), /current password/i)
  assert.throws(() => validatePasswordChange({ ...valid, newPassword: '' }), /new password/i)
  assert.throws(() => validatePasswordChange({ ...valid, confirmPassword: '' }), /confirm/i)
})

test('enforces minimum length, bcrypt byte limit, and matching confirmation', () => {
  assert.throws(() => validatePasswordChange({ ...valid, newPassword: 'short', confirmPassword: 'short' }), /at least 12/i)
  const tooLong = 'é'.repeat(37)
  assert.throws(() => validatePasswordChange({ ...valid, newPassword: tooLong, confirmPassword: tooLong }), /72 UTF-8 bytes/i)
  assert.throws(() => validatePasswordChange({ ...valid, confirmPassword: 'Different-safe-pass-3' }), /do not match/i)
})

test('wrong current password is rejected without issuing an update', async () => {
  const hash = await bcrypt.hash('Correct-horse-1', 4)
  const queries = []
  const client = { async query(sql) { queries.push(sql); return { rows: [{ password_hash: hash }] } } }
  await failure(() => changePasswordForAdmin(client, 7, { ...valid, currentPassword: 'incorrect-current' }), 'Current password is incorrect.')
  assert.equal(queries.some((sql) => sql.startsWith('UPDATE admins')), false)
})

test('rejects reusing the existing password without issuing an update', async () => {
  const hash = await bcrypt.hash(valid.currentPassword, 4)
  const queries = []
  const client = { async query(sql) { queries.push(sql); return { rows: [{ password_hash: hash }] } } }
  await failure(() => changePasswordForAdmin(client, 7, { currentPassword: valid.currentPassword, newPassword: valid.currentPassword, confirmPassword: valid.currentPassword }), 'New password must be different from the current password.')
  assert.equal(queries.some((sql) => sql.startsWith('UPDATE admins')), false)
})

test('correct current password updates the bcrypt hash and increments session version', async () => {
  const oldHash = await bcrypt.hash(valid.currentPassword, 4)
  const updates = []
  const client = { async query(sql, params) { if (sql.startsWith('SELECT')) return { rows: [{ password_hash: oldHash }] }; updates.push({ sql, params }); return { rows: [] } } }
  await changePasswordForAdmin(client, 7, valid)
  assert.equal(updates.length, 1)
  assert.match(updates[0].sql, /auth_version=auth_version\+1/)
  assert.equal(await bcrypt.compare(valid.newPassword, updates[0].params[0]), true)
  assert.equal(await bcrypt.compare(valid.currentPassword, updates[0].params[0]), false)
})
