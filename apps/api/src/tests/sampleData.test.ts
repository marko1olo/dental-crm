import * as assert from "node:assert";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	auditEvents,
	clinicalRules,
	createClinicalRule,
} from "../sampleData.js";

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
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  buildBillingSummary,
  treatmentPlanItems,
  payments,
  documents,
  serviceCatalog,
  serviceCatalogMap
} from '../sampleData.js';
import type {
  TreatmentPlanItem,
  Payment,
  GeneratedDocument,
  ServiceCatalogItem
} from '@dental/shared';
import { randomUUID } from 'node:crypto';

describe('buildBillingSummary', () => {
  // Backup original data
  const originalTreatmentPlanItems = [...treatmentPlanItems];
  const originalPayments = [...payments];
  const originalDocuments = [...documents];
  const originalServiceCatalog = [...serviceCatalog];
  const originalServiceCatalogMap = new Map(serviceCatalogMap);

    // Clear arrays
    treatmentPlanItems.length = 0;
    payments.length = 0;
    documents.length = 0;
    serviceCatalog.length = 0;
    serviceCatalogMap.clear();

    // Restore arrays
    treatmentPlanItems.length = 0;
    treatmentPlanItems.push(...originalTreatmentPlanItems);

    payments.length = 0;
    payments.push(...originalPayments);

    documents.length = 0;
    documents.push(...originalDocuments);

    serviceCatalog.length = 0;
    serviceCatalog.push(...originalServiceCatalog);

    serviceCatalogMap.clear();
    for (const [key, value] of originalServiceCatalogMap) {
      serviceCatalogMap.set(key, value);
    }

  function createMockPlanItem(overrides: Partial<TreatmentPlanItem> = {}): TreatmentPlanItem {
    return {
      id: randomUUID(),
      organizationId: randomUUID(),
      patientId: randomUUID(),
      visitId: randomUUID(),
      serviceId: randomUUID(),
      toothCode: null,
      quantity: 1,
      unitPriceRub: 1000,
      discountRub: 0,
      status: 'approved',
      plannedDoctorUserId: randomUUID(),
      plannedChairId: randomUUID(),
      notes: null,
      ...overrides
  }

  function createMockPayment(overrides: Partial<Payment> = {}): Payment {
    return {
      id: randomUUID(),
      organizationId: randomUUID(),
      patientId: randomUUID(),
      visitId: randomUUID(),
      documentId: randomUUID(),
      amountRub: 1000,
      method: 'card',
      status: 'paid',
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      note: null,
      ...overrides
  }

  function createMockDocument(overrides: Partial<GeneratedDocument> = {}): GeneratedDocument {
    return {
      id: randomUUID(),
      organizationId: randomUUID(),
      patientId: randomUUID(),
      visitId: randomUUID(),
      kind: 'completed_works_act',
      title: 'Test Invoice',
      status: 'draft',
      issuedAt: null,
      totalAmountRub: 1000,
      ...overrides
  }

  function createMockService(overrides: Partial<ServiceCatalogItem> = {}): ServiceCatalogItem {
    return {
      id: randomUUID(),
      organizationId: randomUUID(),
      code: 'TEST',
      title: 'Test Service',
      basePriceRub: 1000,
      durationMinutes: 30,
      taxDeductible: true,
      active: true,
      ...overrides
  }

  it('should calculate zeros for empty state', () => {
    const summary = buildBillingSummary();
    assert.deepStrictEqual(summary, {
      totalPlannedRub: 0,
      totalDiscountRub: 0,
      totalPaidRub: 0,
      totalDueRub: 0,
      taxDeductionEligibleRub: 0,
      draftDocumentAmountRub: 0,
      openTreatmentItems: 0,
      unpaidDocuments: 0

  it('should calculate totals for active plan items', () => {
    treatmentPlanItems.push(
      createMockPlanItem({ unitPriceRub: 2000, quantity: 1, discountRub: 0, status: 'approved' }),
      createMockPlanItem({ unitPriceRub: 1500, quantity: 2, discountRub: 500, status: 'in_progress' }),
      createMockPlanItem({ unitPriceRub: 3000, quantity: 1, discountRub: 0, status: 'cancelled' }) // Should be ignored
    );

    const summary = buildBillingSummary();

    // totalPlannedRub = (2000 * 1 - 0) + (1500 * 2 - 500) = 2000 + 2500 = 4500
    assert.strictEqual(summary.totalPlannedRub, 4500);
    // totalDiscountRub = 0 + 500 = 500
    assert.strictEqual(summary.totalDiscountRub, 500);
    // openTreatmentItems = 2 (approved, in_progress - not completed)
    assert.strictEqual(summary.openTreatmentItems, 2);

  it('should ignore cancelled items for total Planned Rub', () => {
    treatmentPlanItems.push(
      createMockPlanItem({ unitPriceRub: 2000, quantity: 1, discountRub: 0, status: 'cancelled' }),
    );

    const summary = buildBillingSummary();
    assert.strictEqual(summary.totalPlannedRub, 0);
    assert.strictEqual(summary.totalDiscountRub, 0);
    assert.strictEqual(summary.openTreatmentItems, 0);

  it('should not include completed items in openTreatmentItems but include in totalPlannedRub', () => {
    treatmentPlanItems.push(
      createMockPlanItem({ unitPriceRub: 2000, quantity: 1, discountRub: 0, status: 'completed' }),
    );

    const summary = buildBillingSummary();
    assert.strictEqual(summary.totalPlannedRub, 2000);
    assert.strictEqual(summary.openTreatmentItems, 0);

  it('should calculate totalPaidRub for paid payments only', () => {
    payments.push(
      createMockPayment({ amountRub: 1000, status: 'paid' }),
      createMockPayment({ amountRub: 500, status: 'planned' }), // Should be ignored
      createMockPayment({ amountRub: 200, status: 'refunded' }) // Should be ignored
    );

    const summary = buildBillingSummary();
    assert.strictEqual(summary.totalPaidRub, 1000);

  it('should calculate totalDueRub correctly', () => {
    treatmentPlanItems.push(createMockPlanItem({ unitPriceRub: 5000, quantity: 1, discountRub: 0, status: 'approved' }));
    payments.push(createMockPayment({ amountRub: 2000, status: 'paid' }));

    const summary = buildBillingSummary();
    // 5000 - 2000 = 3000
    assert.strictEqual(summary.totalDueRub, 3000);

  it('should not have negative totalDueRub', () => {
    treatmentPlanItems.push(createMockPlanItem({ unitPriceRub: 1000, quantity: 1, discountRub: 0, status: 'approved' }));
    payments.push(createMockPayment({ amountRub: 2000, status: 'paid' }));

    const summary = buildBillingSummary();
    assert.strictEqual(summary.totalDueRub, 0);

  it('should calculate draftDocumentAmountRub for draft documents only', () => {
    documents.push(
      createMockDocument({ totalAmountRub: 1500, status: 'draft' }),
      createMockDocument({ totalAmountRub: 500, status: 'issued' }), // Should be ignored
      createMockDocument({ totalAmountRub: 200, status: 'voided' }) // Should be ignored
    );

    const summary = buildBillingSummary();
    assert.strictEqual(summary.draftDocumentAmountRub, 1500);

  it('should calculate unpaidDocuments correctly', () => {
    const doc1Id = randomUUID();
    const doc2Id = randomUUID();
    const doc3Id = randomUUID();

    documents.push(
      createMockDocument({ id: doc1Id, totalAmountRub: 1000, status: 'draft' }), // unpaid
      createMockDocument({ id: doc2Id, totalAmountRub: 1000, status: 'draft' }), // paid below
      createMockDocument({ id: doc3Id, totalAmountRub: 0, status: 'draft' }) // zero amount, should be ignored
    );

    payments.push(
      createMockPayment({ documentId: doc2Id, status: 'paid' })
    );

    const summary = buildBillingSummary();
    assert.strictEqual(summary.unpaidDocuments, 1);

  it('should calculate taxDeductionEligibleRub from serviceCatalogMap', () => {
    const service1 = createMockService({ id: 'srv1', taxDeductible: true });
    const service2 = createMockService({ id: 'srv2', taxDeductible: false });

    serviceCatalogMap.set(service1.id, service1);
    serviceCatalogMap.set(service2.id, service2);

    treatmentPlanItems.push(
      createMockPlanItem({ serviceId: service1.id, unitPriceRub: 2000, quantity: 1, status: 'completed' }),
      createMockPlanItem({ serviceId: service2.id, unitPriceRub: 3000, quantity: 1, status: 'completed' })
    );

    const summary = buildBillingSummary();
    assert.strictEqual(summary.taxDeductionEligibleRub, 2000);

  it('should calculate taxDeductionEligibleRub from serviceCatalog array', () => {
    const service1 = createMockService({ id: 'srv1', taxDeductible: true });

    // not in map, but in array
    serviceCatalog.push(service1);

    treatmentPlanItems.push(
      createMockPlanItem({ serviceId: service1.id, unitPriceRub: 2500, quantity: 1, status: 'completed' })
    );

    const summary = buildBillingSummary();
    assert.strictEqual(summary.taxDeductionEligibleRub, 2500);
  });
});
