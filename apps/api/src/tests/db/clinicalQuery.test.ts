import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getClinicalRules } from '../../db/clinicalQuery.js';
import { db } from '../../db/client.js';

describe('getClinicalRules', () => {
  beforeEach(() => {
    test.mock.restoreAll();
  });

  test('should return an empty array if no rules exist', async (t) => {
    t.mock.method(db, 'select', () => ({
      from: () => ({
        where: async () => []
      })
    }));

    const rules = await getClinicalRules('org1');
    assert.deepEqual(rules, []);
  });

  test('should parse arrays correctly from json strings', async (t) => {
    t.mock.method(db, 'select', () => ({
      from: () => ({
        where: async () => [{
          id: '1',
          organizationId: 'org1',
          title: 'Rule 1',
          category: 'general',
          specialty: 'therapist',
          action: 'show_warning',
          severity: 'warning',
          ownerRole: 'doctor',
          triggerServiceIdsJson: '["1", "2"]',
          requiredServiceIdsJson: '[]',
          requiresCompletedServiceIdsJson: null,
          blockedServiceIdsJson: 'invalid-json',
          condition: 'none',
          warningText: 'warning',
          patientText: 'patient',
          isActive: true,
        }]
      })
    }));

    const rules = await getClinicalRules('org1');
    assert.equal(rules.length, 1);
    const rule = rules[0];
    assert.deepEqual(rule.triggerServiceIds, ["1", "2"]);
    assert.deepEqual(rule.requiredServiceIds, []);
    assert.deepEqual(rule.requiresCompletedServiceIds, []); // Should handle null
    assert.deepEqual(rule.blockedServiceIds, []); // Should handle invalid json
  });
});
