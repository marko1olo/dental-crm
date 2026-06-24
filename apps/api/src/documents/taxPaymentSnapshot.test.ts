import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentYear } from './taxPaymentSnapshot.js';
import type { Payment } from '@dental/shared';

describe('taxPaymentYear', () => {
  test('returns null when neither fiscalReceiptIssuedAt nor paidAt is provided', () => {
    const payment = {} as Payment;
    assert.strictEqual(taxPaymentYear(payment), null);
  });

  test('extracts explicit year from fiscalReceiptIssuedAt starting with YYYY', () => {
    const payment = { fiscalReceiptIssuedAt: '2023-05-10T12:00:00Z' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2023);
  });

  test('extracts year from fiscalReceiptIssuedAt via Date parsing if it does not start with YYYY', () => {
    // A string that might be parsed correctly by Date but doesn't start with 4 digits.
    // e.g. "May 10, 2022"
    const payment = { fiscalReceiptIssuedAt: 'May 10, 2022' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2022);
  });

  test('falls back to paidAt if fiscalReceiptIssuedAt is not present', () => {
    const payment = { paidAt: '2021-08-15T00:00:00Z' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2021);
  });

  test('prioritizes fiscalReceiptIssuedAt over paidAt', () => {
    const payment = {
      fiscalReceiptIssuedAt: '2023-01-01',
      paidAt: '2022-12-31'
    } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2023);
  });

  test('returns null for invalid date strings', () => {
    const payment = { fiscalReceiptIssuedAt: 'invalid-date-string' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), null);
  });
});
