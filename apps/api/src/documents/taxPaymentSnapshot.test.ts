import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxDocumentDuplicateSensitive } from './taxPaymentSnapshot.js';

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
