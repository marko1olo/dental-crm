import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentSelectionErrorForDocument, paidAmountRubForDocument } from './guards.js';
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


describe('paidAmountRubForDocument', () => {
  const basePayments: Payment[] = [
    { id: 'payment-1', patientId: 'patient-1', status: 'paid', amountRub: 100, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '123456789012', visitId: 'visit-1' } as Payment,
    { id: 'payment-2', patientId: 'patient-1', status: 'paid', amountRub: 200, fiscalReceiptIssuedAt: '2023-02-01', payerInn: '123456789012', visitId: 'visit-1' } as Payment,
    { id: 'payment-3', patientId: 'patient-1', status: 'paid', amountRub: 50, fiscalReceiptIssuedAt: '2024-01-01', payerInn: '123456789012', visitId: 'visit-2' } as Payment,
    { id: 'payment-4', patientId: 'patient-2', status: 'paid', amountRub: 300, fiscalReceiptIssuedAt: '2023-03-01', payerInn: '987654321098', visitId: 'visit-3' } as Payment,
    { id: 'payment-5', patientId: 'patient-1', status: 'planned', amountRub: 500, visitId: 'visit-1' } as Payment,
  ];

  test('returns 0 if metadata requiresPaidRecord, group is not tax, and no visitId', () => {
    const input: CreateDocumentInput = { patientId: 'patient-1', kind: 'payment_receipt', payload: {} };
    const amount = paidAmountRubForDocument('payment_receipt', input, basePayments);
    assert.strictEqual(amount, 0);
  });

  test('returns 0 if taxPaidDocumentsNeedYear and no taxYear', () => {
    const input: CreateDocumentInput = { patientId: 'patient-1', kind: 'tax_deduction_certificate', payload: {} };
    const amount = paidAmountRubForDocument('tax_deduction_certificate', input, basePayments);
    assert.strictEqual(amount, 0);
  });

  test('returns 0 if taxPaidDocumentKindIsKnd and taxYear < taxDeductionCertificateMinYear', () => {
    const input: CreateDocumentInput = { patientId: 'patient-1', kind: 'tax_deduction_certificate', taxYear: 2023, payload: {} };
    const amount = paidAmountRubForDocument('tax_deduction_certificate', input, basePayments);
    assert.strictEqual(amount, 0);
  });

  test('returns 0 if taxPaidDocumentKindIsLegacy and taxYear is out of bounds', () => {
    const input: CreateDocumentInput = { patientId: 'patient-1', kind: 'legacy_tax_deduction_certificate', taxYear: 2020, payload: {} };
    const amount = paidAmountRubForDocument('legacy_tax_deduction_certificate', input, basePayments);
    assert.strictEqual(amount, 0);
  });

  test('calculates sum for tax documents with payment selection', () => {
    const input: CreateDocumentInput = {
      patientId: 'patient-1',
      kind: 'tax_deduction_certificate',
      taxYear: 2024,
      taxPayerInn: '123456789012',
      payload: {
        taxPaymentSelection: { selectedPaymentIds: ['payment-3'] }
      }
    };
    const amount = paidAmountRubForDocument('tax_deduction_certificate', input, basePayments);
    assert.strictEqual(amount, 50); // only payment-3 matches selection and year
  });

  test('returns 0 for tax documents with payment selection but none selected', () => {
    const input: CreateDocumentInput = {
      patientId: 'patient-1',
      kind: 'tax_deduction_certificate',
      taxYear: 2024,
      taxPayerInn: '123456789012',
      payload: {
        taxPaymentSelection: { selectedPaymentIds: [] }
      }
    };
    const amount = paidAmountRubForDocument('tax_deduction_certificate', input, basePayments);
    assert.strictEqual(amount, 0);
  });

  test('calculates sum for payment_receipt with specific payload', () => {
    const input: CreateDocumentInput = {
      patientId: 'patient-1',
      kind: 'payment_receipt',
      visitId: 'visit-1',
      payload: {
        paymentReceipt: { selectedPaymentIds: ['payment-1', 'payment-2', 'payment-5'] } as any
      }
    };
    const amount = paidAmountRubForDocument('payment_receipt', input, basePayments);
    assert.strictEqual(amount, 300); // 100 + 200 (payment-5 is not paid)
  });

  test('calculates sum for payment_refund_correction_request with specific payload', () => {
    const input: CreateDocumentInput = {
      patientId: 'patient-1',
      kind: 'payment_refund_correction_request',
      visitId: 'visit-1',
      payload: {
        paymentRefundCorrection: {
          selectedPaymentIds: ['payment-1'],
          amountRub: 50,
          reason: 'test'
        } as any
      }
    };
    const amount = paidAmountRubForDocument('payment_refund_correction_request', input, basePayments);
    assert.strictEqual(amount, 100); // sums the selected payment amounts, not the requested amount
  });

  test('calculates sum for generic tax documents without payment selection (fallback)', () => {
    const input: CreateDocumentInput = {
      patientId: 'patient-1',
      kind: 'tax_deduction_application',
      taxYear: 2023,
      taxPayerInn: '123456789012',
      payload: {}
    };
    const amount = paidAmountRubForDocument('tax_deduction_application', input, basePayments);
    assert.strictEqual(amount, 300); // payment-1 and payment-2
  });

  test('calculates sum for non-tax documents without specific payload (fallback)', () => {
    const input: CreateDocumentInput = {
      patientId: 'patient-1',
      kind: 'completed_works_act',
      visitId: 'visit-1',
      payload: {}
    };
    const amount = paidAmountRubForDocument('completed_works_act', input, basePayments);
    assert.strictEqual(amount, 300); // payment-1 and payment-2 match visit-1 and status='paid'
  });
});
