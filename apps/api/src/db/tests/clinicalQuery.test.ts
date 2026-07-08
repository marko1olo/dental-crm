import { test, describe, afterEach, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { evaluateClinicalRulesInDb } from '../clinicalQuery.js';
import { db } from '../client.js';

describe('evaluateClinicalRulesInDb', () => {
  beforeEach(() => {
    mock.restoreAll();
  });
  afterEach(() => {
    mock.restoreAll();
  });

  function mockDbResponse(records: any[]) {
    mock.method(db, 'select', () => {
      return {
        from: () => {
          return {
            where: async () => {
              return records;
            }
          }
        }
      }
    });
  }

  const baseRecord = {
    id: 'rule-1',
    organizationId: 'org-1',
    title: 'Test Rule',
    category: 'therapy',
    specialty: 'therapist',
    action: 'add_service',
    severity: 'warning',
    ownerRole: 'doctor',
    triggerServiceIdsJson: '[]',
    requiredServiceIdsJson: '[]',
    requiresCompletedServiceIdsJson: '[]',
    blockedServiceIdsJson: '[]',
    condition: null,
    warningText: 'Warning text',
    patientText: 'Patient text',
    isActive: true
  };

  test('returns empty evaluations when no rules match', async () => {
    mockDbResponse([]);
    const result = await evaluateClinicalRulesInDb('org-1', {
      patientId: 'patient-1',
      serviceIds: ['service-1'],
      completedServiceIds: []
    });

    assert.deepStrictEqual(result.evaluations, []);
    assert.deepStrictEqual(result.summary.evaluatedRules, 0);
  });

  test('ignores inactive rules', async () => {
    mockDbResponse([{ ...baseRecord, triggerServiceIdsJson: '["service-1"]', isActive: false }]);
    const result = await evaluateClinicalRulesInDb('org-1', {
      patientId: 'patient-1',
      serviceIds: ['service-1'],
      completedServiceIds: []
    });
    assert.deepStrictEqual(result.evaluations, []);
  });

  test('resolves successfully when all required and completed services are present', async () => {
    mockDbResponse([{
      ...baseRecord,
      triggerServiceIdsJson: '["service-1"]',
      requiredServiceIdsJson: '["service-req-1"]',
      requiresCompletedServiceIdsJson: '["service-comp-1"]'
    }]);

    const result = await evaluateClinicalRulesInDb('org-1', {
      patientId: 'patient-1',
      serviceIds: ['service-1', 'service-req-1'],
      completedServiceIds: ['service-comp-1']
    });

    assert.strictEqual(result.evaluations.length, 1);
    assert.strictEqual(result.evaluations[0].resolved, true);
    assert.strictEqual(result.summary.unresolved, 0);
    assert.strictEqual(result.summary.coveredRules, 1);
  });

  test('does not resolve when missing required services', async () => {
    mockDbResponse([{
      ...baseRecord,
      triggerServiceIdsJson: '["service-1"]',
      requiredServiceIdsJson: '["service-req-1", "service-req-2"]'
    }]);

    const result = await evaluateClinicalRulesInDb('org-1', {
      patientId: 'patient-1',
      serviceIds: ['service-1', 'service-req-1'],
      completedServiceIds: []
    });

    assert.strictEqual(result.evaluations.length, 1);
    assert.strictEqual(result.evaluations[0].resolved, false);
    assert.deepStrictEqual(result.evaluations[0].missingRequiredServiceIds, ['service-req-2']);
    assert.strictEqual(result.summary.unresolved, 1);
    assert.strictEqual(result.summary.requiredServices, 1);
  });

  test('does not resolve when missing completed services', async () => {
    mockDbResponse([{
      ...baseRecord,
      triggerServiceIdsJson: '["service-1"]',
      requiresCompletedServiceIdsJson: '["service-comp-1"]'
    }]);

    const result = await evaluateClinicalRulesInDb('org-1', {
      patientId: 'patient-1',
      serviceIds: ['service-1'],
      completedServiceIds: []
    });

    assert.strictEqual(result.evaluations.length, 1);
    assert.strictEqual(result.evaluations[0].resolved, false);
    assert.deepStrictEqual(result.evaluations[0].missingCompletedServiceIds, ['service-comp-1']);
  });

  test('handles block_service logic correctly with blocked services', async () => {
    mockDbResponse([{
      ...baseRecord,
      action: 'block_service',
      triggerServiceIdsJson: '["service-1"]',
      blockedServiceIdsJson: '["service-1"]'
    }]);

    const result = await evaluateClinicalRulesInDb('org-1', {
      patientId: 'patient-1',
      serviceIds: ['service-1'],
      completedServiceIds: []
    });

    assert.strictEqual(result.evaluations.length, 1);
    assert.strictEqual(result.evaluations[0].resolved, false);
    assert.deepStrictEqual(result.evaluations[0].blockedServiceIds, ['service-1']);
  });

  test('show_warning and schedule_followup always remain unresolved', async () => {
    mockDbResponse([
      {
        ...baseRecord,
        id: 'rule-warning',
        action: 'show_warning',
        triggerServiceIdsJson: '["service-1"]',
        requiredServiceIdsJson: '[]' // no missing services
      },
      {
        ...baseRecord,
        id: 'rule-followup',
        action: 'schedule_followup',
        triggerServiceIdsJson: '["service-1"]',
        requiredServiceIdsJson: '[]' // no missing services
      }
    ]);

    const result = await evaluateClinicalRulesInDb('org-1', {
      patientId: 'patient-1',
      serviceIds: ['service-1'],
      completedServiceIds: []
    });

    assert.strictEqual(result.evaluations.length, 2);
    assert.strictEqual(result.evaluations[0].resolved, false);
    assert.strictEqual(result.evaluations[1].resolved, false);
    assert.strictEqual(result.summary.unresolved, 2);
  });
});
