import { createInterface, emitKeypressEvents } from 'node:readline'
import bcrypt from 'bcrypt'
import { pool, transaction } from '../database/pool.js'

function promptLine(label) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(label, (answer) => { rl.close(); resolve(answer) }))
}

function promptHidden(label) {
  const input = process.stdin
  if (!input.isTTY || typeof input.setRawMode !== 'function') throw new Error('Run this command in an interactive terminal so the password can be entered without echo.')
  emitKeypressEvents(input)
  input.resume()
  input.setRawMode(true)
  process.stdout.write(label)
  return new Promise((resolve, reject) => {
    let value = ''
    const finish = (error) => {
      input.off('keypress', onKeypress)
      input.setRawMode(false)
      process.stdout.write('\n')
      if (error) reject(error)
      else resolve(value)
    }
    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === 'c') return finish(new Error('Password reset cancelled.'))
      if (key.name === 'return' || key.name === 'enter') return finish()
      if (key.name === 'backspace') { value = Array.from(value).slice(0, -1).join(''); return }
      if (character && !key.ctrl && !key.meta) value += character
    }
    input.on('keypress', onKeypress)
  })
}

try {
  const username = (await promptLine('Administrator username: ')).trim()
  if (!username || username.length > 50) throw new Error('Username must contain 1 to 50 characters.')
  const password = await promptHidden('New password (minimum 12 characters): ')
  const confirmation = await promptHidden('Confirm new password: ')
  if (password !== confirmation) throw new Error('Passwords do not match.')
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Password must be at least 12 characters and no more than 72 UTF-8 bytes.')

  await transaction(async (client) => {
    const { rows } = await client.query('SELECT id FROM admins WHERE username=$1 FOR UPDATE', [username])
    if (!rows[0]) throw new Error('No administrator with that username was found; no changes were made.')
    const hash = await bcrypt.hash(password, 12)
    await client.query('UPDATE admins SET password_hash=$1,auth_version=auth_version+1 WHERE id=$2', [hash, rows[0].id])
    await client.query("DELETE FROM login_attempts WHERE username_key=lower($1) AND succeeded=FALSE", [username])
  })
  console.log('Password updated. Existing sessions were invalidated and this username’s failed-login lockout was cleared.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
