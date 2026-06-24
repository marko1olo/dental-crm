import { test, describe } from 'node:test';
import assert from 'node:assert';
import { snapshotPaymentsForDocument } from './taxPaymentSnapshot.js';
import type { GeneratedDocument, Payment } from '@dental/shared';

describe('snapshotPaymentsForDocument', () => {
  test('returns null when taxPaymentSnapshot is missing', () => {
    const document = {
      id: 'doc-1'
    } as GeneratedDocument;

    const result = snapshotPaymentsForDocument(document);
    assert.strictEqual(result, null);
  });

  test('returns null when taxPaymentSnapshot.payments is empty', () => {
    const document = {
      id: 'doc-1',
      taxPaymentSnapshot: {
        payments: []
      }
    } as unknown as GeneratedDocument;

    const result = snapshotPaymentsForDocument(document);
    assert.strictEqual(result, null);
  });

  test('returns an array of deeply cloned payments', () => {
    const payments = [
      { id: 'payment-1', amountRub: 100 },
      { id: 'payment-2', amountRub: 200 }
    ] as Payment[];

    const document = {
      id: 'doc-1',
      taxPaymentSnapshot: {
        payments
      }
    } as unknown as GeneratedDocument;

    const result = snapshotPaymentsForDocument(document);

    assert.notStrictEqual(result, null);
    assert.deepStrictEqual(result, payments);

    if (result) {
      assert.notStrictEqual(result[0], payments[0]);
      assert.notStrictEqual(result[1], payments[1]);
    }
  });
});
