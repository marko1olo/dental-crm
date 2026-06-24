import { test, describe } from 'node:test';
import assert from 'node:assert';
import { documentRequiresPaidRecord, documentKindSchema, documentPayloadAllowedKeys, type DocumentKind } from '../index.js';

describe('documentRequiresPaidRecord', () => {
  test('returns expected boolean for different document kinds', () => {
    // Requires paid record
    assert.strictEqual(documentRequiresPaidRecord('completed_works_act'), true);
    assert.strictEqual(documentRequiresPaidRecord('tax_deduction_certificate'), true);
    assert.strictEqual(documentRequiresPaidRecord('payment_receipt'), true);
    assert.strictEqual(documentRequiresPaidRecord('payment_refund_correction_request'), true);
    assert.strictEqual(documentRequiresPaidRecord('legacy_tax_deduction_certificate'), true);
    assert.strictEqual(documentRequiresPaidRecord('tax_deduction_registry'), true);

    // Doesn't require paid record
    assert.strictEqual(documentRequiresPaidRecord('paid_medical_services_contract'), false);
    assert.strictEqual(documentRequiresPaidRecord('treatment_plan'), false);
    assert.strictEqual(documentRequiresPaidRecord('payment_invoice'), false);
    assert.strictEqual(documentRequiresPaidRecord('informed_consent'), false);
    assert.strictEqual(documentRequiresPaidRecord('prescription_medication_order'), false);
    assert.strictEqual(documentRequiresPaidRecord('lab_work_order'), false);
  });

  test('handles all valid document kinds without throwing', () => {
    for (const kind of documentKindSchema.options) {
      const result = documentRequiresPaidRecord(kind);
      assert.strictEqual(typeof result, 'boolean');
    }
  });
});

describe('documentPayloadAllowedKeys', () => {
  test('returns expected payload keys for known document kinds', () => {
    assert.deepStrictEqual(documentPayloadAllowedKeys('paid_medical_services_contract'), ['paidMedicalServicesContract']);
    assert.deepStrictEqual(documentPayloadAllowedKeys('treatment_plan'), ['treatmentPlan']);
    assert.deepStrictEqual(documentPayloadAllowedKeys('tax_deduction_certificate'), ['taxPaymentSelection']);
    assert.deepStrictEqual(documentPayloadAllowedKeys('patient_intake_questionnaire'), ['patientIntakeQuestionnaire']);
  });

  test('returns empty array for unknown document kinds', () => {
    // Testing invalid input
    assert.deepStrictEqual(documentPayloadAllowedKeys('unknown_document_kind' as DocumentKind), []);
  });

  test('handles all valid document kinds without throwing and returns an array', () => {
    for (const kind of documentKindSchema.options) {
      const result = documentPayloadAllowedKeys(kind);
      assert.ok(Array.isArray(result));
    }
  });
});
