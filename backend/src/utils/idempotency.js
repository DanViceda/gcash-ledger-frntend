import { createHash } from 'node:crypto'

export function keyFrom(req) {
  const key = req.get('Idempotency-Key')
  if (!key || !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) throw Object.assign(new Error('A valid Idempotency-Key header is required.'), { status: 400 })
  return key
}
export function requestHash(value) { return createHash('sha256').update(stable(value)).digest('hex') }
function stable(value) { if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`; if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`; return JSON.stringify(value) }
export async function idempotent(client, adminId, operation, key, payload, run) {
  const hash = requestHash(payload)
  await client.query('INSERT INTO idempotency_records(admin_id,operation,idempotency_key,request_hash,response_json) VALUES($1,$2,$3,$4,NULL) ON CONFLICT(admin_id,operation,idempotency_key) DO NOTHING', [adminId, operation, key, hash])
  const { rows } = await client.query('SELECT request_hash,response_json FROM idempotency_records WHERE admin_id=$1 AND operation=$2 AND idempotency_key=$3 FOR UPDATE', [adminId, operation, key])
  if (rows[0].request_hash !== hash) throw Object.assign(new Error('Idempotency key was already used with a different request.'), { status: 409 })
  if (rows[0].response_json !== null) return JSON.parse(rows[0].response_json)
  const result = await run()
  await client.query('UPDATE idempotency_records SET response_json=$1 WHERE admin_id=$2 AND operation=$3 AND idempotency_key=$4', [JSON.stringify(result), adminId, operation, key])
  return result
}
