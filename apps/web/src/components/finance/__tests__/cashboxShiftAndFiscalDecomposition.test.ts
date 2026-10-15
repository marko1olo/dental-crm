/**
 * cashboxShiftAndFiscalDecomposition.test.ts
 *
 * Comprehensive Vitest suite validating:
 * 1. 54-FZ 24h shift limits & shift duration formatting
 * 2. Kopeck-exact cash drawer reconciliation & totals aggregation
 * 3. 1-click cash in/out transaction executors
 * 4. Multi-tender splits & 100% warranty zero-barrier checkout
 * 5. Payment creation split pipeline resolver
 */

import { describe, expect, it } from "vitest";
import {
	checkShift24hLimit,
	formatShiftDuration,
	reconcileShiftCounters,
	calculateShiftTotals,
	executeCashDeposit,
	executeCashWithdrawal,
	calculatePaymentDiscount,
	calculateFastCheckoutDiscount,
	process100PercentDiscountCheckout,
	allocateRemainderToTender,
	getFastCombinedTenderPresets,
	calculateCashChange,
	calculateCombinedFamilyCashCardSplit,
} from "../cashboxOperations.js";

describe("54-FZ Cash Shift Lifecycle & 24h Limits (Mandate 8e & Art. 4.3 54-FZ)", () => {
	it("returns valid state for freshly opened shift (< 24h)", () => {
		const openedAt = new Date("2026-10-12T08:00:00Z");
		const now = new Date("2026-10-12T16:30:00Z"); // 8.5 hours

		const res = checkShift24hLimit(openedAt, now);
		expect(res.isLimitExceeded).toBe(false);
		expect(res.durationHours).toBe(8.5);
		expect(res.canClose).toBe(true);
		expect(res.canOpen).toBe(false);
		expect(res.warningRu).toBeUndefined();
		expect(res.statusMessageRu).toContain("8.5 ч.");
	});

	it("warns when shift is approaching 24h limit (within 60 mins)", () => {
		const openedAt = new Date("2026-10-12T00:00:00Z");
		const now = new Date("2026-10-12T23:15:00Z"); // 23h 15m (45 mins left)

		const res = checkShift24hLimit(openedAt, now);
		expect(res.isLimitExceeded).toBe(false);
		expect(res.warningRu).toBeDefined();
		expect(res.warningRu).toContain("45 мин");
	});

	it("blocks new receipts and flags violation when shift exceeds 24h per Art. 4.3 54-FZ", () => {
		const openedAt = new Date("2026-10-11T08:00:00Z");
		const now = new Date("2026-10-12T09:30:00Z"); // 25.5 hours

		const res = checkShift24hLimit(openedAt, now);
		expect(res.isLimitExceeded).toBe(true);
		expect(res.durationHours).toBeGreaterThan(24);
		expect(res.warningRu).toContain("Смена длится более 24 часов");
	});

	it("formats shift duration properly in human-readable Russian", () => {
		const openedAt = new Date("2026-10-12T08:00:00Z");
		const now = new Date("2026-10-12T16:35:00Z");

		const formatted = formatShiftDuration(openedAt, now);
		expect(formatted).toBe("8 ч 35 мин");

		const shortDuration = formatShiftDuration(openedAt, new Date("2026-10-12T08:25:00Z"));
		expect(shortDuration).toBe("25 мин");
	});
});

describe("Kopeck-Exact Cash Drawer Reconciliation & Shift Totals", () => {
	it("reconciles exact cash without discrepancy (копейка в копейку)", () => {
		const res = reconcileShiftCounters({
			initialCashRub: 5000,
			cashIncomeRub: 14500.5,
			cashExpenseRub: 2300.25,
			actualCashRub: 17200.25, // 5000 + 14500.50 - 2300.25 = 17200.25
		});

		expect(res.isBalanced).toBe(true);
		expect(res.discrepancyRub).toBe(0);
		expect(res.discrepancyKop).toBe(0);
		expect(res.statusRu).toBe("Сбалансировано");
		expect(res.descriptionRu).toContain("копейка в копейку");
	});

	it("detects cash surplus (излишек) with penny precision", () => {
		const res = reconcileShiftCounters({
			initialCashRub: 1000,
			cashIncomeRub: 5000,
			cashExpenseRub: 0,
			actualCashRub: 6150.5, // 6000 expected vs 6150.50 actual -> +150.50
		});

		expect(res.isBalanced).toBe(false);
		expect(res.statusRu).toBe("Излишек");
		expect(res.discrepancyRub).toBe(150.5);
		expect(res.discrepancyKop).toBe(15050);
		expect(res.descriptionRu).toContain("+150,5");
	});

	it("detects cash shortage (недостача) with penny precision", () => {
		const res = reconcileShiftCounters({
			initialCashRub: 2000,
			cashIncomeRub: 8000,
			cashExpenseRub: 1000,
			actualCashRub: 8500, // 9000 expected vs 8500 actual -> -500.00
		});

		expect(res.isBalanced).toBe(false);
		expect(res.statusRu).toBe("Недостача");
		expect(res.discrepancyRub).toBe(-500);
		expect(res.discrepancyKop).toBe(-50000);
		expect(res.descriptionRu).toContain("-500");
	});

	it("aggregates shift operations across cash, card and SBP", () => {
		const ops = [
			{ operationType: "income", amountRub: 1500, method: "cash" },
			{ operationType: "income", amountRub: 3500.5, method: "card" },
			{ operationType: "income", amountRub: 2000, method: "sbp" },
			{ operationType: "expense", amountRub: 800, method: "cash" },
		];

		const totals = calculateShiftTotals(ops);
		expect(totals.cashIncomeRub).toBe(1500);
		expect(totals.cardIncomeRub).toBe(3500.5);
		expect(totals.sbpIncomeRub).toBe(2000);
		expect(totals.totalIncomeRub).toBe(7000.5);
		expect(totals.totalExpenseRub).toBe(800);
	});
});

