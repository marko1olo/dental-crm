import { test, describe, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import { createClinicalRule, clinicalRules, auditEvents } from '../sampleData.js';

describe('createClinicalRule', () => {
  let originalClinicalRules: any[];
  let originalAuditEvents: any[];

  beforeEach(() => {
    // Backup global state to prevent test pollution
    originalClinicalRules = [...clinicalRules];
    originalAuditEvents = [...auditEvents];
  });

  afterEach(() => {
    // Restore global state
    clinicalRules.length = 0;
    clinicalRules.push(...originalClinicalRules);

    auditEvents.length = 0;
    auditEvents.push(...originalAuditEvents);
  });

  test('successfully creates a clinical rule', () => {
    const input: Parameters<typeof createClinicalRule>[0] = {
      title: 'Test Rule',
      category: 'therapy',
      specialty: 'therapist',
      action: 'show_warning',
      severity: 'warning',
      ownerRole: 'doctor',
      triggerServiceIds: ['service-1'],
      requiredServiceIds: [],
      requiresCompletedServiceIds: [],
      blockedServiceIds: [],
      warningText: 'Warning text',
      patientText: 'Patient text',
      active: true
    };

    const initialRulesCount = clinicalRules.length;
    const initialAuditCount = auditEvents.length;

    const rule = createClinicalRule(input);

    assert.ok(rule.id.startsWith('rule-'));
    assert.strictEqual(rule.title, 'Test Rule');

    // Check state side-effects
    assert.strictEqual(clinicalRules.length, initialRulesCount + 1);
    assert.strictEqual(clinicalRules[0], rule); // Because of unshift

    assert.strictEqual(auditEvents.length, initialAuditCount + 1);
    const lastAudit = auditEvents[0]; // recordAuditEvent unshifts to auditEvents array
    assert.ok(lastAudit);
    assert.strictEqual(lastAudit!.entityType, 'clinical_rule');
    assert.strictEqual(lastAudit!.entityId, rule.id);
    assert.strictEqual(lastAudit!.action, 'clinical_rule_created');
  });

  test('fails validation when blockedServiceIds is empty for block_service action', () => {
    const input: Parameters<typeof createClinicalRule>[0] = {
      title: 'Test Block Rule',
      category: 'therapy',
      specialty: 'therapist',
      action: 'block_service',
      severity: 'blocker',
      ownerRole: 'doctor',
      triggerServiceIds: ['service-1'],
      requiredServiceIds: [],
      requiresCompletedServiceIds: [],
      blockedServiceIds: [],
      warningText: 'Warning text',
      patientText: 'Patient text',
      active: true
    };

    assert.throws(() => {
      createClinicalRule(input);
    }, /Для блокирующего правила укажите блокируемую услугу или требуемую завершенную услугу/);
  });

  test('fails validation when requiredServiceIds is empty for add_required_service action', () => {
    const input: Parameters<typeof createClinicalRule>[0] = {
      title: 'Test Required Rule',
      category: 'therapy',
      specialty: 'therapist',
      action: 'add_required_service',
      severity: 'warning',
      ownerRole: 'doctor',
      triggerServiceIds: ['service-1'],
      requiredServiceIds: [],
      requiresCompletedServiceIds: [],
      blockedServiceIds: [],
      warningText: 'Warning text',
      patientText: 'Patient text',
      active: true
    };

    assert.throws(() => {
      createClinicalRule(input);
    }, /Для правила добавления услуги укажите хотя бы одну обязательную услугу/);
  });
});
