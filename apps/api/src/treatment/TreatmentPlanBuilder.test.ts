import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TreatmentPlanBuilder } from './TreatmentPlanBuilder.js';
import { Patient, ClinicalToothRow, ServiceCatalogItem } from '@dental/shared';
import { randomUUID } from 'node:crypto';

const createMockPatient = (balanceRub: number = 10000): Patient => ({
  id: randomUUID(),
  organizationId: randomUUID(),
  status: 'active',
  fullName: 'Test Patient',
  birthDate: null,
  phone: null,
  email: null,
  notes: null,
  administrativeProfile: null,
  balanceRub,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const mockToothRows: ClinicalToothRow[] = [
  {
    toothOrArea: '18',
    surfaces: [],
    status: 'healthy',
    diagnosisOrFinding: '',
    indication: '',
    plannedAction: ''
  },
  {
    toothOrArea: '28',
    surfaces: [],
    status: 'missing',
    diagnosisOrFinding: '',
    indication: '',
    plannedAction: ''
  }
];

const mockService: ServiceCatalogItem = {
  id: 'srv-1',
  organizationId: randomUUID(),
  code: 'C01',
  title: 'Лечение кариеса',
  aliases: [],
  category: 'therapy',
  specialty: 'therapist',
  basePriceRub: 5000,
  durationMinutes: 60,
  taxDeductible: true
};

const mockSurgeryService: ServiceCatalogItem = {
  id: 'srv-2',
  organizationId: randomUUID(),
  code: 'S01',
  title: 'Установка импланта',
  aliases: [],
  category: 'surgery',
  specialty: 'surgeon',
  basePriceRub: 50000,
  durationMinutes: 120,
  taxDeductible: true
};

const mockExtractionService: ServiceCatalogItem = {
  id: 'srv-3',
  organizationId: randomUUID(),
  code: 'E01',
  title: 'Удаление зуба',
  aliases: [],
  category: 'surgery',
  specialty: 'surgeon',
  basePriceRub: 3000,
  durationMinutes: 30,
  taxDeductible: true
};

test('TreatmentPlanBuilder', async (t) => {
  await t.test('constructor and getItems', () => {
    const patient = createMockPatient();
    const builder = new TreatmentPlanBuilder(patient, mockToothRows);
    assert.deepEqual(builder.getItems(), []);
  });

  await t.test('addItem - Success Cases', async (st) => {
    await st.test('adds item without tooth code', () => {
      const patient = createMockPatient();
      const builder = new TreatmentPlanBuilder(patient, mockToothRows);
      const item = builder.addItem(mockService, 1);

      assert.equal(item.serviceId, mockService.id);
      assert.equal(item.quantity, 1);
      assert.equal(item.toothCode, null);
      assert.equal(item.unitPriceRub, 5000);
      assert.equal(builder.getItems().length, 1);
    });

    await st.test('adds item with valid tooth code and calculates snapshot correctly', () => {
      const patient = createMockPatient();
      const builder = new TreatmentPlanBuilder(patient, mockToothRows);
      const item = builder.addItem(mockService, 2, '18', 1000);

      assert.equal(item.toothCode, '18');
      assert.equal(item.quantity, 2);
      assert.equal(item.discountRub, 1000);
      assert.equal(item.status, 'proposed');
    });

    await st.test('prints wisdom tooth warning but adds item', (t2) => {
      let warningCalled = false;
      const originalWarn = console.warn;
      console.warn = () => { warningCalled = true; };

      const patient = createMockPatient();
      const builder = new TreatmentPlanBuilder(patient, mockToothRows);
      builder.addItem(mockExtractionService, 1, '18');

      console.warn = originalWarn;

      assert.equal(warningCalled, true);
      assert.equal(builder.getItems().length, 1);
    });
  });

  await t.test('addItem - Error Cases', async (st) => {
    await st.test('throws if discount exceeds unit price', () => {
      const patient = createMockPatient();
      const builder = new TreatmentPlanBuilder(patient, mockToothRows);

      assert.throws(
        () => builder.addItem(mockService, 1, null, 6000),
        /ОШИБКА ФИНАНСОВ: Скидка не может превышать стоимость услуги\./
      );
    });

    await st.test('throws if treating missing tooth', () => {
      const patient = createMockPatient();
      const builder = new TreatmentPlanBuilder(patient, mockToothRows);

      assert.throws(
        () => builder.addItem(mockService, 1, '28'),
        /ОШИБКА ЛОГИКИ: Зуб 28 отсутствует\. Действие 'Лечение кариеса' невозможно\./
      );
    });

    await st.test('throws if extracting already missing tooth', () => {
      const patient = createMockPatient();
      const builder = new TreatmentPlanBuilder(patient, mockToothRows);

      assert.throws(
        () => builder.addItem(mockExtractionService, 1, '28'),
        /ОШИБКА ЛОГИКИ: Зуб 28 отсутствует\. Действие 'Удаление зуба' невозможно\./
      );
    });
  });

  await t.test('addItem - Surgery on missing teeth', () => {
    const patient = createMockPatient();
    const builder = new TreatmentPlanBuilder(patient, mockToothRows);

    // Implants on missing teeth should succeed
    const item = builder.addItem(mockSurgeryService, 1, '28');
    assert.equal(item.serviceId, mockSurgeryService.id);
  });

  await t.test('calculateTotal', () => {
    const patient = createMockPatient();
    const builder = new TreatmentPlanBuilder(patient, mockToothRows);

    // (5000 - 1000) * 2 = 8000
    builder.addItem(mockService, 2, '18', 1000);
    // (50000 - 0) * 1 = 50000
    builder.addItem(mockSurgeryService, 1, '28');

    assert.equal(builder.calculateTotal(), 58000);
  });

  await t.test('convertToAct', async (st) => {
    await st.test('converts items, calculates totals, and deducts balance correctly', () => {
      const patient = createMockPatient(100000); // Start with 100,000 balance
      const builder = new TreatmentPlanBuilder(patient, mockToothRows);

      const item1 = builder.addItem(mockService, 2, '18', 1000); // 8000
      const item2 = builder.addItem(mockSurgeryService, 1, '28'); // 50000

      // Convert only item1
      const result = builder.convertToAct([item1.id]);

      assert.equal(result.updatedItems.length, 1);
      assert.equal(result.updatedItems[0].id, item1.id);
      assert.equal(result.updatedItems[0].status, 'completed');

      // item2 should still be proposed
      assert.equal(builder.getItems().find(i => i.id === item2.id)?.status, 'proposed');

      assert.equal(result.actTotalRub, 8000);
      assert.equal(result.newBalanceRub, 92000); // 100000 - 8000
      assert.equal(patient.balanceRub, 92000);
    });

    await st.test('handles zero initial balance gracefully', () => {
      const patient = createMockPatient(0);
      // simulate undefined balance which isn't allowed by types but possible at runtime
      (patient as any).balanceRub = undefined;

      const builder = new TreatmentPlanBuilder(patient, mockToothRows);
      const item1 = builder.addItem(mockService, 1, '18'); // 5000

      const result = builder.convertToAct([item1.id]);

      assert.equal(result.actTotalRub, 5000);
      assert.equal(result.newBalanceRub, -5000);
    });
  });
});
