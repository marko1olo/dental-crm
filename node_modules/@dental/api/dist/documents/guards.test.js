import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentSelectionErrorForDocument, paidAmountRubForDocument } from './guards.js';
import { paymentRefundCorrectionSelectionErrorForDocument } from './guards.js';
describe('taxPaymentSelectionErrorForDocument', () => {
    const baseInput = {
        patientId: 'patient-1',
        kind: 'tax_deduction_certificate',
        taxYear: 2023,
        taxPayerInn: '123456789012',
        payload: {
            taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-2'] }
        }
    };
    const basePayments = [
        { id: 'payment-1', patientId: 'patient-1', status: 'paid', amountRub: 100, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '123456789012' },
        { id: 'payment-2', patientId: 'patient-1', status: 'paid', amountRub: 200, fiscalReceiptIssuedAt: '2023-02-01', payerInn: '123456789012' },
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
    test('returns null if tax document does not require payment selection and none selected', () => {
        const error = taxPaymentSelectionErrorForDocument({
            ...baseInput,
            kind: 'tax_deduction_application',
            payload: { taxDeductionApplication: { requestedTaxYear: 2023, taxpayerInn: '123456789012', requestedForm: 'knd_1151156', selectedPaymentIds: [] } }
        }, basePayments);
        assert.strictEqual(error, null);
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
            { id: 'payment-3', patientId: 'patient-2', status: 'paid', amountRub: 100, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '123456789012' }
        ];
        const input = { ...baseInput, payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-3'] } } };
        const error = taxPaymentSelectionErrorForDocument(input, payments);
        assert.strictEqual(error, 'Выбранный фискальный чек относится к другому пациенту.');
    });
    test('returns error if selected payment is not paid or amount is <= 0', () => {
        const payments = [
            ...basePayments,
            { id: 'payment-3', patientId: 'patient-1', status: 'planned', amountRub: 100, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '123456789012' }
        ];
        const input = { ...baseInput, payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-3'] } } };
        let error = taxPaymentSelectionErrorForDocument(input, payments);
        assert.strictEqual(error, 'В налоговый документ можно включать только проведенные положительные оплаты.');
        const payments2 = [
            ...basePayments,
            { id: 'payment-4', patientId: 'patient-1', status: 'paid', amountRub: 0, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '123456789012' }
        ];
        const input2 = { ...baseInput, payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-4'] } } };
        error = taxPaymentSelectionErrorForDocument(input2, payments2);
        assert.strictEqual(error, 'В налоговый документ можно включать только проведенные положительные оплаты.');
    });
    test('returns error if selected payment does not match tax year', () => {
        const payments = [
            ...basePayments,
            { id: 'payment-3', patientId: 'patient-1', status: 'paid', amountRub: 100, fiscalReceiptIssuedAt: '2022-01-01', payerInn: '123456789012' }
        ];
        const input = { ...baseInput, payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-3'] } } };
        const error = taxPaymentSelectionErrorForDocument(input, payments);
        assert.strictEqual(error, 'Выбранный фискальный чек не относится к выбранному налоговому году.');
    });
    test('returns error if taxYear is not provided but payments are selected', () => {
        const input = { ...baseInput, taxYear: undefined };
        const error = taxPaymentSelectionErrorForDocument(input, basePayments);
        assert.strictEqual(error, 'Выбранный фискальный чек не относится к выбранному налоговому году.');
    });
    test('returns error if selected payment does not match payer INN', () => {
        const payments = [
            ...basePayments,
            { id: 'payment-3', patientId: 'patient-1', status: 'paid', amountRub: 100, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '987654321098' }
        ];
        const input = { ...baseInput, payload: { taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-3'] } } };
        const error = taxPaymentSelectionErrorForDocument(input, payments);
        assert.strictEqual(error, 'Выбранный фискальный чек относится к другому ИНН плательщика.');
    });
});
describe('taxDocumentSelectionScope - edge cases', () => {
    test('uses taxDeductionApplication.requestedTaxYear when kind is tax_deduction_application', () => {
        const input = {
            patientId: 'p1',
            kind: 'tax_deduction_application',
            taxYear: 2022,
            payload: {
                taxDeductionApplication: {
                    requestedTaxYear: 2023,
                    taxpayerInn: '999999999999',
                    selectedPaymentIds: ['payment-1']
                }
            }
        };
        const basePayments = [
            { id: 'payment-1', patientId: 'p1', status: 'paid', amountRub: 100, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '999999999999' },
        ];
        const error = taxPaymentSelectionErrorForDocument(input, basePayments);
        assert.strictEqual(error, null);
    });
});
describe('paidAmountRubForDocument', () => {
    const basePayments = [
        { id: 'payment-1', patientId: 'patient-1', status: 'paid', amountRub: 100, fiscalReceiptIssuedAt: '2023-01-01', payerInn: '123456789012', visitId: 'visit-1' },
        { id: 'payment-2', patientId: 'patient-1', status: 'paid', amountRub: 200, fiscalReceiptIssuedAt: '2023-02-01', payerInn: '123456789012', visitId: 'visit-1' },
        { id: 'payment-3', patientId: 'patient-1', status: 'paid', amountRub: 50, fiscalReceiptIssuedAt: '2024-01-01', payerInn: '123456789012', visitId: 'visit-2' },
        { id: 'payment-4', patientId: 'patient-2', status: 'paid', amountRub: 300, fiscalReceiptIssuedAt: '2023-03-01', payerInn: '987654321098', visitId: 'visit-3' },
        { id: 'payment-5', patientId: 'patient-1', status: 'planned', amountRub: 500, visitId: 'visit-1' },
    ];
    test('returns 0 if metadata requiresPaidRecord, group is not tax, and no visitId', () => {
        const input = { patientId: 'patient-1', kind: 'payment_receipt', payload: {} };
        const amount = paidAmountRubForDocument('payment_receipt', input, basePayments);
        assert.strictEqual(amount, 0);
    });
    test('returns 0 if taxPaidDocumentsNeedYear and no taxYear', () => {
        const input = { patientId: 'patient-1', kind: 'tax_deduction_certificate', payload: {} };
        const amount = paidAmountRubForDocument('tax_deduction_certificate', input, basePayments);
        assert.strictEqual(amount, 0);
    });
    test('returns 0 if taxPaidDocumentKindIsKnd and taxYear < taxDeductionCertificateMinYear', () => {
        const input = { patientId: 'patient-1', kind: 'tax_deduction_certificate', taxYear: 2023, payload: {} };
        const amount = paidAmountRubForDocument('tax_deduction_certificate', input, basePayments);
        assert.strictEqual(amount, 0);
    });
    test('returns 0 if taxPaidDocumentKindIsLegacy and taxYear is out of bounds', () => {
        const input = { patientId: 'patient-1', kind: 'legacy_tax_deduction_certificate', taxYear: 2020, payload: {} };
        const amount = paidAmountRubForDocument('legacy_tax_deduction_certificate', input, basePayments);
        assert.strictEqual(amount, 0);
    });
    test('calculates sum for tax documents with payment selection', () => {
        const input = {
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
        const input = {
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
        const input = {
            patientId: 'patient-1',
            kind: 'payment_receipt',
            visitId: 'visit-1',
            payload: {
                paymentReceipt: { selectedPaymentIds: ['payment-1', 'payment-2', 'payment-5'] }
            }
        };
        const amount = paidAmountRubForDocument('payment_receipt', input, basePayments);
        assert.strictEqual(amount, 300); // 100 + 200 (payment-5 is not paid)
    });
    test('calculates sum for payment_refund_correction_request with specific payload', () => {
        const input = {
            patientId: 'patient-1',
            kind: 'payment_refund_correction_request',
            visitId: 'visit-1',
            payload: {
                paymentRefundCorrection: {
                    selectedPaymentIds: ['payment-1'],
                    amountRub: 50,
                    reason: 'test'
                }
            }
        };
        const amount = paidAmountRubForDocument('payment_refund_correction_request', input, basePayments);
        assert.strictEqual(amount, 100); // sums the selected payment amounts, not the requested amount
    });
    test('calculates sum for generic tax documents without payment selection (fallback)', () => {
        const input = {
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
        const input = {
            patientId: 'patient-1',
            kind: 'completed_works_act',
            visitId: 'visit-1',
            payload: {}
        };
        const amount = paidAmountRubForDocument('completed_works_act', input, basePayments);
        assert.strictEqual(amount, 300); // payment-1 and payment-2 match visit-1 and status='paid'
        describe('paymentRefundCorrectionSelectionErrorForDocument', () => {
            const baseInput = {
                amountRub: 100,
                originalFiscalReceiptNumber: '12345',
                action: 'full_refund',
                reason: 'some reason',
                recipientFullName: 'test name',
                recipientIdentityDocument: 'doc',
                refundMethod: 'cash',
                accountantDecision: 'pending'
            };
            {
                id: 'payment-1',
                    status;
                'paid',
                    amountRub;
                100,
                    fiscalReceiptNumber;
                '12345',
                    fiscalReceiptIssuedAt;
                '2023-01-01T12:00:00Z';
            }
            as;
            Payment;
            test('returns null when valid selection is provided', () => {
                const error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, basePayments);
                assert.strictEqual(error, null);
                test('returns null if input kind is not payment_refund_correction_request', () => {
                    const error = paymentRefundCorrectionSelectionErrorForDocument({ ...baseInput, kind: 'completed_works_act' }, basePayments);
                    assert.strictEqual(error, null);
                    test('returns null if payload is missing paymentRefundCorrection', () => {
                        const error = paymentRefundCorrectionSelectionErrorForDocument({ ...baseInput, payload: {} }, basePayments);
                        assert.strictEqual(error, null);
                        test('returns error when no payments are selected', () => {
                            const error = paymentRefundCorrectionSelectionErrorForDocument({ ...baseInput, payload: { paymentRefundCorrection: { ...baseInput.payload?.paymentRefundCorrection, selectedPaymentIds: [] } } }, basePayments);
                            assert.strictEqual(error, 'Для возврата или коррекции выберите конкретный исходный оплаченный платеж.');
                            test('returns error when duplicate payment IDs are selected', () => {
                                const error = paymentRefundCorrectionSelectionErrorForDocument({ ...baseInput, payload: { paymentRefundCorrection: { ...baseInput.payload?.paymentRefundCorrection, selectedPaymentIds: ['payment-1', 'payment-1'] } } }, basePayments);
                                assert.strictEqual(error, 'В выбранных исходных платежах есть дубли. Оставьте каждый платеж один раз.');
                                test('returns error when a selected payment is not found in the provided payments array', () => {
                                    const error = paymentRefundCorrectionSelectionErrorForDocument({ ...baseInput, payload: { paymentRefundCorrection: { ...baseInput.payload?.paymentRefundCorrection, selectedPaymentIds: ['payment-unknown'] } } }, basePayments);
                                    assert.strictEqual(error, 'Выбранный исходный платеж для возврата или коррекции не найден. Обновите экран и выберите платеж заново.');
                                    test('returns error when the selected payment belongs to a different patient', () => {
                                        const payments = [{ ...basePayments[0], patientId: 'patient-2' }];
                                        const error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
                                        assert.strictEqual(error, 'Выбранный исходный платеж для возврата или коррекции относится к другому пациенту.');
                                        test('returns error when the selected payment belongs to a different visit', () => {
                                            const payments = [{ ...basePayments[0], visitId: 'visit-2' }];
                                            const error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
                                            assert.strictEqual(error, 'Выбранный исходный платеж для возврата или коррекции относится к другому визиту.');
                                            test('returns error when the selected payment has a status other than paid or its amount is not positive', () => {
                                                let payments = [{ ...basePayments[0], status: 'planned' }];
                                                let error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
                                                assert.strictEqual(error, 'Возврат или коррекцию можно оформить только по проведенному положительному платежу.');
                                                payments = [{ ...basePayments[0], amountRub: 0 }];
                                                error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
                                                assert.strictEqual(error, 'Возврат или коррекцию можно оформить только по проведенному положительному платежу.');
                                                test('returns error when the selected payment is missing a fiscal receipt number', () => {
                                                    const payments = [{ ...basePayments[0], fiscalReceiptNumber: '' }];
                                                    const error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
                                                    assert.strictEqual(error, 'Возврат или коррекция требуют номер исходного фискального чека в выбранном платеже.');
                                                    test('returns error when the selected payment is missing a fiscal receipt issued date', () => {
                                                        const payments = [{ ...basePayments[0], fiscalReceiptIssuedAt: '' }];
                                                        const error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
                                                        assert.strictEqual(error, 'Возврат или коррекция требуют дату исходного фискального чека в выбранном платеже.');
                                                        test('returns error when the selected payment fiscal receipt number does not match expected', () => {
                                                            const payments = [{ ...basePayments[0], fiscalReceiptNumber: '99999' }];
                                                            const error = paymentRefundCorrectionSelectionErrorForDocument(baseInput, payments);
                                                            assert.strictEqual(error, 'Исходный фискальный чек в заявлении не совпадает с выбранным платежом.');
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
