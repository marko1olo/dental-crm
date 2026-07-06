import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxDocumentDuplicateSensitive, taxPaymentYear, taxPaymentsForIssueSnapshot } from './taxPaymentSnapshot.js';
import type { Payment, GeneratedDocument } from '@dental/shared';
import { test, describe } from 'node:test';
import { taxDocumentDuplicateSensitive } from './taxPaymentSnapshot.js';

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

  test('returns null for empty strings (and falls back if one is empty)', () => {
    assert.strictEqual(taxPaymentYear({ ...basePayment, fiscalReceiptIssuedAt: '', paidAt: '' }), null);
    assert.strictEqual(taxPaymentYear({ ...basePayment, fiscalReceiptIssuedAt: '', paidAt: '2024-01-01' }), 2024);
  });

  test('returns null for whitespace-only strings', () => {
    assert.strictEqual(taxPaymentYear({ ...basePayment, paidAt: '   ' }), null);
  });

  test('returns null for missing/undefined fields', () => {
    assert.strictEqual(taxPaymentYear({} as Payment), null);
    assert.strictEqual(taxPaymentYear({ id: 'payment-1' } as Payment), null);
  });
});

describe('taxPaymentsForIssueSnapshot', () => {
  const baseDocument: Partial<GeneratedDocument> = {
import { taxPaymentsForDocumentScope, snapshotPaymentsForDocument } from './taxPaymentSnapshot.js';
import type { GeneratedDocument, Payment } from '@dental/shared';

describe('taxPaymentsForDocumentScope', () => {
  const baseDocument: GeneratedDocument = {
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
import { test, describe } from 'node:test';
import { taxPaymentReceiptKey } from './taxPaymentSnapshot.js';

describe('taxPaymentReceiptKey', () => {
  test('returns trimmed fiscalReceiptNumber when it exists', () => {
    const payment = { id: 'payment-1', fiscalReceiptNumber: '  12345  ' };
    assert.strictEqual(taxPaymentReceiptKey(payment), '12345');

  test('returns id when fiscalReceiptNumber is undefined', () => {
    const payment = { id: 'payment-2' };
    assert.strictEqual(taxPaymentReceiptKey(payment), 'payment-2');

  test('returns id when fiscalReceiptNumber is null', () => {
    const payment = { id: 'payment-3', fiscalReceiptNumber: null } as any;
    assert.strictEqual(taxPaymentReceiptKey(payment), 'payment-3');

  test('returns id when fiscalReceiptNumber is empty string', () => {
    const payment = { id: 'payment-4', fiscalReceiptNumber: '' };
    assert.strictEqual(taxPaymentReceiptKey(payment), 'payment-4');

  test('returns id when fiscalReceiptNumber is whitespace only', () => {
    const payment = { id: 'payment-5', fiscalReceiptNumber: '   ' };
    assert.strictEqual(taxPaymentReceiptKey(payment), 'payment-5');
    title: 'Tax Certificate',
    issuedAt: null,
    totalAmountRub: null,
    taxPayerInn: '123456789012'

  const basePayments: Payment[] = [
      amountRub: 100,
      paidAt: '2023-01-01',
      fiscalReceiptIssuedAt: '2023-01-01',
      payerInn: '123456789012'
    } as Payment,
      id: 'payment-2',
      amountRub: 200,
      paidAt: '2023-02-01',
      fiscalReceiptIssuedAt: '2023-02-01',
      payerInn: '123456789012'
    } as Payment

  test('returns payments from snapshot if available', () => {
    const documentWithSnapshot: GeneratedDocument = {
        createdAt: '2023-03-01',
        taxPayerInn: '123456789012',
        fiscalReceiptKeys: ['receipt-1'],
        payments: [basePayments[0]]

    const result = taxPaymentsForDocumentScope(documentWithSnapshot, basePayments);

    assert.strictEqual(result[0].id, 'payment-1');
    assert.notStrictEqual(result[0], basePayments[0]); // Ensure it's cloned
    assert.deepStrictEqual(result[0], basePayments[0]);

  test('falls back to baseTaxPaymentsForDocument if snapshot is not available (snapshot kind with selection)', () => {
    const documentWithoutSnapshot: GeneratedDocument = {
      taxPaymentSnapshot: null,
          selectedPaymentIds: ['payment-1', 'payment-2']

    const result = taxPaymentsForDocumentScope(documentWithoutSnapshot, basePayments);

    assert.strictEqual(result[0].id, 'payment-1');
    assert.strictEqual(result[1].id, 'payment-2');

  test('falls back to baseTaxPaymentsForDocument if snapshot is not available (non-snapshot kind)', () => {
    const documentWithoutSnapshot: GeneratedDocument = {
      kind: 'payment_receipt',
      taxPaymentSnapshot: null

    const result = taxPaymentsForDocumentScope(documentWithoutSnapshot, basePayments);

    assert.strictEqual(result[0].id, 'payment-1');
    assert.strictEqual(result[1].id, 'payment-2');

  test('returns empty array if no snapshot and no matching payments', () => {
      const documentWithoutSnapshot: GeneratedDocument = {
        taxPaymentSnapshot: null

      const result = taxPaymentsForDocumentScope(documentWithoutSnapshot, []);
      assert.strictEqual(result.length, 0);

describe('snapshotPaymentsForDocument', () => {
  const baseDocument: GeneratedDocument = {
    id: 'doc-1',
    title: 'Tax Certificate',
    issuedAt: null,
    totalAmountRub: null,
    taxPayerInn: '123456789012'

  test('returns null if taxPaymentSnapshot is not present', () => {
    assert.strictEqual(snapshotPaymentsForDocument(baseDocument), null);

  test('returns null if taxPaymentSnapshot.payments is empty', () => {
    const docWithEmptySnapshot: GeneratedDocument = {
        createdAt: '2023-03-01',
        taxPayerInn: '123456789012',
        paymentIds: [],
        payments: []
    assert.strictEqual(snapshotPaymentsForDocument(docWithEmptySnapshot), null);

  test('returns cloned payments if taxPaymentSnapshot has payments', () => {
    const payment = { id: 'payment-1', amountRub: 100 } as Payment;
    const docWithSnapshot: GeneratedDocument = {
        createdAt: '2023-03-01',
        taxPayerInn: '123456789012',
        fiscalReceiptKeys: ['receipt-1'],
        payments: [payment]
    const result = snapshotPaymentsForDocument(docWithSnapshot);
    assert.ok(result);
    assert.notStrictEqual(result[0], payment);
    assert.deepStrictEqual(result[0], payment);
import { taxPaymentYear } from './taxPaymentSnapshot.js';
import type { Payment } from '@dental/shared';

  test('returns null when neither fiscalReceiptIssuedAt nor paidAt are present', () => {
    const payment = { id: 'p1' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), null);

  test('extracts year from fiscalReceiptIssuedAt using standard ISO format', () => {
    const payment = { id: 'p1', fiscalReceiptIssuedAt: '2023-05-12T10:00:00Z' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2023);

  test('falls back to paidAt if fiscalReceiptIssuedAt is not present', () => {
    const payment = { id: 'p1', paidAt: '2024-08-20T10:00:00Z' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2024);

  test('prefers fiscalReceiptIssuedAt over paidAt', () => {
    const payment = { id: 'p1', fiscalReceiptIssuedAt: '2023-05-12', paidAt: '2024-08-20' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2023);

  test('extracts year falling back to Date parsing if regex does not match at start', () => {
    const payment = { id: 'p1', fiscalReceiptIssuedAt: '05/12/2021' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), 2021);

  test('returns null for an invalid date string', () => {
    const payment = { id: 'p1', fiscalReceiptIssuedAt: 'not a real date string' } as Payment;
    assert.strictEqual(taxPaymentYear(payment), null);
import { taxDocumentUsesPaymentSnapshot } from './taxPaymentSnapshot.js';
import type { GeneratedDocument } from '@dental/shared';

describe('taxDocumentUsesPaymentSnapshot', () => {
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('tax_deduction_certificate'), true);

    assert.strictEqual(taxDocumentUsesPaymentSnapshot('legacy_tax_deduction_certificate'), true);

  test('returns true for tax_deduction_registry', () => {
    assert.strictEqual(taxDocumentUsesPaymentSnapshot('tax_deduction_registry'), true);

    assert.strictEqual(taxDocumentUsesPaymentSnapshot('treatment_plan'), false);
