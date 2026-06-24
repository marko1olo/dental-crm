import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxDocumentUsesPaymentSnapshot } from './taxPaymentSnapshot.js';
import type { GeneratedDocument } from '@dental/shared';
import { documentKindSchema } from '@dental/shared';

describe('taxDocumentUsesPaymentSnapshot', () => {
  test('returns true for tax snapshot document kinds', () => {
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('tax_deduction_certificate'), true);
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('legacy_tax_deduction_certificate'), true);
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('tax_deduction_registry'), true);
  });

  test('returns false for non-tax snapshot document kinds', () => {
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('completed_works_act'), false);
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('paid_medical_services_contract'), false);
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('payment_receipt'), false);
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('patient_intake_questionnaire'), false);
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('treatment_plan'), false);
  });

  test('handles all valid document kinds without throwing', () => {
    const snapshotKinds: GeneratedDocument["kind"][] = [
      "tax_deduction_certificate",
      "legacy_tax_deduction_certificate",
      "tax_deduction_registry"
    ];

    for (const kind of documentKindSchema.options) {
      const result = taxDocumentUsesPaymentSnapshot(kind);
      const isSnapshotKind = snapshotKinds.includes(kind);
      assert.strictEqual(result, isSnapshotKind, `Expected ${kind} to be ${isSnapshotKind}`);
    }
  });
});
