import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxDocumentDuplicateSensitive, taxPaymentsForIssueSnapshot } from './taxPaymentSnapshot.js';
import type { GeneratedDocument, Payment } from '@dental/shared';

describe('taxDocumentDuplicateSensitive', () => {
  test('returns true for tax_deduction_certificate', () => {
    assert.strictEqual(taxDocumentDuplicateSensitive('tax_deduction_certificate'), true);
  });

  test('returns true for legacy_tax_deduction_certificate', () => {
    assert.strictEqual(taxDocumentDuplicateSensitive('legacy_tax_deduction_certificate'), true);
  });

  test('returns false for other document kinds', () => {
    assert.strictEqual(taxDocumentDuplicateSensitive('completed_works_act'), false);
    assert.strictEqual(taxDocumentDuplicateSensitive('paid_medical_services_contract'), false);
    assert.strictEqual(taxDocumentDuplicateSensitive('informed_consent'), false);
  });
});

describe('taxPaymentsForIssueSnapshot', () => {
  const baseDocument: Partial<GeneratedDocument> = {
    id: 'doc-1',
    organizationId: 'org-1',
    patientId: 'patient-1',
    kind: 'tax_deduction_certificate',
    taxYear: 2023,
    status: 'draft',
  };

  const basePayment: Partial<Payment> = {
    id: 'payment-1',
    patientId: 'patient-1',
    status: 'paid',
    amountRub: 1000,
    paidAt: '2023-05-10T10:00:00Z',
  };

  test('returns base selected payments when explicit payment IDs are selected', () => {
    const document: GeneratedDocument = {
      ...baseDocument,
      kind: 'tax_deduction_certificate',
      payload: {
        taxPaymentSelection: {
          selectedPaymentIds: ['payment-1'],
        },
      },
    } as GeneratedDocument;

    const payments: Payment[] = [
      { ...basePayment, id: 'payment-1' } as Payment,
      { ...basePayment, id: 'payment-2' } as Payment,
    ];

    const existingDocuments: GeneratedDocument[] = [];

    const result = taxPaymentsForIssueSnapshot(document, payments, existingDocuments);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.id, 'payment-1');
  });

  test('returns base payments when document is not duplicate sensitive', () => {
    const document: GeneratedDocument = {
      ...baseDocument,
      kind: 'completed_works_act',
      taxYear: 2023,
    } as GeneratedDocument;

    const payments: Payment[] = [
      { ...basePayment, id: 'payment-1', documentId: 'doc-1' } as Payment,
    ];

    const existingDocuments: GeneratedDocument[] = [
      {
        id: 'doc-2',
        organizationId: 'org-1',
        patientId: 'patient-1',
        kind: 'completed_works_act',
        taxYear: 2023,
        status: 'issued',
        taxPaymentSnapshot: {
          paymentIds: ['payment-1'],
          fiscalReceiptKeys: [],
          payments: [],
          createdAt: '',
          taxYear: 2023,
          taxPayerInn: null,
        }
      } as unknown as GeneratedDocument
    ];

    const result = taxPaymentsForIssueSnapshot(document, payments, existingDocuments);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.id, 'payment-1');
  });

  test('filters out payments already used by other issued tax certificates in the same scope', () => {
    const document: GeneratedDocument = {
      ...baseDocument,
      kind: 'tax_deduction_certificate',
    } as GeneratedDocument;

    const payments: Payment[] = [
      { ...basePayment, id: 'payment-1', fiscalReceiptNumber: 'rcpt-1' } as Payment,
      { ...basePayment, id: 'payment-2', fiscalReceiptNumber: 'rcpt-2' } as Payment,
    ];

    const existingDocuments: GeneratedDocument[] = [
      {
        id: 'doc-2',
        organizationId: 'org-1',
        patientId: 'patient-1',
        kind: 'tax_deduction_certificate',
        taxYear: 2023,
        status: 'issued',
        taxPaymentSnapshot: {
          paymentIds: ['payment-1'],
          fiscalReceiptKeys: ['rcpt-1'],
          payments: [],
          createdAt: '',
          taxYear: 2023,
          taxPayerInn: null,
        }
      } as unknown as GeneratedDocument
    ];

    const result = taxPaymentsForIssueSnapshot(document, payments, existingDocuments);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]?.id, 'payment-2');
  });

  test('ensures payments that are not covered are still included for duplicate sensitive documents', () => {
    const document: GeneratedDocument = {
      ...baseDocument,
      kind: 'tax_deduction_certificate',
    } as GeneratedDocument;

    const payments: Payment[] = [
      { ...basePayment, id: 'payment-1' } as Payment,
      { ...basePayment, id: 'payment-2' } as Payment,
    ];

    const existingDocuments: GeneratedDocument[] = [
      {
        id: 'doc-2',
        organizationId: 'org-1',
        patientId: 'patient-1',
        kind: 'tax_deduction_certificate',
        taxYear: 2023,
        status: 'issued',
        taxPaymentSnapshot: {
          paymentIds: ['payment-3'], // Doesn't match our payments
          fiscalReceiptKeys: [],
          payments: [],
          createdAt: '',
          taxYear: 2023,
          taxPayerInn: null,
        }
      } as unknown as GeneratedDocument
    ];

    const result = taxPaymentsForIssueSnapshot(document, payments, existingDocuments);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0]?.id, 'payment-1');
    assert.strictEqual(result[1]?.id, 'payment-2');
  });

  test('returns base payments if there are no existing documents causing duplicates', () => {
    const document: GeneratedDocument = {
      ...baseDocument,
      kind: 'tax_deduction_certificate',
    } as GeneratedDocument;

    const payments: Payment[] = [
      { ...basePayment, id: 'payment-1' } as Payment,
      { ...basePayment, id: 'payment-2' } as Payment,
    ];

    const existingDocuments: GeneratedDocument[] = [];

    const result = taxPaymentsForIssueSnapshot(document, payments, existingDocuments);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0]?.id, 'payment-1');
    assert.strictEqual(result[1]?.id, 'payment-2');
  });
});
