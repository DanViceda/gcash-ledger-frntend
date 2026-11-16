import bcrypt from 'bcrypt'

const badRequest = (message) => Object.assign(new Error(message), { status: 400 })

export function validatePasswordChange({ currentPassword, newPassword, confirmPassword } = {}) {
  if (typeof currentPassword !== 'string' || !currentPassword || Buffer.byteLength(currentPassword, 'utf8') > 72) {
    throw badRequest('Enter your current password (maximum 72 UTF-8 bytes).')
  }
  if (typeof newPassword !== 'string' || !newPassword) throw badRequest('Enter a new password.')
  if (Array.from(newPassword).length < 12) throw badRequest('New password must be at least 12 characters.')
  if (Buffer.byteLength(newPassword, 'utf8') > 72) throw badRequest('New password must be no more than 72 UTF-8 bytes.')
  if (typeof confirmPassword !== 'string' || !confirmPassword) throw badRequest('Confirm your new password.')
  if (newPassword !== confirmPassword) throw badRequest('New password and confirmation do not match.')
  return { currentPassword, newPassword }
}

export async function changePasswordForAdmin(client, adminId, input) {
  const { currentPassword, newPassword } = validatePasswordChange(input)
  const { rows } = await client.query('SELECT password_hash FROM admins WHERE id=$1 FOR UPDATE', [adminId])
  if (!rows[0]) throw Object.assign(new Error('Administrator session is no longer valid.'), { status: 401 })
  const currentMatches = await bcrypt.compare(currentPassword, rows[0].password_hash)
  if (!currentMatches) throw badRequest('Current password is incorrect.')
  if (await bcrypt.compare(newPassword, rows[0].password_hash)) throw badRequest('New password must be different from the current password.')
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await client.query('UPDATE admins SET password_hash=$1,auth_version=auth_version+1 WHERE id=$2', [passwordHash, adminId])
}
