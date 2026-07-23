import { test, describe, afterEach, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';
import { registerClinicalRoutes } from '../../routes/clinical.js';
import { db } from '../../db/client.js';
import * as schema from '../../db/schema.js';


describe('clinical routes integration', () => {
  let app: import('fastify').FastifyInstance;
  const originalEnv = process.env;

  beforeEach(async () => {
    app = Fastify();
    await registerClinicalRoutes(app);
    process.env = { ...originalEnv };
    process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = '1';
    process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = '1';
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    app.close();
    process.env = originalEnv;
    mock.restoreAll();
  });

  test('POST /api/clinical/rules/evaluate validates input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/clinical/rules/evaluate',
      payload: {}
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error, 'ClinicalRuleValidationError');
  });

  test('POST /api/clinical/rules/evaluate handles organization not found', async () => {
    mock.method(db, 'select', () => ({
        from: () => ({
            limit: async () => []
        })
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/clinical/rules/evaluate',
      payload: { patientId: '123e4567-e89b-12d3-a456-426614174000', scenarioId: null, serviceIds: ['s1'], completedServiceIds: ['s2'] }
    });

    assert.strictEqual(response.statusCode, 500);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error, 'NoOrganizationFound');
  });

  test('POST /api/clinical/rules/evaluate succeeds', async () => {
    let callCount = 0;
    mock.method(db, 'select', () => ({
        from: () => {
            callCount++;
            if (callCount === 1) { // getDefaultOrganizationId
                return { limit: async () => [{ id: '00000000-0000-0000-0000-000000000000' }] };
            }
            // getClinicalRules
            return { where: async () => [] };
        }
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/clinical/rules/evaluate',
      payload: { patientId: '123e4567-e89b-12d3-a456-426614174000', scenarioId: null, serviceIds: ['s1'], completedServiceIds: ['s2'] }
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(body.evaluations);
  });

  test('POST /api/clinical/rules validates input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/clinical/rules',
      payload: {}
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error, 'ClinicalRuleValidationError');
  });

  test('POST /api/clinical/rules handles organization not found', async () => {
    mock.method(db, 'select', () => ({
        from: () => ({
            limit: async () => []
        })
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/clinical/rules',
      payload: { title: 't', category: 'consultation', specialty: 'therapist', action: 'show_warning', severity: 'warning', ownerRole: 'doctor', triggerServiceIds: ['s1'], requiredServiceIds: [], requiresCompletedServiceIds: [], blockedServiceIds: [], warningText: 'warning', patientText: 'patient', active: true }
    });

    assert.strictEqual(response.statusCode, 500);
  });

  test('POST /api/clinical/rules succeeds', async () => {
    mock.method(db, 'select', () => ({
        from: () => ({
            limit: async () => [{ id: '00000000-0000-0000-0000-000000000000' }]
        })
    }));

    // We must return a nested object mimicking the Drizzle query builder
    mock.method(db, 'insert', () => ({
        values: () => ({
            returning: async () => [{ id: 'rule1', organizationId: '00000000-0000-0000-0000-000000000000', title: 't', category: 'consultation', specialty: 'therapist', action: 'show_warning', severity: 'warning', ownerRole: 'doctor', triggerServiceIdsJson: '["s1"]', requiredServiceIdsJson: '[]', requiresCompletedServiceIdsJson: '[]', blockedServiceIdsJson: '[]', condition: null, warningText: 'warning', patientText: 'patient', isActive: true }]
        })
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/clinical/rules',
      payload: { title: 't', category: 'consultation', specialty: 'therapist', action: 'show_warning', severity: 'warning', ownerRole: 'doctor', triggerServiceIds: ['s1'], requiredServiceIds: [], requiresCompletedServiceIds: [], blockedServiceIds: [], condition: null, warningText: 'warning', patientText: 'patient', active: true }
    });

    assert.strictEqual(response.statusCode, 200, response.body);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.id, 'rule1');
  });

  test('PATCH /api/clinical/rules/:ruleId validates input', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/clinical/rules/rule1',
      payload: { action: 'invalid' }
    });

    assert.strictEqual(response.statusCode, 400);
  });

  test('PATCH /api/clinical/rules/:ruleId handles organization not found', async () => {
    mock.method(db, 'select', () => ({
        from: () => {
            return {
                limit: async () => []
            }
        }
    }));

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/clinical/rules/rule1',
      payload: { title: 't' }
    });

    assert.strictEqual(response.statusCode, 500);
  });

  test('PATCH /api/clinical/rules/:ruleId succeeds', async () => {
    let callCount = 0;
    mock.method(db, 'select', () => ({
        from: () => {
            callCount++;
            if (callCount === 1) { // getDefaultOrganizationId
                return { limit: async () => [{ id: '00000000-0000-0000-0000-000000000000' }] };
            }
            if (callCount === 2 || callCount === 3) { // getClinicalRuleById
                 return { where: () => ({ limit: async () => [{ id: 'rule1', organizationId: '00000000-0000-0000-0000-000000000000', title: 'old', category: 'consultation', specialty: 'therapist', action: 'show_warning', severity: 'warning', ownerRole: 'doctor', triggerServiceIdsJson: '["s1"]', requiredServiceIdsJson: '[]', requiresCompletedServiceIdsJson: '[]', blockedServiceIdsJson: '[]', condition: null, warningText: 'warning', patientText: 'patient', isActive: true }] }) };
            }
        }
    }));

    mock.method(db, 'update', () => ({
        set: () => ({
            where: () => ({
                returning: async () => [{ id: 'rule1', organizationId: '00000000-0000-0000-0000-000000000000', title: 'new', category: 'consultation', specialty: 'therapist', action: 'show_warning', severity: 'warning', ownerRole: 'doctor', triggerServiceIdsJson: '["s1"]', requiredServiceIdsJson: '[]', requiresCompletedServiceIdsJson: '[]', blockedServiceIdsJson: '[]', condition: null, warningText: 'warning', patientText: 'patient', isActive: true }]
            })
        })
    }));

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/clinical/rules/rule1',
      payload: { title: 'new', warningText: 'warning', patientText: 'patient', action: 'show_warning' }
    });

    assert.strictEqual(response.statusCode, 200, response.body);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.title, 'new');
  });
});
