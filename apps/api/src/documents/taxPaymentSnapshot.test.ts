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

  test('returns null if neither fiscalReceiptIssuedAt nor paidAt is present', () => {
    const payment = {} as Payment;

  test('uses fiscalReceiptIssuedAt over paidAt if both are present', () => {
    const payment = {
      fiscalReceiptIssuedAt: '2023-05-10T12:00:00Z',
      paidAt: '2022-04-10T12:00:00Z',
    } as Payment;

  test('uses paidAt if fiscalReceiptIssuedAt is absent', () => {
    const payment = {
      paidAt: '2021-04-10T12:00:00Z',
    } as Payment;

  test('extracts year from ISO date string', () => {
    const payment = { fiscalReceiptIssuedAt: '2023-05-10T12:00:00Z' } as Payment;

  test('extracts year from YYYY-MM-DD string', () => {
    const payment = { fiscalReceiptIssuedAt: '2024-01-01' } as Payment;

  test('extracts year from non-standard Date string representation as fallback', () => {
    const payment = { fiscalReceiptIssuedAt: 'May 10, 2023 12:00:00' } as Payment;
    // Regex fails to find YYYY at start, so falls back to Date parsing

  test('returns null for invalid date string not matching regex or Date constructor', () => {
    const payment = { fiscalReceiptIssuedAt: 'invalid date' } as Payment;
import { taxPaymentSnapshotTotalRub } from './taxPaymentSnapshot.js';
import type { TaxPaymentSnapshot } from '@dental/shared';

describe('taxPaymentSnapshotTotalRub', () => {
  test('returns 0 for empty payments array', () => {
    const snapshot = { payments: [] } as unknown as TaxPaymentSnapshot;
    assert.strictEqual(taxPaymentSnapshotTotalRub(snapshot), 0);

  test('returns the amount for a single payment', () => {
    const snapshot = { payments: [{ amountRub: 150 }] } as unknown as TaxPaymentSnapshot;
    assert.strictEqual(taxPaymentSnapshotTotalRub(snapshot), 150);

  test('returns the sum of amounts for multiple payments', () => {
    const snapshot = { payments: [{ amountRub: 100 }, { amountRub: 200 }, { amountRub: 50 }] } as unknown as TaxPaymentSnapshot;
    assert.strictEqual(taxPaymentSnapshotTotalRub(snapshot), 350);
import { baseTaxPaymentsForDocument } from './taxPaymentSnapshot.js';

describe('baseTaxPaymentsForDocument', () => {
    createdAt: new Date().toISOString(),
      taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-2'] }

  const validPayment1: Payment = {
    payerInn: '123456789012',
    documentId: null

  const validPayment2: Payment = {
    payerInn: '123456789012',
    documentId: null

  test('returns [] if document does not have a taxYear', () => {
    const docWithoutYear = { ...baseDocument, taxYear: undefined } as unknown as GeneratedDocument;
    const result = baseTaxPaymentsForDocument(docWithoutYear, [validPayment1, validPayment2]);
    assert.deepStrictEqual(result, []);

  describe('for snapshot-based documents (tax_deduction_certificate)', () => {
    test('returns [] if there are no explicitly selected payment IDs in payload', () => {
      const docWithoutSelection = { ...baseDocument, payload: {} } as GeneratedDocument;
      const result = baseTaxPaymentsForDocument(docWithoutSelection, [validPayment1, validPayment2]);
      assert.deepStrictEqual(result, []);

    test('returns matching payments that are in the selectedPaymentIds set', () => {
      const result = baseTaxPaymentsForDocument(baseDocument, [validPayment1, validPayment2]);
      assert.deepStrictEqual(result, [validPayment1, validPayment2]);

    test('correctly filters out selected payments that do not match the document tax scope', () => {
      const mismatchedPatient: Payment = { ...validPayment1, id: 'payment-3', patientId: 'patient-2' } as Payment;
      const mismatchedYear: Payment = { ...validPayment1, id: 'payment-4', fiscalReceiptIssuedAt: '2022-01-01' } as Payment;
      const notPaid: Payment = { ...validPayment1, id: 'payment-5', status: 'planned' } as Payment;
      const negativeAmount: Payment = { ...validPayment1, id: 'payment-6', amountRub: 0 } as Payment;
      const mismatchedInn: Payment = { ...validPayment1, id: 'payment-7', payerInn: '987654321098' } as Payment;

      const doc = {
            selectedPaymentIds: ['payment-1', 'payment-3', 'payment-4', 'payment-5', 'payment-6', 'payment-7']

      const payments = [validPayment1, mismatchedPatient, mismatchedYear, notPaid, negativeAmount, mismatchedInn];
      const result = baseTaxPaymentsForDocument(doc, payments);

      // Only payment-1 should match the tax scope
      assert.deepStrictEqual(result, [validPayment1]);

  describe('for non-snapshot-based documents (completed_works_act)', () => {
    const actDocument = {
      payload: {}

    test('returns payments linked to the document if any exist and match tax scope', () => {
      const linkedPayment1 = { ...validPayment1, id: 'linked-1', documentId: actDocument.id } as Payment;
      const linkedPayment2 = { ...validPayment2, id: 'linked-2', documentId: actDocument.id } as Payment;
      const unlinkedPayment = { ...validPayment1, id: 'unlinked-1', documentId: 'other-doc' } as Payment;

      const result = baseTaxPaymentsForDocument(actDocument, [linkedPayment1, linkedPayment2, unlinkedPayment]);
      assert.deepStrictEqual(result, [linkedPayment1, linkedPayment2]);

    test('returns all matching payments if no linked payments exist', () => {
      const unlinkedPayment1 = { ...validPayment1, id: 'unlinked-1', documentId: 'other-doc' } as Payment;
      const unlinkedPayment2 = { ...validPayment2, id: 'unlinked-2', documentId: null } as Payment;

      const result = baseTaxPaymentsForDocument(actDocument, [unlinkedPayment1, unlinkedPayment2]);
      assert.deepStrictEqual(result, [unlinkedPayment1, unlinkedPayment2]);

    test('filters out linked payments that do not match tax scope', () => {
      const linkedValid = { ...validPayment1, id: 'linked-1', documentId: actDocument.id } as Payment;
      const linkedInvalidYear = { ...validPayment2, id: 'linked-2', documentId: actDocument.id, fiscalReceiptIssuedAt: '2022-01-01' } as Payment;

      const result = baseTaxPaymentsForDocument(actDocument, [linkedValid, linkedInvalidYear]);
      assert.deepStrictEqual(result, [linkedValid]);
