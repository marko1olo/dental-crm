import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentYear } from './taxPaymentSnapshot.js';
import type { Payment } from '@dental/shared';

describe('taxPaymentYear', () => {
  test('returns null when neither fiscalReceiptIssuedAt nor paidAt are present', () => {
    const payment = { id: 'p1' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), null);
  });

  test('extracts year from fiscalReceiptIssuedAt using standard ISO format', () => {
    const payment = { id: 'p1', fiscalReceiptIssuedAt: '2023-05-12T10:00:00Z' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2023);
  });

  test('falls back to paidAt if fiscalReceiptIssuedAt is not present', () => {
    const payment = { id: 'p1', paidAt: '2024-08-20T10:00:00Z' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2024);
  });

  test('prefers fiscalReceiptIssuedAt over paidAt', () => {
    const payment = { id: 'p1', fiscalReceiptIssuedAt: '2023-05-12', paidAt: '2024-08-20' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2023);
  });

  test('extracts year falling back to Date parsing if regex does not match at start', () => {
    const payment = { id: 'p1', fiscalReceiptIssuedAt: '05/12/2021' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2021);
  });

  test('returns null for an invalid date string', () => {
    const payment = { id: 'p1', fiscalReceiptIssuedAt: 'not a real date string' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), null);
  });
});
