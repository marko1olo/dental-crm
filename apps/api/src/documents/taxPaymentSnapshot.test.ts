import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentYear } from './taxPaymentSnapshot.js';
import type { Payment } from '@dental/shared';

describe('taxPaymentYear', () => {
  const basePayment = {
    id: 'test-payment',
    organizationId: 'org-1',
    patientId: 'patient-1',
    visitId: null,
    documentId: null,
    amountRub: 1000,
    method: 'cash',
    status: 'paid',
    createdAt: '2023-01-01T00:00:00.000Z',
    note: null
  } as Payment;

  test('returns null if both fiscalReceiptIssuedAt and paidAt are missing', () => {
    const payment = { ...basePayment, fiscalReceiptIssuedAt: null, paidAt: null };
    assert.strictEqual(taxPaymentYear(payment), null);
  });

  test('extracts explicit year from fiscalReceiptIssuedAt starting with 4 digits', () => {
    const payment = { ...basePayment, fiscalReceiptIssuedAt: '2023-10-15', paidAt: '2022-01-01' };
    assert.strictEqual(taxPaymentYear(payment), 2023);
  });

  test('falls back to paidAt if fiscalReceiptIssuedAt is missing', () => {
    const payment = { ...basePayment, fiscalReceiptIssuedAt: null, paidAt: '2022-12-31T23:59:59.000Z' };
    assert.strictEqual(taxPaymentYear(payment), 2022);
  });

  test('parses year from a valid date string that does not start with 4 digits', () => {
    const payment = { ...basePayment, fiscalReceiptIssuedAt: 'Dec 25, 1995' };
    assert.strictEqual(taxPaymentYear(payment), 1995);
  });

  test('returns null for an invalid date string', () => {
    const payment = { ...basePayment, fiscalReceiptIssuedAt: 'invalid date' };
    assert.strictEqual(taxPaymentYear(payment), null);
  });
});
