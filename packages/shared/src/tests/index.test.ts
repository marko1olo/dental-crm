import { test, describe } from 'node:test';
import assert from 'node:assert';
import { documentRequiresPaidRecord, documentKindSchema, documentPayloadActualKeys } from '../index.js';

describe('documentPayloadActualKeys', () => {
  test('returns an empty array for null or undefined payload', () => {
    assert.deepStrictEqual(documentPayloadActualKeys(null), []);
    assert.deepStrictEqual(documentPayloadActualKeys(undefined), []);
  });

  test('returns an empty array for an empty payload', () => {
    assert.deepStrictEqual(documentPayloadActualKeys({}), []);
  });

  test('returns the keys that have defined values', () => {
    const payload = {
      patientIntakeQuestionnaire: {} as any,
      paymentInvoice: {} as any
    };
    const expected = ['patientIntakeQuestionnaire', 'paymentInvoice'];
    assert.deepStrictEqual(documentPayloadActualKeys(payload as any), expected);
  });

  test('filters out keys with undefined values', () => {
    const payload = {
      patientIntakeQuestionnaire: {} as any,
      paymentInvoice: undefined,
      completedWorksAct: {} as any,
      minorLegalRepresentativeConsent: undefined
    };
    const expected = ['patientIntakeQuestionnaire', 'completedWorksAct'];
    assert.deepStrictEqual(documentPayloadActualKeys(payload), expected);
  });
});

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
