import { Router } from 'express'
import { pool, transaction } from '../../database/pool.js'
import { config } from '../../config/env.js'
import { asyncRoute } from '../../middleware/errors.js'
import { cents, feeFor, jsonMoney } from '../../utils/money.js'
import { pageParams, paged, idParam, dateInstant } from '../../utils/http.js'
import { normalizePhone } from '../../utils/phone.js'
import { keyFrom, idempotent } from '../../utils/idempotency.js'
import { lockOpening, expectedBalances, delta, ensureNonnegative } from '../balances/ledger.js'
export const transactionsRouter = Router()
const types = ['CASH_IN','CASH_OUT','LOAD'], modes = ['ON_TOP','DEDUCTED'], statuses = ['COMPLETED','VOIDED']
const view = (r) => ({ id: r.id, customerId: r.customer_id, customerName: r.customer_name, customerPhoneNumber: r.phone_number, createdBy: r.username, type: r.type, amountCentavos: jsonMoney(r.amount_centavos), feeCentavos: jsonMoney(r.fee_centavos), feeMode: r.fee_mode, status: r.status, referenceCode: r.gcash_ref_no, notes: r.notes, createdAt: r.created_at, voidedAt: r.voided_at, voidReason: r.void_reason })
const columns = 't.*,c.name AS customer_name,c.phone_number,a.username'
const joins = ' FROM transactions t LEFT JOIN customers c ON c.id=t.customer_id JOIN admins a ON a.id=t.created_by '
transactionsRouter.get('/fee-preview', (req,res) => { const amount = cents(req.query.amountCentavos,'Amount',{positive:true}); res.json({ amountCentavos: jsonMoney(amount), feeCentavos: jsonMoney(feeFor(amount, config.FEE_STEP_CENTAVOS, config.FEE_RATE_CENTAVOS)) }) })
transactionsRouter.post('/', asyncRoute(async (req,res) => {
  const { customerId=null, phoneNumber=null, type, amountCentavos, feeMode, referenceCode, notes=null } = req.body ?? {}
  if (!types.includes(type) || !modes.includes(feeMode) || !referenceCode?.trim() || referenceCode.trim().length>100 || (notes && notes.length>4000)) throw Object.assign(new Error('Transaction type, amount, fee mode, and reference number are required.'),{status:400})
  const amount=cents(amountCentavos,'Amount',{positive:true}), fee=feeFor(amount,config.FEE_STEP_CENTAVOS,config.FEE_RATE_CENTAVOS), phone=phoneNumber ? normalizePhone(phoneNumber) : null, ref=referenceCode.trim()
  if (customerId === null && phone) throw Object.assign(new Error('Select a customer from the search results or clear the customer field.'),{status:400})
  if(feeMode==='DEDUCTED'&&amount<=fee) throw Object.assign(new Error('Amount must be greater than fee.'),{status:400})
  const payload={customerId,phoneNumber:phone,type,amountCentavos:amount.toString(),feeMode,referenceCode:ref,notes:notes?.trim()||null}, key=keyFrom(req)
  const result=await transaction(async(client)=>idempotent(client,req.admin.id,'TRANSACTION_CREATE',key,payload,async()=>{
    const opening=await lockOpening(client)
    let customer=null
    if (customerId !== null && customerId !== undefined) {
      customer=(await client.query('SELECT * FROM customers WHERE id=$1',[customerId])).rows[0]
      if (!customer) throw Object.assign(new Error('Customer not found.'),{status:404})
      if (phone && normalizePhone(customer.phone_number) !== phone) throw Object.assign(new Error('Selected customer does not match the phone number.'),{status:400})
    }
    const {rows:dup}=await client.query('SELECT id FROM transactions WHERE gcash_ref_no=$1',[ref]); if(dup.length) throw Object.assign(new Error('Reference code is already in use.'),{status:409})
    const before=await expectedBalances(client,opening),[dc,dg]=delta(type,feeMode,amount,fee);ensureNonnegative({cash:before.cash+dc,gcash:before.gcash+dg},'Transaction would make an expected balance negative.')
    const inserted=await client.query('INSERT INTO transactions(customer_id,created_by,type,amount_centavos,fee_centavos,fee_mode,gcash_ref_no,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[customer?.id??null,req.admin.id,type,amount.toString(),fee.toString(),feeMode,ref,notes?.trim()||null])
    const row=(await client.query(`SELECT ${columns}${joins} WHERE t.id=$1`,[inserted.rows[0].id])).rows[0];return view(row)
  }))
  res.status(201).json(result)
}))
transactionsRouter.get('/',asyncRoute(async(req,res)=>{
  const {page,size,offset}=pageParams(req.query),from=dateInstant(req.query.from,'from'),to=dateInstant(req.query.to,'to')
  if(from&&to&&from>=to) throw Object.assign(new Error('The from timestamp must be before the to timestamp.'),{status:400})
  const clauses=[],params=[]; const add=(sql,val)=>{params.push(val);clauses.push(sql.replace('?',`$${params.length}`))}
  if(from)add('t.created_at>=?::timestamptz',from);if(to)add('t.created_at<?::timestamptz',to)
  if(req.query.type){if(!types.includes(req.query.type))throw Object.assign(new Error('Transaction type is invalid.'),{status:400});add('t.type=?',req.query.type)}
  if(req.query.status){if(!statuses.includes(req.query.status))throw Object.assign(new Error('Transaction status is invalid.'),{status:400});add('t.status=?',req.query.status)}
  if(req.query.customerId)add('t.customer_id=?',req.query.customerId)
  if(req.query.search){if(req.query.search.length>200)throw Object.assign(new Error('Search must be at most 200 characters.'),{status:400});add("(lower(coalesce(c.name,'')) LIKE ? ESCAPE '\\' OR lower(coalesce(c.phone_number,'')) LIKE ? ESCAPE '\\' OR lower(coalesce(t.gcash_ref_no,'')) LIKE ? ESCAPE '\\')",`%${req.query.search.trim().toLowerCase().replace(/[\\%_]/g,'\\$&')}%`);const n=params.length;params.push(params[n-1],params[n-1]);clauses[clauses.length-1]=`(lower(coalesce(c.name,'')) LIKE $${n} ESCAPE '\\' OR lower(coalesce(c.phone_number,'')) LIKE $${n+1} ESCAPE '\\' OR lower(coalesce(t.gcash_ref_no,'')) LIKE $${n+2} ESCAPE '\\')`}
  const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:''
  const [items,total]=await Promise.all([pool.query(`SELECT ${columns}${joins}${where} ORDER BY t.created_at DESC,t.id DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,[...params,size,offset]),pool.query(`SELECT count(*)${joins}${where}`,params)])
  res.json(paged(items.rows.map(view),page,size,total.rows[0].count))
}))
transactionsRouter.get('/:id',asyncRoute(async(req,res)=>{const {rows}=await pool.query(`SELECT ${columns}${joins} WHERE t.id=$1`,[idParam(req.params.id)]);if(!rows[0])throw Object.assign(new Error('Transaction not found.'),{status:404});res.json(view(rows[0]))}))
transactionsRouter.post('/:id/void',asyncRoute(async(req,res)=>{
 const id=idParam(req.params.id),reason=typeof req.body?.reason==='string'?req.body.reason.trim():'';if(!reason||reason.length>2000)throw Object.assign(new Error('A void reason is required.'),{status:400})
 const result=await transaction(async(client)=>{const opening=await lockOpening(client),{rows}=await client.query('SELECT * FROM transactions WHERE id=$1 FOR UPDATE',[id]);const t=rows[0];if(!t)throw Object.assign(new Error('Transaction not found.'),{status:404});if(t.status!=='COMPLETED')throw Object.assign(new Error('Only completed transactions can be voided.'),{status:409});const before=await expectedBalances(client,opening),[dc,dg]=delta(t.type,t.fee_mode,cents(t.amount_centavos),cents(t.fee_centavos));ensureNonnegative({cash:before.cash-dc,gcash:before.gcash-dg},'Voiding this transaction would make an expected balance negative. Void later dependent transactions first.');await client.query("UPDATE transactions SET status='VOIDED',voided_at=now(),void_reason=$1 WHERE id=$2",[reason,id]);return view((await client.query(`SELECT ${columns}${joins} WHERE t.id=$1`,[id])).rows[0])});res.json(result)
}))
