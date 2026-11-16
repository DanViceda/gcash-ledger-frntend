import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidPhilippineMobile } from '../src/utils/customerPhone.js'

test('accepts a valid Philippine mobile number', () => {
  assert.equal(isValidPhilippineMobile('09655432132'), true)
})

test('rejects invalid prefixes, lengths, and non-digit characters', () => {
  for (const phone of ['9655432132', '0965543213', '096554321321', '08123456789', '09ABC543213', '09-655432132']) {
    assert.equal(isValidPhilippineMobile(phone), false, phone)
  }
})