describe("Cash In & Cash Out Transaction Executors", () => {
	it("executes cash deposit (внесение размена)", async () => {
		const res = await executeCashDeposit({
			cashBoxId: "box-main-001",
			amountRub: 3000,
			currentBalanceRub: 5000,
			reasonText: "Разменная монета",
			operatorName: "Иванова А.С.",
		});

		expect(res.success).toBe(true);
		expect(res.amountRub).toBe(3000);
		expect(res.balanceBeforeRub).toBe(5000);
		expect(res.balanceAfterRub).toBe(8000);
		expect(res.messageRu.replace(/\u00a0/g, " ")).toContain("3 000");
	});

	it("prevents cash withdrawal if amount exceeds balance in drawer", async () => {
		const res = await executeCashWithdrawal({
			cashBoxId: "box-main-001",
			amountRub: 10000,
			currentBalanceRub: 2500,
			reasonText: "Инкассация",
		});

		expect(res.success).toBe(false);
		expect(res.messageRu).toContain("Недостаточно наличных в кассе");
		expect(res.balanceAfterRub).toBe(2500);
	});

	it("executes valid cash withdrawal (инкассация)", async () => {
		const res = await executeCashWithdrawal({
			cashBoxId: "box-main-001",
			amountRub: 4000,
			currentBalanceRub: 9000,
			reasonText: "Инкассация в банк",
		});

		expect(res.success).toBe(true);
		expect(res.balanceBeforeRub).toBe(9000);
		expect(res.balanceAfterRub).toBe(5000);
	});
});

describe("Doctor Autonomy & Discounts (Mandates 8e п. 7, 8n)", () => {
	it("handles 100% warranty discount with 0 due and bypasses physical KKT print", () => {
		const res = process100PercentDiscountCheckout({
			totalGrossRub: 12500,
			isWarrantyRework: true,
		});

		expect(res.isZeroDue).toBe(true);
		expect(res.totalNetRub).toBe(0);
		expect(res.bypassKktZeroReceipt).toBe(true);
		expect(res.fiscalSign).toBe("WARRANTY-100-GUARANTEE");
		expect(res.paymentStatus).toBe("Оплачено (скидка 100%)");
	});

	it("handles colleague 100% discount with staff banner", () => {
		const res = process100PercentDiscountCheckout({
			totalGrossRub: 8000,
			isStaffColleague: true,
		});

		expect(res.isZeroDue).toBe(true);
		expect(res.statusBannerText).toContain("Лечение персонала");
	});

	it("calculates partial percentage discounts correctly", () => {
		const res = calculatePaymentDiscount(10000, { discountPercent: 10 });
		expect(res.totalDueRub).toBe(9000);
		expect(res.discountRub).toBe(1000);
		expect(res.effectiveDiscountPercent).toBe(10);
	});

	it("calculates fast checkout preset discounts", () => {
		const res = calculateFastCheckoutDiscount({
			grossKop: 1235000, // 12 350 ₽
			preset: "round_hundreds",
		});
		// rounds down to hundreds: 12 300 ₽
		expect(res.netRub).toBe(12300);
		expect(res.discountRub).toBe(50);
	});
});

describe("Multi-Tender Splits & Remainder Auto-Allocation", () => {
	it("allocates remainder to SBP QR", () => {
		const current = { cardRub: 1000, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0 };
		const next = allocateRemainderToTender({
			totalDueRub: 5000,
			currentTenders: current,
			targetTender: "sbp",
		});

		expect(next.cardRub).toBe(1000);
		expect(next.sbpRub).toBe(4000);
	});

	it("calculates 3-way combined split (advance + card 50% + cash 50%) with kopeck precision", () => {
		const split = calculateCombinedFamilyCashCardSplit({
			totalDueRub: 11000,
			patientDepositRub: 3000,
		});

		expect(split.advanceDeductedRub).toBe(3000);
		expect(split.remainderToPayRub).toBe(8000);
		expect(split.cardRub).toBe(4000);
		expect(split.cashRub).toBe(4000);
		expect(split.isPennyExact).toBe(true);
	});

	it("calculates cash change without shortage", () => {
		const change = calculateCashChange(2340, 2500);
		expect(change.isExact).toBe(false);
		expect(change.changeRub).toBe(160);
		expect(change.isShortage).toBe(false);
	});

	it("detects exact cash without change", () => {
		const change = calculateCashChange(5000, 5000);
		expect(change.isExact).toBe(true);
		expect(change.changeRub).toBe(0);
	});
});

