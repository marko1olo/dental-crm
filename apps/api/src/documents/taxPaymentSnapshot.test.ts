import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxDocumentDuplicateSensitive, taxPaymentYear } from './taxPaymentSnapshot.js';
import type { Payment } from '@dental/shared';

describe('taxDocumentDuplicateSensitive', () => {
  test('returns true for tax_deduction_certificate', () => {
    assert.strictEqual(taxDocumentDuplicateSensitive('tax_deduction_certificate'), true);
  });

  test('returns true for legacy_tax_deduction_certificate', () => {
    assert.strictEqual(taxDocumentDuplicateSensitive('legacy_tax_deduction_certificate'), true);
  });

  test('returns false for other document kinds', () => {
    assert.strictEqual(taxDocumentDuplicateSensitive('completed_works_act'), false);
    assert.strictEqual(taxDocumentDuplicateSensitive('paid_medical_services_contract'), false);
    assert.strictEqual(taxDocumentDuplicateSensitive('informed_consent'), false);
  });
});

describe('taxPaymentYear', () => {
  const basePayment = {} as Payment;

  test('returns null when neither fiscalReceiptIssuedAt nor paidAt are provided', () => {
    assert.strictEqual(taxPaymentYear({ ...basePayment, fiscalReceiptIssuedAt: undefined, paidAt: undefined }), null);
  });

  test('uses fiscalReceiptIssuedAt when both are provided', () => {
    assert.strictEqual(
      taxPaymentYear({ ...basePayment, fiscalReceiptIssuedAt: '2023-05-01T12:00:00Z', paidAt: '2022-01-01T12:00:00Z' }),
      2023
    );
  });

  test('uses paidAt when fiscalReceiptIssuedAt is absent', () => {
    assert.strictEqual(
      taxPaymentYear({ ...basePayment, fiscalReceiptIssuedAt: undefined, paidAt: '2024-11-15T08:30:00Z' }),
      2024
    );
  });

  test('extracts the year from standard ISO dates starting with 4 digits', () => {
    assert.strictEqual(taxPaymentYear({ ...basePayment, paidAt: '2021-02-28T10:00:00Z' }), 2021);
    assert.strictEqual(taxPaymentYear({ ...basePayment, paidAt: '1999-12-31' }), 1999);
  });

  test('parses valid date strings that do not start with a 4-digit year', () => {
    // These strings don't match /^(\d{4})/ so they fall back to `new Date()` parsing
    assert.strictEqual(taxPaymentYear({ ...basePayment, paidAt: 'Dec 25, 2020' }), 2020);
    assert.strictEqual(taxPaymentYear({ ...basePayment, paidAt: '03/15/2019' }), 2019);
  });

  test('returns null for completely invalid strings', () => {
    assert.strictEqual(taxPaymentYear({ ...basePayment, paidAt: 'not a date' }), null);
    assert.strictEqual(taxPaymentYear({ ...basePayment, paidAt: '----' }), null);
  });
});
