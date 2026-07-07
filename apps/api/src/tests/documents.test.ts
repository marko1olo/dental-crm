import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentSelectionErrorForDocument } from '../documents/guards.js';
import type { CreateDocumentInput, Payment } from '@dental/shared';

describe('taxPaymentSelectionErrorForDocument', () => {
  const patientId = 'p1';

  const createPayment = (overrides: Partial<Payment> = {}): Payment => ({
    id: 'pay1',
    patientId,
    amountRub: 1000,
    status: 'paid',
    createdAt: '2024-06-15T10:00:00Z',
    organizationId: 'org1',
    documentId: null,
    taxDeductionCode: "1",
    visitId: 'v1',
    payerFullName: 'Payer Name',
    payerInn: '123456789012',
    fiscalReceiptNumber: '12345',
    fiscalReceiptIssuedAt: '2024-06-15T10:00:00Z',
    payerBirthDate: null,
    payerIdentityDocument: null,
    payerRelationship: null,
    method: 'cash',
    ...overrides
  } as unknown as Payment);

  test('returns null for document kinds that do not require validation', () => {
    const input = { kind: 'patient_intake_questionnaire', patientId, payload: {} } as unknown as CreateDocumentInput;
    const error = taxPaymentSelectionErrorForDocument(input, []);
    assert.strictEqual(error, null);
  });

  test('requires payment selection for tax document if missing', () => {
    const input = {
      kind: 'tax_deduction_certificate',
      patientId,
      taxYear: 2024,
      taxPayerInn: '123456789012',
      payload: {
        taxPaymentSelection: { selectedPaymentIds: [] }
      }
    } as unknown as CreateDocumentInput;
    const error = taxPaymentSelectionErrorForDocument(input, []);
    assert.strictEqual(error, "Для налогового заявления, справки или реестра нужно явно выбрать фискальные чеки. Автоматический захват всех оплат за год отключен.");
  });

  test('detects duplicate selected payments', () => {
    const input = {
      kind: 'tax_deduction_certificate',
      patientId,
      taxYear: 2024,
      taxPayerInn: '123456789012',
      payload: {
        taxPaymentSelection: { selectedPaymentIds: ['pay1', 'pay1'] }
      }
    } as unknown as CreateDocumentInput;
    const error = taxPaymentSelectionErrorForDocument(input, []);
    assert.strictEqual(error, "В выбранных чеках есть дубли. Оставьте каждый фискальный чек один раз.");
  });

  test('detects missing payments', () => {
    const input = {
      kind: 'tax_deduction_certificate',
      patientId,
      taxYear: 2024,
      taxPayerInn: '123456789012',
      payload: {
        taxPaymentSelection: { selectedPaymentIds: ['pay1'] }
      }
    } as unknown as CreateDocumentInput;
    const error = taxPaymentSelectionErrorForDocument(input, []);
    assert.strictEqual(error, "Выбранный фискальный чек не найден. Обновите экран и выберите чек заново.");
  });

  test('detects payment for different patient', () => {
    const input = {
      kind: 'tax_deduction_certificate',
      patientId,
      taxYear: 2024,
      taxPayerInn: '123456789012',
      payload: {
        taxPaymentSelection: { selectedPaymentIds: ['pay1'] }
      }
    } as unknown as CreateDocumentInput;
    const payment = createPayment({ patientId: 'p2' });
    const error = taxPaymentSelectionErrorForDocument(input, [payment]);
    assert.strictEqual(error, "Выбранный фискальный чек относится к другому пациенту.");
  });

  test('detects unpaid or zero amount payments', () => {
    const input = {
      kind: 'tax_deduction_certificate',
      patientId,
      taxYear: 2024,
      taxPayerInn: '123456789012',
      payload: {
        taxPaymentSelection: { selectedPaymentIds: ['pay1'] }
      }
    } as unknown as CreateDocumentInput;

    let error = taxPaymentSelectionErrorForDocument(input, [createPayment({ status: 'planned' })]);
    assert.strictEqual(error, "В налоговый документ можно включать только проведенные положительные оплаты.");

    error = taxPaymentSelectionErrorForDocument(input, [createPayment({ amountRub: 0 })]);
    assert.strictEqual(error, "В налоговый документ можно включать только проведенные положительные оплаты.");
  });

  test('detects payment outside of tax year', () => {
    const input = {
      kind: 'tax_deduction_certificate',
      patientId,
      taxYear: 2024,
      taxPayerInn: '123456789012',
      payload: {
        taxPaymentSelection: { selectedPaymentIds: ['pay1'] }
      }
    } as unknown as CreateDocumentInput;

    // Create payment in 2023
    const payment = createPayment({ fiscalReceiptIssuedAt: '2023-12-31T23:59:59Z', createdAt: '2023-12-31T23:59:59Z' });
    const error = taxPaymentSelectionErrorForDocument(input, [payment]);
    assert.strictEqual(error, "Выбранный фискальный чек не относится к выбранному налоговому году.");
  });

  test('detects payment with different payer INN', () => {
    const input = {
      kind: 'tax_deduction_certificate',
      patientId,
      taxYear: 2024,
      taxPayerInn: '123456789012',
      payload: {
        taxPaymentSelection: { selectedPaymentIds: ['pay1'] }
      }
    } as unknown as CreateDocumentInput;

    const payment = createPayment({ payerInn: '987654321098' });
    const error = taxPaymentSelectionErrorForDocument(input, [payment]);
    assert.strictEqual(error, "Выбранный фискальный чек относится к другому ИНН плательщика.");
  });

  test('returns null for valid payment selection', () => {
    const input = {
      kind: 'tax_deduction_certificate',
      patientId,
      taxYear: 2024,
      taxPayerInn: '123456789012',
      payload: {
        taxPaymentSelection: { selectedPaymentIds: ['pay1'] }
      }
    } as unknown as CreateDocumentInput;

    const payment = createPayment();

    const error = taxPaymentSelectionErrorForDocument(input, [payment]);
    assert.strictEqual(error, null);
  });

  test('returns null when tax_deduction_application has no payments but does not require them', () => {
    const input = {
      kind: 'tax_deduction_application',
      patientId,
      taxYear: 2024,
      taxPayerInn: '123456789012',
      payload: {
        taxDeductionApplication: { selectedPaymentIds: [] }
      }
    } as unknown as CreateDocumentInput;

    const error = taxPaymentSelectionErrorForDocument(input, []);
    assert.strictEqual(error, null);
  });

  test('validates payments for tax_deduction_application if provided', () => {
    const input = {
      kind: 'tax_deduction_application',
      patientId,
      payload: {
        taxDeductionApplication: {
          selectedPaymentIds: ['pay1'],
          requestedTaxYear: 2024,
          taxpayerInn: '123456789012'
        }
      }
    } as unknown as CreateDocumentInput;

    // Invalid year
    const payment = createPayment({
      fiscalReceiptIssuedAt: '2023-06-15T10:00:00Z',
      createdAt: '2023-06-15T10:00:00Z',
      payerInn: '123456789012'
    });

    const error = taxPaymentSelectionErrorForDocument(input, [payment]);
    assert.strictEqual(error, "Выбранный фискальный чек не относится к выбранному налоговому году.");

    // Valid year
    const validPayment = createPayment();
    const validError = taxPaymentSelectionErrorForDocument(input, [validPayment]);
    assert.strictEqual(validError, null);
  });
});
