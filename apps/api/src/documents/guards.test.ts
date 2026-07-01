import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentSelectionErrorForDocument, paymentRefundCorrectionSelectionErrorForDocument } from './guards.js';
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

describe('paymentRefundCorrectionSelectionErrorForDocument', () => {
  const baseInput: CreateDocumentInput = {
    patientId: 'patient-1',
    visitId: 'visit-1',
    kind: 'payment_refund_correction_request',
    payload: {
      paymentRefundCorrection: {
        selectedPaymentIds: ['payment-1'],
        amountRub: 100,
        originalFiscalReceiptNumber: '12345',
        action: 'full_refund',
        reason: 'some reason',
        recipientFullName: 'test name',
        recipientIdentityDocument: 'doc',
        refundMethod: 'cash',
        accountantDecision: 'pending'
      }
    }
  };

  const basePayments: Payment[] = [
    {
      id: 'payment-1',
      patientId: 'patient-1',
      visitId: 'visit-1',
      status: 'paid',
      amountRub: 100,
      fiscalReceiptNumber: '12345',
      fiscalReceiptIssuedAt: '2023-01-01T12:00:00Z'
    } as Payment
  ];

  test('returns null when valid selection is provided', () => {
    const error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, basePayments);
    assert.strictEqual(error, null);
  });

  test('returns null if input kind is not payment_refund_correction_request', () => {
    const error = paymentRefundCorrectionSelectionErrorForDocument({ ...baseInput, kind: 'completed_works_act' }, basePayments);
    assert.strictEqual(error, null);
  });

  test('returns null if payload is missing paymentRefundCorrection', () => {
    const error = paymentRefundCorrectionSelectionErrorForDocument({ ...baseInput, payload: {} }, basePayments);
    assert.strictEqual(error, null);
  });

  test('returns error when no payments are selected', () => {
    const error = paymentRefundCorrectionSelectionErrorForDocument(
      { ...baseInput, payload: { paymentRefundCorrection: { ...baseInput.payload?.paymentRefundCorrection, selectedPaymentIds: [] } as any } },
      basePayments
    );
    assert.strictEqual(error, 'Для возврата или коррекции выберите конкретный исходный оплаченный платеж.');
  });

  test('returns error when duplicate payment IDs are selected', () => {
    const error = paymentRefundCorrectionSelectionErrorForDocument(
      { ...baseInput, payload: { paymentRefundCorrection: { ...baseInput.payload?.paymentRefundCorrection, selectedPaymentIds: ['payment-1', 'payment-1'] } as any } },
      basePayments
    );
    assert.strictEqual(error, 'В выбранных исходных платежах есть дубли. Оставьте каждый платеж один раз.');
  });

  test('returns error when a selected payment is not found in the provided payments array', () => {
    const error = paymentRefundCorrectionSelectionErrorForDocument(
      { ...baseInput, payload: { paymentRefundCorrection: { ...baseInput.payload?.paymentRefundCorrection, selectedPaymentIds: ['payment-unknown'] } as any } },
      basePayments
    );
    assert.strictEqual(error, 'Выбранный исходный платеж для возврата или коррекции не найден. Обновите экран и выберите платеж заново.');
  });

  test('returns error when the selected payment belongs to a different patient', () => {
    const payments = [{ ...basePayments[0], patientId: 'patient-2' } as Payment];
    const error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
    assert.strictEqual(error, 'Выбранный исходный платеж для возврата или коррекции относится к другому пациенту.');
  });

  test('returns error when the selected payment belongs to a different visit', () => {
    const payments = [{ ...basePayments[0], visitId: 'visit-2' } as Payment];
    const error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
    assert.strictEqual(error, 'Выбранный исходный платеж для возврата или коррекции относится к другому визиту.');
  });

  test('returns error when the selected payment has a status other than paid or its amount is not positive', () => {
    let payments = [{ ...basePayments[0], status: 'planned' } as Payment];
    let error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
    assert.strictEqual(error, 'Возврат или коррекцию можно оформить только по проведенному положительному платежу.');

    payments = [{ ...basePayments[0], amountRub: 0 } as Payment];
    error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
    assert.strictEqual(error, 'Возврат или коррекцию можно оформить только по проведенному положительному платежу.');
  });

  test('returns error when the selected payment is missing a fiscal receipt number', () => {
    const payments = [{ ...basePayments[0], fiscalReceiptNumber: '' } as Payment];
    const error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
    assert.strictEqual(error, 'Возврат или коррекция требуют номер исходного фискального чека в выбранном платеже.');
  });

  test('returns error when the selected payment is missing a fiscal receipt issued date', () => {
    const payments = [{ ...basePayments[0], fiscalReceiptIssuedAt: '' } as Payment];
    const error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
    assert.strictEqual(error, 'Возврат или коррекция требуют дату исходного фискального чека в выбранном платеже.');
  });

  test('returns error when the selected payment fiscal receipt number does not match expected', () => {
    const payments = [{ ...basePayments[0], fiscalReceiptNumber: '99999' } as Payment];
    const error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
    assert.strictEqual(error, 'Исходный фискальный чек в заявлении не совпадает с выбранным платежом.');
  });
});
