import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentsForDocumentScope } from './taxPaymentSnapshot.js';
import type { GeneratedDocument, Payment } from '@dental/shared';

describe('taxPaymentsForDocumentScope', () => {
  const baseDocument: GeneratedDocument = {
    id: 'doc-1',
    patientId: 'patient-1',
    organizationId: 'org-1',
    kind: 'contract', // Does not use payment snapshot by default
    status: 'issued',
    createdAt: new Date().toISOString(),
    taxYear: 2023,
  };

  const basePayments: Payment[] = [
    {
      id: 'pay-1',
      patientId: 'patient-1',
      status: 'paid',
      amountRub: 100,
      fiscalReceiptIssuedAt: '2023-01-01', // Tax year 2023
    } as Payment,
    {
      id: 'pay-2',
      patientId: 'patient-1',
      status: 'paid',
      amountRub: 200,
      fiscalReceiptIssuedAt: '2023-05-01', // Tax year 2023
    } as Payment,
    {
      id: 'pay-3',
      patientId: 'patient-2', // Different patient
      status: 'paid',
      amountRub: 300,
      fiscalReceiptIssuedAt: '2023-06-01',
    } as Payment,
    {
      id: 'pay-4',
      patientId: 'patient-1',
      status: 'refunded', // Not paid
      amountRub: 150,
      fiscalReceiptIssuedAt: '2023-07-01',
    } as Payment,
    {
      id: 'pay-5',
      patientId: 'patient-1',
      status: 'paid',
      amountRub: 250,
      fiscalReceiptIssuedAt: '2022-01-01', // Tax year 2022
    } as Payment,
  ];

  test('returns cloned payments from snapshot if available', () => {
    const document: GeneratedDocument = {
      ...baseDocument,
      taxPaymentSnapshot: {
        createdAt: new Date().toISOString(),
        taxYear: 2023,
        taxPayerInn: null,
        paymentIds: ['pay-snap-1'],
        fiscalReceiptKeys: ['key-1'],
        payments: [
          { id: 'pay-snap-1', amountRub: 500 } as Payment,
        ]
      }
    };
    const result = taxPaymentsForDocumentScope(document, basePayments);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 'pay-snap-1');
    assert.strictEqual(result[0].amountRub, 500);
    // Ensure it's a clone (not same object reference)
    assert.notStrictEqual(result[0], document.taxPaymentSnapshot?.payments[0]);
  });

  test('returns empty array if document has no taxYear', () => {
    const document: GeneratedDocument = {
      ...baseDocument,
      taxYear: undefined,
    };
    const result = taxPaymentsForDocumentScope(document, basePayments);
    assert.strictEqual(result.length, 0);
  });

  describe('for document kind that uses snapshot (e.g. tax_deduction_certificate)', () => {
    const taxDoc: GeneratedDocument = {
      ...baseDocument,
      kind: 'tax_deduction_certificate',
    };

    test('returns empty array if no selected payments in payload', () => {
      const result = taxPaymentsForDocumentScope(taxDoc, basePayments);
      assert.strictEqual(result.length, 0);
    });

    test('returns matching selected payments if selected in payload', () => {
      const docWithSelection: GeneratedDocument = {
        ...taxDoc,
        payload: {
          taxPaymentSelection: {
            selectedPaymentIds: ['pay-1', 'pay-2', 'pay-5'] // pay-5 has wrong tax year, should be filtered out
          }
        }
      };

      const result = taxPaymentsForDocumentScope(docWithSelection, basePayments);

      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].id, 'pay-1');
      assert.strictEqual(result[1].id, 'pay-2');
    });
  });

  describe('for document kind that does not use snapshot (e.g. contract)', () => {
    test('returns matching payments (paid, positive amount, matching patient and tax year)', () => {
      const result = taxPaymentsForDocumentScope(baseDocument, basePayments);

      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].id, 'pay-1');
      assert.strictEqual(result[1].id, 'pay-2');
    });

    test('returns matching payments when document taxPayerInn is provided', () => {
      const docWithInn: GeneratedDocument = {
        ...baseDocument,
        taxPayerInn: '123456789012',
      };
      const paymentsWithInn: Payment[] = [
        ...basePayments,
        {
          id: 'pay-6',
          patientId: 'patient-1',
          status: 'paid',
          amountRub: 400,
          fiscalReceiptIssuedAt: '2023-08-01',
          payerInn: '123-456-789-012', // should match normalized inn
        } as Payment,
        {
          id: 'pay-7',
          patientId: 'patient-1',
          status: 'paid',
          amountRub: 500,
          fiscalReceiptIssuedAt: '2023-09-01',
          payerInn: '987654321098', // should not match
        } as Payment,
      ];

      const result = taxPaymentsForDocumentScope(docWithInn, paymentsWithInn);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'pay-6');
    });

    test('returns only explicitly linked payments if any match', () => {
      const paymentsWithLink: Payment[] = [
        ...basePayments,
        {
          id: 'pay-link-1',
          patientId: 'patient-1',
          status: 'paid',
          amountRub: 1000,
          fiscalReceiptIssuedAt: '2023-10-01',
          documentId: 'doc-1', // Linked to baseDocument
        } as Payment,
      ];

      const result = taxPaymentsForDocumentScope(baseDocument, paymentsWithLink);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'pay-link-1');
    });

    test('filters out zero or negative amounts', () => {
      const paymentsWithZeroAmount: Payment[] = [
        {
          id: 'pay-zero',
          patientId: 'patient-1',
          status: 'paid',
          amountRub: 0,
          fiscalReceiptIssuedAt: '2023-10-01',
        } as Payment,
        {
          id: 'pay-negative',
          patientId: 'patient-1',
          status: 'paid',
          amountRub: -100,
          fiscalReceiptIssuedAt: '2023-11-01',
        } as Payment,
        {
          id: 'pay-valid',
          patientId: 'patient-1',
          status: 'paid',
          amountRub: 100,
          fiscalReceiptIssuedAt: '2023-12-01',
        } as Payment,
      ];

      const result = taxPaymentsForDocumentScope(baseDocument, paymentsWithZeroAmount);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'pay-valid');
    });
  });
});