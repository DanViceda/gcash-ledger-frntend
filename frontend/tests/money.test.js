import assert from 'node:assert/strict'
import test from 'node:test'
import { money, pesosToCentavos } from '../src/utils/format.js'

test('peso input converts to exact integer centavos', () => {
  assert.equal(pesosToCentavos(''), 0)
  assert.equal(pesosToCentavos('500.01'), 50001)
  assert.equal(pesosToCentavos('0.1'), 10)
  assert.equal(Number.isNaN(pesosToCentavos('1.001')), true)
  assert.equal(Number.isNaN(pesosToCentavos('90071992547410.00')), true)
})

test('large centavo strings render without floating point rounding', () => {
  assert.match(money('9007199254740993'), /90,071,992,547,409\.93/)
})
