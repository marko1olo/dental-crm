import { test, describe, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { db } from '../../db/client.js';
import { createClinicalRuleInDb } from '../../db/clinicalQuery.js';
import type { CreateClinicalRuleInput } from '@dental/shared';

describe('createClinicalRuleInDb', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  const organizationId = 'org-123';

  test('successfully creates a clinical rule with all fields', async (t) => {
    const input: CreateClinicalRuleInput = {
      title: 'Rule 1',
      category: 'document',
      specialty: 'therapist',
      action: 'show_warning',
      severity: 'warning',
      ownerRole: 'doctor',
      triggerServiceIds: ['s1'],
      requiredServiceIds: ['s2'],
      requiresCompletedServiceIds: ['s3'],
      blockedServiceIds: ['s4'],
      condition: 'cond1',
      warningText: 'warning1',
      patientText: 'patient1',
      active: false
    };

    const mockRecord = {
      id: 'rule-123',
      organizationId,
      title: input.title,
      category: input.category,
      specialty: input.specialty,
      action: input.action,
      severity: input.severity,
      ownerRole: input.ownerRole,
      triggerServiceIdsJson: JSON.stringify(input.triggerServiceIds),
      requiredServiceIdsJson: JSON.stringify(input.requiredServiceIds),
      requiresCompletedServiceIdsJson: JSON.stringify(input.requiresCompletedServiceIds),
      blockedServiceIdsJson: JSON.stringify(input.blockedServiceIds),
      condition: input.condition,
      warningText: input.warningText,
      patientText: input.patientText,
      isActive: input.active
    };

    let insertedValues: any = null;

    const returningMock = mock.fn(async () => [mockRecord]);
    const valuesMock = mock.fn((vals) => {
      insertedValues = vals;
      return { returning: returningMock };
    });
    t.mock.method(db, 'insert', () => ({ values: valuesMock }));

    const result = await createClinicalRuleInDb(organizationId, input);

    assert.strictEqual(result.id, 'rule-123');
    assert.strictEqual(result.title, 'Rule 1');
    assert.deepStrictEqual(result.triggerServiceIds, ['s1']);
    assert.strictEqual(result.active, false);

    assert.ok(insertedValues);
    assert.strictEqual(insertedValues.organizationId, organizationId);
    assert.strictEqual(insertedValues.isActive, false);
    assert.strictEqual(insertedValues.triggerServiceIdsJson, '["s1"]');
  });

  test('successfully creates a clinical rule with default fallback fields', async (t) => {
    const input = {
      title: 'Rule 2',
      category: 'service_group',
      specialty: 'surgeon',
      action: 'block_service',
      severity: 'blocker',
      ownerRole: 'admin'
    } as CreateClinicalRuleInput;

    const mockRecord = {
      id: 'rule-456',
      organizationId,
      title: input.title,
      category: input.category,
      specialty: input.specialty,
      action: input.action,
      severity: input.severity,
      ownerRole: input.ownerRole,
      triggerServiceIdsJson: '[]',
      requiredServiceIdsJson: '[]',
      requiresCompletedServiceIdsJson: '[]',
      blockedServiceIdsJson: '[]',
      condition: null,
      warningText: '',
      patientText: '',
      isActive: true
    };

    let insertedValues: any = null;
    const returningMock = mock.fn(async () => [mockRecord]);
    const valuesMock = mock.fn((vals) => {
      insertedValues = vals;
      return { returning: returningMock };
    });
    t.mock.method(db, 'insert', () => ({ values: valuesMock }));

    const result = await createClinicalRuleInDb(organizationId, input);

    assert.strictEqual(result.id, 'rule-456');
    assert.deepStrictEqual(result.triggerServiceIds, []);
    assert.strictEqual(result.active, true);

    assert.ok(insertedValues);
    assert.strictEqual(insertedValues.isActive, true);
    assert.strictEqual(insertedValues.triggerServiceIdsJson, '[]');
    assert.strictEqual(insertedValues.condition, null);
    assert.strictEqual(insertedValues.warningText, '');
  });

  test('throws error if insertion fails (no record returned)', async (t) => {
    const input = {
      title: 'Rule 3',
      category: 'service_group',
      specialty: 'surgeon',
      action: 'block_service',
      severity: 'blocker',
      ownerRole: 'admin'
    } as CreateClinicalRuleInput;

    const returningMock = mock.fn(async () => []);
    const valuesMock = mock.fn(() => ({ returning: returningMock }));
    t.mock.method(db, 'insert', () => ({ values: valuesMock }));

    await assert.rejects(
      async () => await createClinicalRuleInDb(organizationId, input),
      /Failed to create clinical rule/
    );
  });
});
