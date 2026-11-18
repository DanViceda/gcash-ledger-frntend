import test from 'node:test'
import assert from 'node:assert/strict'
import { cents,feeFor,jsonMoney } from '../src/utils/money.js'
import { applyFunding, applyAdjustment, delta, ensureNonnegative } from '../src/modules/balances/ledger.js'
import { parseAdjustmentRequest } from '../src/modules/balances/adjustments.js'
import { requestHash } from '../src/utils/idempotency.js'
import { normalizePhone } from '../src/utils/phone.js'

test('fee is rounded up by each 50000 centavos with 500 centavos per step',()=>{
 assert.equal(feeFor(1n,50000n,500n),500n)
 assert.equal(feeFor(50000n,50000n,500n),500n)
 assert.equal(feeFor(50001n,50000n,500n),1000n)
})
test('incoming centavos are exact and bounded to PostgreSQL BIGINT',()=>{
 assert.equal(cents('9007199254740993').toString(),'9007199254740993')
 assert.equal(jsonMoney(9007199254740993n),'9007199254740993')
 assert.equal(jsonMoney(100n),100)
 assert.throws(()=>cents('9223372036854775808'))
 assert.throws(()=>cents('1.25'))
 assert.throws(()=>cents(Number.MAX_SAFE_INTEGER + 1),/exact integer/i)
 assert.equal(cents(String(Number.MAX_SAFE_INTEGER + 1)).toString(),'9007199254740992')
})
test('ledger deltas preserve the fee invariant across transaction types and modes',()=>{
 for(const type of ['CASH_IN','CASH_OUT','LOAD'])for(const mode of ['ON_TOP','DEDUCTED']){
  const [cash,gcash]=delta(type,mode,10000n,500n)
  assert.equal(cash+gcash,500n)
 }
 assert.deepEqual(delta('CASH_IN','ON_TOP',10000n,500n),[10500n,-10000n])
 assert.deepEqual(delta('CASH_OUT','DEDUCTED',10000n,500n),[-9500n,10000n])
})
test('balance funding increases only the selected account and rejects invalid amounts',()=>{
 const opening={cash:1000n,gcash:2000n}
 assert.deepEqual(applyFunding(opening,'CASH',500n),{cash:1500n,gcash:2000n})
 assert.deepEqual(applyFunding(opening,'GCASH',500n),{cash:1000n,gcash:2500n})
 assert.throws(()=>applyFunding(opening,'CASH',0n),/positive/i)
 assert.throws(()=>applyFunding(opening,'OTHER',500n),/invalid/i)
})
test('balance adjustments add or deduct exact centavos from only the selected account',()=>{
 const opening={cash:1000n,gcash:2000n}
 assert.deepEqual(applyAdjustment(opening,'CASH','ADD',125n),{cash:1125n,gcash:2000n})
 assert.deepEqual(applyAdjustment(opening,'GCASH','DEDUCT',25n),{cash:1000n,gcash:1975n})
 assert.throws(()=>ensureNonnegative(applyAdjustment(opening,'CASH','DEDUCT',1001n)),/negative/i)
 assert.throws(()=>applyAdjustment(opening,'OTHER','ADD',1n),/invalid/i)
 assert.throws(()=>applyAdjustment(opening,'CASH','OTHER',1n),/invalid/i)
 assert.throws(()=>applyAdjustment(opening,'CASH','ADD',0n),/positive/i)
})
test('balance adjustment request requires a valid account, type, positive exact amount, and reason',()=>{
 assert.deepEqual(parseAdjustmentRequest({account:'GCASH',adjustmentType:'DEDUCT',amountCentavos:'125',reason:'  correction  '}),{account:'GCASH',adjustmentType:'DEDUCT',amount:125n,reason:'correction'})
 for(const request of [
  {account:'CASH',adjustmentType:'ADD',amountCentavos:1},
  {account:'CASH',adjustmentType:'ADD',amountCentavos:0,reason:'reason'},
  {account:'CASH',adjustmentType:'ADD',amountCentavos:1,reason:' '},
  {account:'OTHER',adjustmentType:'ADD',amountCentavos:1,reason:'reason'},
  {account:'CASH',adjustmentType:'OTHER',amountCentavos:1,reason:'reason'},
  {account:'CASH',adjustmentType:'ADD',amountCentavos:1,reason:'x'.repeat(2001)},
 ]) assert.throws(()=>parseAdjustmentRequest(request),{status:400})
})
test('idempotency payload hash ignores object key order but captures value changes',()=>{
 assert.equal(requestHash({a:1,b:2}),requestHash({b:2,a:1}))
 assert.notEqual(requestHash({a:1}),requestHash({a:2}))
})
test('Philippine mobile validation accepts exactly 09 plus nine digits',()=>{
 assert.equal(normalizePhone('09655432132'),'09655432132')
 for (const phone of ['9655432132','0965543213','096554321321','08123456789','09ABC543213','09-655432132',' 09655432132 ']) {
  assert.throws(()=>normalizePhone(phone),{status:400})
 }
})
