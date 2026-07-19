import { test, describe, afterEach, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { deductVisitInventoryIdempotent } from '../visitsQuery.js';
import * as schema from '../schema.js';

describe('deductVisitInventoryIdempotent', () => {
  beforeEach(() => mock.restoreAll());
  afterEach(() => mock.restoreAll());

  test('should insert transaction when no previous visit_deduction exists, and skip on second call', async () => {
    let insertCount = 0;
    
    let existingDeduction = false;

    const mockTx = {
      select: () => mockTx,
      from: () => mockTx,
      where: () => mockTx,
      limit: () => {
        // Return existing deduction if called second time
        return existingDeduction ? [{ id: 'existing' }] : [];
      },
      // Simulate tItems
      then: (resolve: any) => resolve([
        { serviceId: 'srv-1', quantity: 2, status: 'completed' }
      ]),
      for: () => mockTx,
      update: () => mockTx,
      set: () => mockTx,
      insert: () => {
        insertCount++;
        existingDeduction = true; // Mark as deducted for next call
        return mockTx;
      },
      values: () => mockTx
    };

    // First call - should deduct
    await deductVisitInventoryIdempotent(mockTx, 'org-1', 'visit-1', 'user-1');
    assert.strictEqual(insertCount > 0, true, 'Should insert deduction on first call');
    
    const countAfterFirst = insertCount;

    // Second call - should skip due to idempotency check
    await deductVisitInventoryIdempotent(mockTx, 'org-1', 'visit-1', 'user-1');
    assert.strictEqual(insertCount, countAfterFirst, 'Should NOT insert again on second call');
  });
});
