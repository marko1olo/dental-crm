import { test, describe } from 'node:test';
import assert from 'node:assert';
import { baseTaxPaymentsForDocument } from './taxPaymentSnapshot.js';
import type { GeneratedDocument, Payment } from '@dental/shared';

describe('baseTaxPaymentsForDocument', () => {
  const baseDocument: GeneratedDocument = {
    id: 'doc-1',
    patientId: 'patient-1',
    kind: 'tax_deduction_certificate',
    status: 'issued',
    organizationId: 'org-1',
    createdAt: new Date().toISOString(),
    taxYear: 2023,
    taxPayerInn: '123456789012',
    payload: {
      taxPaymentSelection: { selectedPaymentIds: ['payment-1', 'payment-2'] }
    }
  } as GeneratedDocument;

  const validPayment1: Payment = {
    id: 'payment-1',
    patientId: 'patient-1',
    status: 'paid',
    amountRub: 100,
    fiscalReceiptIssuedAt: '2023-01-01',
    payerInn: '123456789012',
    documentId: null
  } as Payment;

  const validPayment2: Payment = {
    id: 'payment-2',
    patientId: 'patient-1',
    status: 'paid',
    amountRub: 200,
    fiscalReceiptIssuedAt: '2023-02-01',
    payerInn: '123456789012',
    documentId: null
  } as Payment;

  test('returns [] if document does not have a taxYear', () => {
    const docWithoutYear = { ...baseDocument, taxYear: undefined } as unknown as GeneratedDocument;
    const result = baseTaxPaymentsForDocument(docWithoutYear, [validPayment1, validPayment2]);
    assert.deepStrictEqual(result, []);
  });

  describe('for snapshot-based documents (tax_deduction_certificate)', () => {
    test('returns [] if there are no explicitly selected payment IDs in payload', () => {
      const docWithoutSelection = { ...baseDocument, payload: {} } as GeneratedDocument;
      const result = baseTaxPaymentsForDocument(docWithoutSelection, [validPayment1, validPayment2]);
      assert.deepStrictEqual(result, []);
    });

    test('returns matching payments that are in the selectedPaymentIds set', () => {
      const result = baseTaxPaymentsForDocument(baseDocument, [validPayment1, validPayment2]);
      assert.deepStrictEqual(result, [validPayment1, validPayment2]);
    });

    test('correctly filters out selected payments that do not match the document tax scope', () => {
      const mismatchedPatient: Payment = { ...validPayment1, id: 'payment-3', patientId: 'patient-2' } as Payment;
      const mismatchedYear: Payment = { ...validPayment1, id: 'payment-4', fiscalReceiptIssuedAt: '2022-01-01' } as Payment;
      const notPaid: Payment = { ...validPayment1, id: 'payment-5', status: 'planned' } as Payment;
      const negativeAmount: Payment = { ...validPayment1, id: 'payment-6', amountRub: 0 } as Payment;
      const mismatchedInn: Payment = { ...validPayment1, id: 'payment-7', payerInn: '987654321098' } as Payment;

      const doc = {
        ...baseDocument,
        payload: {
          taxPaymentSelection: {
            selectedPaymentIds: ['payment-1', 'payment-3', 'payment-4', 'payment-5', 'payment-6', 'payment-7']
          }
        }
      } as GeneratedDocument;

      const payments = [validPayment1, mismatchedPatient, mismatchedYear, notPaid, negativeAmount, mismatchedInn];
      const result = baseTaxPaymentsForDocument(doc, payments);

      // Only payment-1 should match the tax scope
      assert.deepStrictEqual(result, [validPayment1]);
    });
  });

  describe('for non-snapshot-based documents (completed_works_act)', () => {
    const actDocument = {
      ...baseDocument,
      kind: 'completed_works_act',
      payload: {}
    } as GeneratedDocument;

    test('returns payments linked to the document if any exist and match tax scope', () => {
      const linkedPayment1 = { ...validPayment1, id: 'linked-1', documentId: actDocument.id } as Payment;
      const linkedPayment2 = { ...validPayment2, id: 'linked-2', documentId: actDocument.id } as Payment;
      const unlinkedPayment = { ...validPayment1, id: 'unlinked-1', documentId: 'other-doc' } as Payment;

      const result = baseTaxPaymentsForDocument(actDocument, [linkedPayment1, linkedPayment2, unlinkedPayment]);
      assert.deepStrictEqual(result, [linkedPayment1, linkedPayment2]);
    });

    test('returns all matching payments if no linked payments exist', () => {
      const unlinkedPayment1 = { ...validPayment1, id: 'unlinked-1', documentId: 'other-doc' } as Payment;
      const unlinkedPayment2 = { ...validPayment2, id: 'unlinked-2', documentId: null } as Payment;

      const result = baseTaxPaymentsForDocument(actDocument, [unlinkedPayment1, unlinkedPayment2]);
      assert.deepStrictEqual(result, [unlinkedPayment1, unlinkedPayment2]);
    });

    test('filters out linked payments that do not match tax scope', () => {
      const linkedValid = { ...validPayment1, id: 'linked-1', documentId: actDocument.id } as Payment;
      const linkedInvalidYear = { ...validPayment2, id: 'linked-2', documentId: actDocument.id, fiscalReceiptIssuedAt: '2022-01-01' } as Payment;

      const result = baseTaxPaymentsForDocument(actDocument, [linkedValid, linkedInvalidYear]);
      assert.deepStrictEqual(result, [linkedValid]);
    });
  });
});
