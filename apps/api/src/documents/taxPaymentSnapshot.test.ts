import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentYear } from './taxPaymentSnapshot.js';
import type { Payment } from '@dental/shared';

describe('taxPaymentYear', () => {
  test('returns explicitly parsed year from fiscalReceiptIssuedAt', () => {
    const payment = { fiscalReceiptIssuedAt: '2023-05-10T12:00:00Z' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2023);
  });

  test('returns explicitly parsed year from paidAt if fiscalReceiptIssuedAt is null', () => {
    const payment = { fiscalReceiptIssuedAt: null, paidAt: '2024-01-01' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2024);
  });

  test('returns year from parsed Date if format is different but valid', () => {
    const payment = { fiscalReceiptIssuedAt: 'Oct 23, 2021' } as unknown as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2021);
  });

  test('returns null if both fiscalReceiptIssuedAt and paidAt are null', () => {
    const payment = { fiscalReceiptIssuedAt: null, paidAt: null } as Payment;
    assert.strictEqual(taxPaymentYear(payment), null);
  });

  test('returns null if both fiscalReceiptIssuedAt and paidAt are undefined', () => {
    const payment = {} as Payment;
    assert.strictEqual(taxPaymentYear(payment), null);
  });

  test('returns null for invalid date string', () => {
    const payment = { paidAt: 'invalid-date' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), null);
  });
});
