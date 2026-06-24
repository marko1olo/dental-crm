import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxDocumentUsesPaymentSnapshot } from './taxPaymentSnapshot.js';

describe('taxDocumentUsesPaymentSnapshot', () => {
  test('returns true for tax_deduction_certificate', () => {
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('tax_deduction_certificate'), true);
  });

  test('returns true for legacy_tax_deduction_certificate', () => {
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('legacy_tax_deduction_certificate'), true);
  });

  test('returns true for tax_deduction_registry', () => {
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('tax_deduction_registry'), true);
  });

  test('returns false for other document kinds', () => {
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('contract' as any), false);
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('receipt' as any), false);
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('treatment_plan' as any), false);
  });
});
