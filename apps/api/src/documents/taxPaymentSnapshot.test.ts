import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxDocumentUsesPaymentSnapshot } from './taxPaymentSnapshot.js';
import type { GeneratedDocument } from '@dental/shared';

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
    // Test a few other document kinds that are not in the set
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('invoice' as GeneratedDocument['kind']), false);
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('treatment_plan' as GeneratedDocument['kind']), false);
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('completed_works_act' as GeneratedDocument['kind']), false);
  });
});
