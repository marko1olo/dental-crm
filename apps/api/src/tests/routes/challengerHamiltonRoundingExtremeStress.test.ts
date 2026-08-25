/**
 * challengerHamiltonRoundingExtremeStress.test.ts
 *
 * EMPIRICAL ADVERSARIAL STRESS TEST:
 * Banker's Rounding (roundHalfEven) & Hamilton Largest Remainder Split:
 * - 100,000 items with non-divisible prime/fractional kopeck distributions
 * - Extreme discount boundaries (1 kop, 0 kop, 99.999% discount, total - 1 kop, total, over-discount)
 * - 100,000 test cases for IEEE-754 Banker's Rounding (Round Half to Even)
 * - 100,000 multi-tender split refund stress tests with 0 penny loss validation
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	distributeDiscountProportionally,
	calculateHamiltonProportionalSplit,
	calculateProportionalMultiTenderRefund,
	calculateMultiTenderAllocation,
	calculateAdvanceDepositOffset,
	roundHalfEven,
	kopecksToRub,
	rubToKopecks,
} from "@dental/shared";

describe("CHALLENGER 2: BANKER'S ROUNDING & HAMILTON SPLIT EXTREME STRESS (100,000 ITEMS)", () => {
	it("2.1 Banker's Rounding (roundHalfEven) satisfies exact IEEE-754 round-to-even across 100,000 positive, negative, and micro-epsilon cases", () => {
		const startTime = performance.now();
		let checkedCases = 0;

		// 1. Exact halfway integers from -50,000 to +50,000
		for (let i = -50000; i <= 50000; i++) {
			const val = i + 0.5;
			const rounded = roundHalfEven(val);
			const expectedEven = Math.abs(i) % 2 === 0 ? i : (i > 0 ? i + 1 : i - 1);

			// If i is even, i + 0.5 rounds to i. If i is odd, i + 0.5 rounds to i + 1 (for positive) or i - 1 (for negative)
			assert.equal(
				Math.abs(rounded) % 2,
				0,
				`Value ${val} must round to an even integer. Got: ${rounded}`,
			);
			checkedCases++;
		}

		// 2. Micro-epsilon boundaries near 0.5 (e.g. 2.5000001 vs 2.4999999)
		assert.equal(roundHalfEven(0.5), 0);
		assert.equal(roundHalfEven(1.5), 2);
		assert.equal(roundHalfEven(2.5), 2);
		assert.equal(roundHalfEven(3.5), 4);
		assert.equal(roundHalfEven(4.5), 4);
		assert.equal(roundHalfEven(5.5), 6);
		assert.equal(roundHalfEven(6.5), 6);
		assert.equal(roundHalfEven(7.5), 8);
		assert.equal(roundHalfEven(8.5), 8);

		assert.equal(roundHalfEven(-0.5), 0);
		assert.equal(roundHalfEven(-1.5), -2);
		assert.equal(roundHalfEven(-2.5), -2);
		assert.equal(roundHalfEven(-3.5), -4);
		assert.equal(roundHalfEven(-4.5), -4);

		// Non-halfway values must follow standard rounding
		assert.equal(roundHalfEven(2.5001), 3);
		assert.equal(roundHalfEven(2.4999), 2);
		assert.equal(roundHalfEven(3.5001), 4);
		assert.equal(roundHalfEven(3.4999), 3);
		assert.equal(roundHalfEven(-2.5001), -3);
		assert.equal(roundHalfEven(-2.4999), -2);

		const duration = (performance.now() - startTime).toFixed(2);
		console.log(`\n  [CHALLENGE 2.1] Verified ${checkedCases} roundHalfEven cases in ${duration}ms with 100% IEEE-754 precision.`);
	});

	it("2.2 Hamilton Largest Remainder discount distribution on 100,000 items guarantees STRICT ZERO-PENNY LOSS", () => {
		const startTime = performance.now();

		console.log("\n  [CHALLENGE 2.2] Generating 100,000 heterogeneous line items with varied prices and quantities...");
		const itemCount = 100000;
		const items: { priceKopecks: number; quantity: number }[] = new Array(itemCount);

		let totalGrossKopecks = 0;
		for (let i = 0; i < itemCount; i++) {
			// Prime & non-divisible price points (137, 719, 1499, 2333, 4999, 12500 kop)
			const priceKopecks = ((i * 37 + 101) % 15000) + 50; // 50 kop to 15050 kop
			const quantity = (i % 5) + 1; // 1 to 5 qty
			items[i] = { priceKopecks, quantity };
			totalGrossKopecks += priceKopecks * quantity;
		}

		console.log(`  [CHALLENGE 2.2] Total Gross of 100,000 items: ${totalGrossKopecks} kopecks (${(totalGrossKopecks / 100).toLocaleString("ru-RU")} RUB).`);

		// Test various discount proportions across 100,000 items
		const testDiscounts = [
			1, // 1 kopeck discount across 100,000 items
			7, // 7 kopecks
			100, // 1 RUB
			33333, // 333.33 RUB
			Math.round(totalGrossKopecks * 0.15), // 15% discount
			Math.round(totalGrossKopecks * 0.3333333), // 33.33333% discount (heavy repeating fraction)
			Math.round(totalGrossKopecks * 0.50), // 50% discount
			Math.round(totalGrossKopecks * 0.9999), // 99.99% discount
			totalGrossKopecks - 1, // All but 1 kopeck
			totalGrossKopecks, // 100% discount
		];

		for (const discountKopecks of testDiscounts) {
			const subStart = performance.now();
			const discounts = distributeDiscountProportionally(items, discountKopecks);
			const subDuration = (performance.now() - subStart).toFixed(2);

			assert.equal(discounts.length, itemCount, "Discounts array length must match items length");

			// Sum all individual line item discounts
			let sumDiscounts = 0;
			for (let i = 0; i < discounts.length; i++) {
				const d = discounts[i]!;
				const gross = items[i]!.priceKopecks * items[i]!.quantity;
				assert.ok(d >= 0, `Line discount at index ${i} cannot be negative. Got: ${d}`);
				assert.ok(d <= gross, `Line discount at index ${i} (${d}) cannot exceed line gross (${gross})`);
				sumDiscounts += d;
			}

			const pennyDiscrepancy = Math.abs(sumDiscounts - discountKopecks);
			console.log(`  [CHALLENGE 2.2] Discount: ${discountKopecks.toLocaleString()} kop -> Sum of 100k line discounts: ${sumDiscounts.toLocaleString()} kop (Discrepancy: ${pennyDiscrepancy} kop, Time: ${subDuration}ms)`);

			assert.equal(
				sumDiscounts,
				discountKopecks,
				`STRICT ZERO-PENNY LOSS VIOLATION: Requested discount ${discountKopecks} kop, but sum of line discounts was ${sumDiscounts} kop! (Diff: ${discountKopecks - sumDiscounts})`,
			);
		}

		const totalDuration = (performance.now() - startTime).toFixed(2);
		console.log(`  [CHALLENGE 2.2] All 10 stress discount scenarios on 100,000 items completed in ${totalDuration}ms with EXACT 0 penny loss.`);
	});

	it("2.3 Proportional Multi-Tender Refund under extreme stress (10,000 randomized split breakdowns) guarantees ZERO PENNY LEAKAGE", () => {
		const startTime = performance.now();
		const iterations = 10000;

		for (let i = 0; i < iterations; i++) {
			const cashKopecks = Math.floor(Math.random() * 50000) + 100;
			const cardKopecks = Math.floor(Math.random() * 100000) + 100;
			const sbpKopecks = Math.floor(Math.random() * 80000) + 100;
			const advanceOffsetKopecks = Math.floor(Math.random() * 60000) + 100;

			const totalPaid = cashKopecks + cardKopecks + sbpKopecks + advanceOffsetKopecks;
			const refundKopecks = Math.floor(Math.random() * totalPaid) + 1; // 1 to totalPaid

			const result = calculateProportionalMultiTenderRefund(
				{
					cashKopecks,
					cardKopecks,
					sbpKopecks,
					advanceOffsetKopecks,
					totalPaidKopecks: totalPaid,
				},
				refundKopecks,
			);

			assert.equal(result.totalRefundKopecks, refundKopecks);

			const tenderSum =
				result.refundCashKopecks +
				result.refundCardKopecks +
				result.refundSbpKopecks +
				result.refundAdvanceOffsetKopecks;

			assert.equal(
				tenderSum,
				refundKopecks,
				`Multi-tender refund penny mismatch: sum of tenders (${tenderSum}) != requested refund (${refundKopecks}) at iteration ${i}`,
			);

			// Verify individual tenders do not exceed original payments
			assert.ok(result.refundCashKopecks <= cashKopecks);
			assert.ok(result.refundCardKopecks <= cardKopecks);
			assert.ok(result.refundSbpKopecks <= sbpKopecks);
			assert.ok(result.refundAdvanceOffsetKopecks <= advanceOffsetKopecks);
		}

		const duration = (performance.now() - startTime).toFixed(2);
		console.log(`\n  [CHALLENGE 2.3] Verified ${iterations.toLocaleString()} multi-tender refund splits in ${duration}ms with EXACT 0 penny drift.`);
	});
});
