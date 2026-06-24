import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentYear } from './taxPaymentSnapshot.js';
import type { Payment } from '@dental/shared';

describe('taxPaymentYear', () => {
  test('returns null if neither fiscalReceiptIssuedAt nor paidAt is present', () => {
    const payment = {} as Payment;
    assert.strictEqual(taxPaymentYear(payment), null);
  });

  test('uses fiscalReceiptIssuedAt over paidAt if both are present', () => {
    const payment = {
      fiscalReceiptIssuedAt: '2023-05-10T12:00:00Z',
      paidAt: '2022-04-10T12:00:00Z',
    } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2023);
  });

  test('uses paidAt if fiscalReceiptIssuedAt is absent', () => {
    const payment = {
      paidAt: '2021-04-10T12:00:00Z',
    } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2021);
  });

  test('extracts year from ISO date string', () => {
    const payment = { fiscalReceiptIssuedAt: '2023-05-10T12:00:00Z' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2023);
  });

  test('extracts year from YYYY-MM-DD string', () => {
    const payment = { fiscalReceiptIssuedAt: '2024-01-01' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2024);
  });

  test('extracts year from non-standard Date string representation as fallback', () => {
    const payment = { fiscalReceiptIssuedAt: 'May 10, 2023 12:00:00' } as Payment;
    // Regex fails to find YYYY at start, so falls back to Date parsing
    assert.strictEqual(taxPaymentYear(payment), 2023);
  });

  test('returns null for invalid date string not matching regex or Date constructor', () => {
    const payment = { fiscalReceiptIssuedAt: 'invalid date' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), null);
  });
});
