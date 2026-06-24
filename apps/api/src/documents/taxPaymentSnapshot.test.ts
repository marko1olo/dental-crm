import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentSnapshotTotalRub } from './taxPaymentSnapshot.js';
import type { TaxPaymentSnapshot } from '@dental/shared';

describe('taxPaymentSnapshotTotalRub', () => {
  test('returns 0 for empty payments array', () => {
    const snapshot = { payments: [] } as unknown as TaxPaymentSnapshot;
    assert.strictEqual(taxPaymentSnapshotTotalRub(snapshot), 0);
  });

  test('returns the amount for a single payment', () => {
    const snapshot = { payments: [{ amountRub: 150 }] } as unknown as TaxPaymentSnapshot;
    assert.strictEqual(taxPaymentSnapshotTotalRub(snapshot), 150);
  });

  test('returns the sum of amounts for multiple payments', () => {
    const snapshot = { payments: [{ amountRub: 100 }, { amountRub: 200 }, { amountRub: 50 }] } as unknown as TaxPaymentSnapshot;
    assert.strictEqual(taxPaymentSnapshotTotalRub(snapshot), 350);
  });
});
