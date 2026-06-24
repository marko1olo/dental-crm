import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  documentRequiresPaidRecord,
  documentKindSchema,
  documentPayloadAllowedKeys,
  documentPayloadActualKeys
} from '../index.js';

describe('documentPayloadAllowedKeys', () => {
  test('returns expected payload keys for specific document kinds', () => {
    assert.deepStrictEqual(documentPayloadAllowedKeys('treatment_plan'), ['treatmentPlan']);
    assert.deepStrictEqual(documentPayloadAllowedKeys('tax_deduction_certificate'), ['taxPaymentSelection']);
  });

  test('returns an empty array for unknown document kinds', () => {
    // @ts-expect-error Testing invalid input
    assert.deepStrictEqual(documentPayloadAllowedKeys('unknown_kind'), []);
  });

  test('handles all valid document kinds without throwing', () => {
    for (const kind of documentKindSchema.options) {
      const result = documentPayloadAllowedKeys(kind);
      assert.ok(Array.isArray(result), `Expected array for kind ${kind}`);
    }
  });
});

describe('documentPayloadActualKeys', () => {
  test('returns empty array for null or undefined', () => {
    assert.deepStrictEqual(documentPayloadActualKeys(null), []);
    assert.deepStrictEqual(documentPayloadActualKeys(undefined), []);
  });

  test('returns empty array for empty payload', () => {
    assert.deepStrictEqual(documentPayloadActualKeys({}), []);
  });

  test('returns defined keys', () => {
    const payload = {
      treatmentPlan: { /* mock data */ },
      completedWorksAct: { /* mock data */ }
    };
    // @ts-expect-error Mock payload
    assert.deepStrictEqual(documentPayloadActualKeys(payload), ['treatmentPlan', 'completedWorksAct']);
  });

  test('filters out undefined values', () => {
    const payload = {
      treatmentPlan: { /* mock data */ },
      completedWorksAct: undefined
    };
    // @ts-expect-error Mock payload
    assert.deepStrictEqual(documentPayloadActualKeys(payload), ['treatmentPlan']);
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
