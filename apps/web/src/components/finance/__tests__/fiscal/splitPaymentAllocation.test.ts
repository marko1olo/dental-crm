/**
 * splitPaymentAllocation.test.ts — Split payment allocation across Cash, Card, SBP, and Deposit.
 * Mandate 8b: <= 120 lines.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseKopecks } from "@dental/shared";
import { calculateSplitPaymentAllocation } from "../../fiscalReceiptEngine.js";

describe("Fiscal Receipt Engine — Split Payment Allocations", () => {
	it("calculates split payment allocations with exact kopeck balance across Cash, Card, SBP, and Deposit", () => {
		const totalKopecks = parseKopecks(94000);

		// Case 1: 100% Card
		const alloc1 = calculateSplitPaymentAllocation(totalKopecks, { cardRub: 94000 });
		assert.equal(alloc1.isFullyAllocated, true);
		assert.equal(alloc1.isOverallocated, false);
		assert.equal(alloc1.cardKopecks, 9400000);
		assert.equal(alloc1.remainingKopecks, 0);

		// Case 2: Split 4-ways (Cash 14000, Card 30000, SBP 40000, Deposit 10000)
		const alloc2 = calculateSplitPaymentAllocation(totalKopecks, {
			cashRub: 14000, cardRub: 30000, sbpRub: 40000, depositRub: 10000,
		});
		assert.equal(alloc2.isFullyAllocated, true);
		assert.equal(alloc2.cashKopecks, 1400000);
		assert.equal(alloc2.cardKopecks, 3000000);
		assert.equal(alloc2.sbpKopecks, 4000000);
		assert.equal(alloc2.depositKopecks, 1000000);
		assert.equal(alloc2.remainingKopecks, 0);

		// Case 3: Overallocation check
		const alloc3 = calculateSplitPaymentAllocation(totalKopecks, { cardRub: 100000 });
		assert.equal(alloc3.isOverallocated, true);
		assert.equal(alloc3.remainingKopecks, 0);
	});
});
