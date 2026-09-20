import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allocateGlobalDiscountCents } from "../../money.js";

describe("Exact Kopeck Global Discount Allocation (Mandate 8b)", () => {
	it("divides 1000 RUB discount across 3 services of 3333.33 RUB with exact kopeck equality", () => {
		// 1000.00 RUB = 100000n cents
		// 3333.33 RUB = 333333n cents each
		// Total amount = 9999.99 RUB = 999999n cents
		const items = [
			{ id: "svc-1", amountCents: 333333n },
			{ id: "svc-2", amountCents: 333333n },
			{ id: "svc-3", amountCents: 333333n },
		];
		const discountCents = 100000n;

		const allocation = allocateGlobalDiscountCents(items, discountCents);

		// Proportional share for each service before remainder:
		// (100000n * 333333n) / 999999n = 33333n (333.33 RUB)
		// Allocated total: 33333n * 3 = 99999n
		// Remainder: 100000n - 99999n = 1n (1 kopeck)
		// Remainder lands on the last item with max amount: svc-3
		assert.equal(allocation.get("svc-1"), 33333n);
		assert.equal(allocation.get("svc-2"), 33333n);
		assert.equal(allocation.get("svc-3"), 33334n); // 33333n + 1n remainder

		// Invariant: sum of discounts MUST strictly equal discountCents (100000n)
		const totalAllocated =
			(allocation.get("svc-1") ?? 0n) +
			(allocation.get("svc-2") ?? 0n) +
			(allocation.get("svc-3") ?? 0n);
		assert.equal(totalAllocated, discountCents);
	});

	it("allocates discount proportionally via Hamilton-Hare largest remainder method", () => {
		const items = [
			{ id: "treatment-a", amountCents: 200000n }, // 2000 RUB
			{ id: "treatment-b", amountCents: 500000n }, // 5000 RUB
			{ id: "treatment-c", amountCents: 500000n }, // 5000 RUB
			{ id: "treatment-d", amountCents: 100000n }, // 1000 RUB
		];
		// Total = 1300000n (13 000 RUB)
		// Discount = 100001n (1000.01 RUB)
		const discount = 100001n;

		const result = allocateGlobalDiscountCents(items, discount);

		// Base shares:
		// A: 100001 * 200000 / 1300000 = 15384n (remainder 10/13)
		// B: 100001 * 500000 / 1300000 = 38461n (remainder 12/13)
		// C: 100001 * 500000 / 1300000 = 38461n (remainder 12/13)
		// D: 100001 * 100000 / 1300000 = 7692n  (remainder 5/13)
		// Sum of base shares: 15384 + 38461 + 38461 + 7692 = 99998n
		// Remainder = 100001 - 99998 = 3n
		// Hamilton-Hare method distributes the 3 remainder pennies to the 3 items with highest fractional parts:
		// B (12/13) -> +1n (38462n)
		// C (12/13) -> +1n (38462n)
		// A (10/13) -> +1n (15385n)
		// D (5/13)  -> +0n (7692n)
		assert.equal(result.get("treatment-a"), 15385n);
		assert.equal(result.get("treatment-b"), 38462n);
		assert.equal(result.get("treatment-c"), 38462n);
		assert.equal(result.get("treatment-d"), 7692n);

		const totalAllocated = Array.from(result.values()).reduce((acc, v) => acc + v, 0n);
		assert.equal(totalAllocated, discount);
	});

	it("clamps discount when discount exceeds total items amount", () => {
		const items = [
			{ id: "item-1", amountCents: 40000n }, // 400 RUB
			{ id: "item-2", amountCents: 60000n }, // 600 RUB
		];
		// Total amount is 100000n (1000 RUB), but discount requested is 150000n (1500 RUB)
		const discount = 150000n;

		const result = allocateGlobalDiscountCents(items, discount);

		assert.equal(result.get("item-1"), 40000n);
		assert.equal(result.get("item-2"), 60000n);

		const totalAllocated = Array.from(result.values()).reduce((acc, v) => acc + v, 0n);
		assert.equal(totalAllocated, 100000n); // Clamped to total amount
	});

	it("handles edge cases: zero discount, negative discount, empty items, and zero amount items", () => {
		const items = [
			{ id: "svc-1", amountCents: 10000n },
			{ id: "svc-free", amountCents: 0n },
		];

		// Zero discount
		const resZero = allocateGlobalDiscountCents(items, 0n);
		assert.equal(resZero.get("svc-1"), 0n);
		assert.equal(resZero.get("svc-free"), 0n);

		// Negative discount
		const resNeg = allocateGlobalDiscountCents(items, -500n);
		assert.equal(resNeg.get("svc-1"), 0n);
		assert.equal(resNeg.get("svc-free"), 0n);

		// Empty items list
		const resEmpty = allocateGlobalDiscountCents([], 1000n);
		assert.equal(resEmpty.size, 0);

		// All items zero amount
		const zeroItems = [{ id: "free-1", amountCents: 0n }];
		const resZeroItems = allocateGlobalDiscountCents(zeroItems, 5000n);
		assert.equal(resZeroItems.get("free-1"), 0n);
	});

	it("prevents negative prices when discount is close to 100% and remainder exceeds item amount", () => {
		// 3 cheap items of 10 cents (0.10 RUB), discount = 29 cents (0.29 RUB)
		// Total amount = 30 cents
		const items = [
			{ id: "cheap-1", amountCents: 10n },
			{ id: "cheap-2", amountCents: 10n },
			{ id: "cheap-3", amountCents: 10n },
		];
		const discount = 29n;

		const res = allocateGlobalDiscountCents(items, discount);

		// With naive remainder dump, cheap-3 would get 9 + 2 = 11 cents discount (net price: -1 cent!)
		// With Hamilton-Hare, remainder of 2 cents is distributed 1 cent to cheap-2 and 1 cent to cheap-3:
		assert.equal(res.get("cheap-1"), 9n);
		assert.equal(res.get("cheap-2"), 10n);
		assert.equal(res.get("cheap-3"), 10n);

		// Verify zero negative prices
		for (const it of items) {
			const net = it.amountCents - (res.get(it.id) ?? 0n);
			assert.ok(net >= 0n, `Item ${it.id} must not have negative net amount: ${net}`);
		}

		const totalAllocated = Array.from(res.values()).reduce((acc, v) => acc + v, 0n);
		assert.equal(totalAllocated, discount);
	});
});
