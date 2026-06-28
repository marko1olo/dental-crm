import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxDocumentDuplicateSensitive, taxPaymentYear, taxPaymentsForIssueSnapshot } from './taxPaymentSnapshot.js';
import type { Payment, GeneratedDocument } from '@dental/shared';

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

describe('taxPaymentYear', () => {
  const basePayment = {} as Payment;

  test('returns null when neither fiscalReceiptIssuedAt nor paidAt are provided', () => {
    assert.strictEqual(taxPaymentYear({ ...basePayment, fiscalReceiptIssuedAt: null, paidAt: null }), null);
  });

  test('uses fiscalReceiptIssuedAt when both are provided', () => {
    assert.strictEqual(
      taxPaymentYear({ ...basePayment, fiscalReceiptIssuedAt: '2023-05-01T12:00:00Z', paidAt: '2022-01-01T12:00:00Z' }),
      2023
    );
  });

  test('uses paidAt when fiscalReceiptIssuedAt is absent', () => {
    assert.strictEqual(
      taxPaymentYear({ ...basePayment, fiscalReceiptIssuedAt: null, paidAt: '2024-11-15T08:30:00Z' }),
      2024
    );
  });

  test('extracts the year from standard ISO dates starting with 4 digits', () => {
    assert.strictEqual(taxPaymentYear({ ...basePayment, paidAt: '2021-02-28T10:00:00Z' }), 2021);
    assert.strictEqual(taxPaymentYear({ ...basePayment, paidAt: '1999-12-31' }), 1999);
  });

  test('parses valid date strings that do not start with a 4-digit year', () => {
    // These strings don't match /^(\d{4})/ so they fall back to `new Date()` parsing
    assert.strictEqual(taxPaymentYear({ ...basePayment, paidAt: 'Dec 25, 2020' }), 2020);
    assert.strictEqual(taxPaymentYear({ ...basePayment, paidAt: '03/15/2019' }), 2019);
  });

  test('returns null for completely invalid strings', () => {
    assert.strictEqual(taxPaymentYear({ ...basePayment, paidAt: 'not a date' }), null);
    assert.strictEqual(taxPaymentYear({ ...basePayment, paidAt: '----' }), null);
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
          paymentIds: ['payment-3'],
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