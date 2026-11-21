import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	type Kopecks,
	assertIntegerKopecks,
	toExactKopecks,
	kopecksAdd,
	kopecksSub,
	kopecksMul,
	kopecksDiv,
	assertWholeKopecks,
	formatKopecksRu,
	kopecksToNumericString,
	kopecksToWholeRubles,
	formatKopecksToRubles,
} from "../money.js";
import {
	calculateMultiTenderAllocation,
	distributeDiscountProportionally,
	calculateAdvanceDepositOffset,
	calculateVatKopecks,
	calculateProportionalMultiTenderRefund,
} from "../fiscal/kopecksArithmetic.js";
import {
	validateAndBalanceSplitPayment,
	allocateSplitPaymentAcrossItems,
} from "../billing/splitPayment.js";

describe("Branded Kopecks & Financial Compiler Walls", () => {
	describe("assertIntegerKopecks & toExactKopecks", () => {
		it("accepts valid whole kopecks (positive, zero, negative)", () => {
			assert.doesNotThrow(() => assertIntegerKopecks(0));
			assert.doesNotThrow(() => assertIntegerKopecks(100));
			assert.doesNotThrow(() => assertIntegerKopecks(15050));
			assert.doesNotThrow(() => assertIntegerKopecks(-500));

			const k1 = toExactKopecks(150000);
			assert.equal(k1, 150000);
			const kZero = toExactKopecks(0);
			assert.equal(kZero, 0);
			const kNeg = toExactKopecks(-250);
			assert.equal(kNeg, -250);
		});

		it("rejects floating-point numbers with clear error message", () => {
			assert.throws(
				() => assertIntegerKopecks(1500.5),
				/Копейки должны быть конечным целым числом, получено: 1500.5/,
			);
			assert.throws(
				() => assertIntegerKopecks(0.01),
				/Копейки должны быть конечным целым числом, получено: 0.01/,
			);
			assert.throws(
				() => toExactKopecks(199.99),
				/Копейки должны быть конечным целым числом, получено: 199.99/,
			);
		});

		it("rejects NaN, Infinity, -Infinity and non-numbers", () => {
			assert.throws(
				() => assertIntegerKopecks(Number.NaN),
				/Копейки должны быть конечным целым числом/,
			);
			assert.throws(
				() => assertIntegerKopecks(Number.POSITIVE_INFINITY),
				/Копейки должны быть конечным целым числом/,
			);
			assert.throws(
				() => assertIntegerKopecks(Number.NEGATIVE_INFINITY),
				/Копейки должны быть конечным целым числом/,
			);
			assert.throws(
				() => assertIntegerKopecks("100" as unknown as number),
				/Копейки должны быть конечным целым числом/,
			);
		});

		it("rejects unsafe integers exceeding Number.MAX_SAFE_INTEGER", () => {
			assert.throws(
				() => assertIntegerKopecks(Number.MAX_SAFE_INTEGER + 100),
				/выходит за пределы безопасного диапазона целых чисел/,
			);
		});
	});

	describe("kopecks arithmetic functions", () => {
		it("kopecksAdd performs exact integer addition", () => {
			const a = toExactKopecks(10000); // 100.00 rub
			const b = toExactKopecks(2550);  // 25.50 rub
			const sum = kopecksAdd(a, b);
			assert.equal(sum, 12550);
		});

		it("kopecksSub performs exact integer subtraction", () => {
			const a = toExactKopecks(10000);
			const b = toExactKopecks(2550);
			const diff = kopecksSub(a, b);
			assert.equal(diff, 7450);
		});

		it("kopecksMul multiplies and rounds strictly to nearest kopeck without float drift", () => {
			const price = toExactKopecks(333); // 3.33 rub
			// 333 * 3 = 999
			assert.equal(kopecksMul(price, 3), 999);
			// 333 * 1.5 = 499.5 -> rounds to 500
			assert.equal(kopecksMul(price, 1.5), 500);
			// 1000 * 0.18 = 180
			assert.equal(kopecksMul(toExactKopecks(1000), 0.18), 180);
		});

		it("kopecksDiv divides with strict rounding and guards against zero divisor", () => {
			const total = toExactKopecks(1000); // 10.00 rub
			assert.equal(kopecksDiv(total, 3), 333);
			assert.equal(kopecksDiv(total, 2), 500);
			assert.throws(() => kopecksDiv(total, 0), /Делитель должен быть ненулевым/);
			assert.throws(() => kopecksDiv(total, Number.NaN), /Делитель должен быть ненулевым/);
		});
	});

	describe("bigint interop with PostgreSQL 18 BIGINT amount_kopecks", () => {
		it("assertWholeKopecks accepts both number Kopecks and bigint", () => {
			assert.doesNotThrow(() => assertWholeKopecks(15000));
			assert.doesNotThrow(() => assertWholeKopecks(15000n));
			assert.doesNotThrow(() => assertWholeKopecks(0n));
			assert.doesNotThrow(() => assertWholeKopecks(-450n));
			assert.throws(() => assertWholeKopecks(150.25), /целым числом/);
		});

		it("formatKopecksRu seamlessly formats number and bigint", () => {
			// 15050 kop = 150,50 ₽
			assert.equal(formatKopecksRu(15050), "150,50 ₽");
			assert.equal(formatKopecksRu(15050n), "150,50 ₽");

			// Large amount (1 500 000.00 rub = 150000000 kop)
			assert.equal(formatKopecksRu(150000000n), "1 500 000,00 ₽");
			assert.equal(formatKopecksRu(150000000), "1 500 000,00 ₽");

			// Negative amount contains 42,75 and ₽
			assert.ok(formatKopecksRu(-4275n).includes("42,75"));
			assert.ok(formatKopecksRu(-4275).includes("42,75"));

			// Zero
			assert.equal(formatKopecksRu(0n), "0,00 ₽");
			assert.equal(formatKopecksRu(0), "0,00 ₽");
		});

		it("kopecksToNumericString seamlessly formats number and bigint", () => {
			assert.equal(kopecksToNumericString(15050), "150.50");
			assert.equal(kopecksToNumericString(15050n), "150.50");
			assert.equal(kopecksToNumericString(5), "0.05");
			assert.equal(kopecksToNumericString(5n), "0.05");
			assert.equal(kopecksToNumericString(-50), "-0.50");
			assert.equal(kopecksToNumericString(-50n), "-0.50");
		});

		it("kopecksToWholeRubles converts number and bigint to whole rubles", () => {
			assert.equal(kopecksToWholeRubles(15000), 150);
			assert.equal(kopecksToWholeRubles(15000n), 150);
			assert.equal(kopecksToWholeRubles(0), 0);
			assert.equal(kopecksToWholeRubles(0n), 0);
			assert.throws(() => kopecksToWholeRubles(15050), /содержит копейки/);
			assert.throws(() => kopecksToWholeRubles(15050n), /содержит копейки/);
		});

		it("formatKopecksToRubles formats kopecks without drift", () => {
			assert.equal(formatKopecksToRubles(15050), "150.50");
			assert.equal(formatKopecksToRubles(0), "0.00");
			assert.equal(formatKopecksToRubles(15050n), "150.50");
		});
	});

	describe("Fiscal multi-tender allocation & discount distribution", () => {
		it("calculateMultiTenderAllocation returns strictly branded Kopecks", () => {
			const alloc = calculateMultiTenderAllocation(10000, {
				cashRub: 40,
				cardRub: 60,
			});
			assert.equal(alloc.cashKopecks, 4000);
			assert.equal(alloc.cardKopecks, 6000);
			assert.equal(alloc.totalElectronicKopecks, 6000);
			assert.equal(alloc.allocatedKopecks, 10000);
			assert.equal(alloc.remainingKopecks, 0);
			assert.equal(alloc.isFullyAllocated, true);
		});

		it("distributeDiscountProportionally distributes with zero penny loss", () => {
			const items = [
				{ priceKopecks: 3333, quantity: 1 },
				{ priceKopecks: 3333, quantity: 1 },
				{ priceKopecks: 3334, quantity: 1 },
			];
			const totalDiscount = 1000; // 10.00 rub discount
			const discounts = distributeDiscountProportionally(items, totalDiscount);
			const sumDiscounts = discounts.reduce((acc, d) => acc + d, 0);
			assert.equal(sumDiscounts, 1000);
		});

		it("calculateVatKopecks calculates exact statutory VAT kopecks", () => {
			const vat20 = calculateVatKopecks(12000, "vat_20");
			assert.equal(vat20, 2000); // 120.00 * 20 / 120 = 20.00
			const vatNone = calculateVatKopecks(12000, "vat_none");
			assert.equal(vatNone, 0);
		});

		it("calculateAdvanceDepositOffset computes exact kopeck advance offset", () => {
			const offset = calculateAdvanceDepositOffset({
				invoiceTotalKopecks: 5000,
				availableDepositKopecks: 3000,
			});
			assert.equal(offset.advanceOffsetKopecks, 3000);
			assert.equal(offset.remainingDueKopecks, 2000);
			assert.equal(offset.isFullyCoveredByDeposit, false);
		});

		it("calculateProportionalMultiTenderRefund allocates exact refunds with zero loss", () => {
			const refund = calculateProportionalMultiTenderRefund(
				{
					cashKopecks: 4000,
					cardKopecks: 6000,
					sbpKopecks: 0,
					advanceOffsetKopecks: 0,
				},
				5000,
			);
			assert.equal(refund.totalRefundKopecks, 5000);
			assert.equal(refund.refundCashKopecks + refund.refundCardKopecks, 5000);
			assert.equal(refund.isPartialRefund, true);
		});
	});

	describe("Billing split payment engine with Kopecks invariants", () => {
		it("validateAndBalanceSplitPayment balances multi-tender breakdown", () => {
			const res = validateAndBalanceSplitPayment({
				actTotalKopecks: 10000,
				tenders: {
					cashKopecks: 5000,
					cardKopecks: 5000,
				},
			});
			assert.equal(res.isBalanced, true);
			assert.equal(res.status, "exact");
			assert.equal(res.discrepancyKopecks, 0);
			assert.equal(res.ffd12Tags.tag1031_cashKopecks, 5000);
			assert.equal(res.ffd12Tags.tag1081_electronicKopecks, 5000);
		});

		it("allocateSplitPaymentAcrossItems allocates lines with 0 kopeck discrepancy", () => {
			const validation = validateAndBalanceSplitPayment({
				actTotalKopecks: 10000,
				tenders: {
					cashKopecks: 5000,
					cardKopecks: 5000,
				},
			});
			const items = [
				{ id: "1", name: "Консультация", priceKopecks: 3000, priceRub: 30, quantity: 1 },
				{ id: "2", name: "Пломбирование", priceKopecks: 7000, priceRub: 70, quantity: 1 },
			];
			const allocated = allocateSplitPaymentAcrossItems(items, validation);
			assert.equal(allocated.length, 2);
			const totalAllocatedCash = allocated.reduce((s, i) => s + i.cashKopecks, 0);
			const totalAllocatedCard = allocated.reduce((s, i) => s + i.cardKopecks, 0);
			assert.equal(totalAllocatedCash, 5000);
			assert.equal(totalAllocatedCard, 5000);
		});
	});
});
