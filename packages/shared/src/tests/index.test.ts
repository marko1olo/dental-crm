import { test, describe } from 'node:test';
import assert from 'node:assert';
import { documentRequiresPaidRecord } from '../index.js';

describe('documentRequiresPaidRecord', () => {
  test('returns true for completed_works_act which requires a paid record', () => {
    assert.strictEqual(documentRequiresPaidRecord('completed_works_act'), true);
  });

  test('returns false for prescription_medication_order which does not require a paid record', () => {
    assert.strictEqual(documentRequiresPaidRecord('prescription_medication_order'), false);
  });

  test('returns false for paid_medical_services_contract which does not require a paid record', () => {
    assert.strictEqual(documentRequiresPaidRecord('paid_medical_services_contract'), false);
  });
});
