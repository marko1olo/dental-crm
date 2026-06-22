import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentSelectionErrorForDocument } from './guards.js';
import type { Payment, CreateDocumentInput, TaxDeductionApplicationPayload } from '@dental/shared';

describe('taxPaymentSelectionErrorForDocument', () => {
  const baseInput: CreateDocumentInput = {
    patientId: 'patient-1',
    kind: 'tax_deduction_certificate',
    taxYear: 2023,
    taxPayerInn: '123456789012',
    payload: {
      taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-2'] }
    }
  };

  const basePayments: Payment[] = [
    { id: 'payment-1', patientId: 'patient-1', status: 'paid', amountRub: 100, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '123456789012' } as Payment,
    { id: 'payment-2', patientId: 'patient-1', status: 'paid', amountRub: 200, fiscalReceiptIssuedAt: '2023-02-01', payerInn: '123456789012' } as Payment,
  ];

  test('returns null when valid selection is provided', () => {
    const error = taxPaymentSelectionErrorForDocument(baseInput, basePayments);
    assert.strictEqual(error, null);
  });

  test('returns null if input kind is not tax paid document', () => {
    const error = taxPaymentSelectionErrorForDocument({ ...baseInput, kind: 'completed_works_act' }, basePayments);
    assert.strictEqual(error, null);
  });

  test('returns error if tax document requires payment selection but none selected', () => {
    const error = taxPaymentSelectionErrorForDocument({ ...baseInput, payload: { taxPaymentSelection: { selectedPaymentIds: [] } } }, basePayments);
    assert.strictEqual(error, 'Для налогового заявления, справки или реестра нужно явно выбрать фискальные чеки. Автоматический захват всех оплат за год отключен.');
  });

  test('returns error if there are duplicates in selected ids', () => {
    const input = { ...baseInput, payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-1'] } } };
    const error = taxPaymentSelectionErrorForDocument(input, basePayments);
    assert.strictEqual(error, 'В выбранных чеках есть дубли. Оставьте каждый фискальный чек один раз.');
  });

  test('returns error if a selected payment is not found', () => {
    const input = { ...baseInput, payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-3'] } } };
    const error = taxPaymentSelectionErrorForDocument(input, basePayments);
    assert.strictEqual(error, 'Выбранный фискальный чек не найден. Обновите экран и выберите чек заново.');
  });

  test('returns error if selected payment belongs to another patient', () => {
    const payments = [
      ...basePayments,
      { id: 'payment-3', patientId: 'patient-2', status: 'paid', amountRub: 100, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '123456789012' } as Payment
    ];
    const input = { ...baseInput, payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-3'] } } };
    const error = taxPaymentSelectionErrorForDocument(input, payments);
    assert.strictEqual(error, 'Выбранный фискальный чек относится к другому пациенту.');
  });

  test('returns error if selected payment is not paid or amount is <= 0', () => {
    const payments = [
      ...basePayments,
      { id: 'payment-3', patientId: 'patient-1', status: 'planned', amountRub: 100, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '123456789012' } as Payment
    ];
    const input = { ...baseInput, payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-3'] } } };
    let error = taxPaymentSelectionErrorForDocument(input, payments);
    assert.strictEqual(error, 'В налоговый документ можно включать только проведенные положительные оплаты.');

    const payments2 = [
      ...basePayments,
      { id: 'payment-4', patientId: 'patient-1', status: 'paid', amountRub: 0, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '123456789012' } as Payment
    ];
    const input2 = { ...baseInput, payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-4'] } } };
    error = taxPaymentSelectionErrorForDocument(input2, payments2);
    assert.strictEqual(error, 'В налоговый документ можно включать только проведенные положительные оплаты.');
  });

  test('returns error if selected payment does not match tax year', () => {
    const payments = [
      ...basePayments,
      { id: 'payment-3', patientId: 'patient-1', status: 'paid', amountRub: 100, fiscalReceiptIssuedAt: '2022-01-01', payerInn: '123456789012' } as Payment
    ];
    const input = { ...baseInput, payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-3'] } } };
    const error = taxPaymentSelectionErrorForDocument(input, payments);
    assert.strictEqual(error, 'Выбранный фискальный чек не относится к выбранному налоговому году.');
  });

  test('returns error if selected payment does not match payer INN', () => {
    const payments = [
      ...basePayments,
      { id: 'payment-3', patientId: 'patient-1', status: 'paid', amountRub: 100, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '987654321098' } as Payment
    ];
    const input = { ...baseInput, payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-3'] } } };
    const error = taxPaymentSelectionErrorForDocument(input, payments);
    assert.strictEqual(error, 'Выбранный фискальный чек относится к другому ИНН плательщика.');
  });
});

describe('taxDocumentSelectionScope - edge cases', () => {
  test('uses taxDeductionApplication.requestedTaxYear when kind is tax_deduction_application', () => {
    const input: CreateDocumentInput = {
      patientId: 'p1',
      kind: 'tax_deduction_application',
      taxYear: 2022,
      payload: {
        taxDeductionApplication: {
          requestedTaxYear: 2023,
          taxpayerInn: '999999999999',
          selectedPaymentIds: ['payment-1']
        } as TaxDeductionApplicationPayload
      }
    };

    const basePayments: Payment[] = [
      { id: 'payment-1', patientId: 'p1', status: 'paid', amountRub: 100, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '999999999999' } as Payment,
    ];

    const error = taxPaymentSelectionErrorForDocument(input, basePayments);
    assert.strictEqual(error, null);
  });
});
