import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentsForDocumentScope, snapshotPaymentsForDocument } from './taxPaymentSnapshot.js';
import type { GeneratedDocument, Payment } from '@dental/shared';

describe('taxPaymentsForDocumentScope', () => {
  const baseDocument: GeneratedDocument = {
    id: 'doc-1',
    organizationId: 'org-1',
    patientId: 'patient-1',
    kind: 'tax_deduction_certificate',
    title: 'Tax Certificate',
    status: 'draft',
    issuedAt: null,
    totalAmountRub: null,
    taxYear: 2023,
    taxPayerInn: '123456789012'
  };

  const basePayments: Payment[] = [
    {
      id: 'payment-1',
      organizationId: 'org-1',
      patientId: 'patient-1',
      status: 'paid',
      amountRub: 100,
      paidAt: '2023-01-01',
      fiscalReceiptIssuedAt: '2023-01-01',
      payerInn: '123456789012'
    } as Payment,
    {
      id: 'payment-2',
      organizationId: 'org-1',
      patientId: 'patient-1',
      status: 'paid',
      amountRub: 200,
      paidAt: '2023-02-01',
      fiscalReceiptIssuedAt: '2023-02-01',
      payerInn: '123456789012'
    } as Payment
  ];

  test('returns payments from snapshot if available', () => {
    const documentWithSnapshot: GeneratedDocument = {
      ...baseDocument,
      taxPaymentSnapshot: {
        createdAt: '2023-03-01',
        taxYear: 2023,
        taxPayerInn: '123456789012',
        paymentIds: ['payment-1'],
        fiscalReceiptKeys: ['receipt-1'],
        payments: [basePayments[0]]
      }
    };

    const result = taxPaymentsForDocumentScope(documentWithSnapshot, basePayments);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 'payment-1');
    assert.notStrictEqual(result[0], basePayments[0]); // Ensure it's cloned
    assert.deepStrictEqual(result[0], basePayments[0]);
  });

  test('falls back to baseTaxPaymentsForDocument if snapshot is not available (snapshot kind with selection)', () => {
    const documentWithoutSnapshot: GeneratedDocument = {
      ...baseDocument,
      taxPaymentSnapshot: null,
      payload: {
        taxPaymentSelection: {
          selectedPaymentIds: ['payment-1', 'payment-2']
        }
      }
    };

    const result = taxPaymentsForDocumentScope(documentWithoutSnapshot, basePayments);

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].id, 'payment-1');
    assert.strictEqual(result[1].id, 'payment-2');
  });

  test('falls back to baseTaxPaymentsForDocument if snapshot is not available (non-snapshot kind)', () => {
    const documentWithoutSnapshot: GeneratedDocument = {
      ...baseDocument,
      kind: 'payment_receipt',
      taxPaymentSnapshot: null
    };

    const result = taxPaymentsForDocumentScope(documentWithoutSnapshot, basePayments);

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].id, 'payment-1');
    assert.strictEqual(result[1].id, 'payment-2');
  });

  test('returns empty array if no snapshot and no matching payments', () => {
      const documentWithoutSnapshot: GeneratedDocument = {
        ...baseDocument,
        taxPaymentSnapshot: null
      };

      const result = taxPaymentsForDocumentScope(documentWithoutSnapshot, []);
      assert.strictEqual(result.length, 0);
  });
});

describe('snapshotPaymentsForDocument', () => {
  const baseDocument: GeneratedDocument = {
    id: 'doc-1',
    organizationId: 'org-1',
    patientId: 'patient-1',
    kind: 'tax_deduction_certificate',
    title: 'Tax Certificate',
    status: 'draft',
    issuedAt: null,
    totalAmountRub: null,
    taxYear: 2023,
    taxPayerInn: '123456789012'
  };

  test('returns null if taxPaymentSnapshot is not present', () => {
    assert.strictEqual(snapshotPaymentsForDocument(baseDocument), null);
  });

  test('returns null if taxPaymentSnapshot.payments is empty', () => {
    const docWithEmptySnapshot: GeneratedDocument = {
      ...baseDocument,
      taxPaymentSnapshot: {
        createdAt: '2023-03-01',
        taxYear: 2023,
        taxPayerInn: '123456789012',
        paymentIds: [],
        fiscalReceiptKeys: [],
        payments: []
      }
    };
    assert.strictEqual(snapshotPaymentsForDocument(docWithEmptySnapshot), null);
  });

  test('returns cloned payments if taxPaymentSnapshot has payments', () => {
    const payment = { id: 'payment-1', amountRub: 100 } as Payment;
    const docWithSnapshot: GeneratedDocument = {
      ...baseDocument,
      taxPaymentSnapshot: {
        createdAt: '2023-03-01',
        taxYear: 2023,
        taxPayerInn: '123456789012',
        paymentIds: ['payment-1'],
        fiscalReceiptKeys: ['receipt-1'],
        payments: [payment]
      }
    };
    const result = snapshotPaymentsForDocument(docWithSnapshot);
    assert.ok(result);
    assert.strictEqual(result.length, 1);
    assert.notStrictEqual(result[0], payment);
    assert.deepStrictEqual(result[0], payment);
  });
});
