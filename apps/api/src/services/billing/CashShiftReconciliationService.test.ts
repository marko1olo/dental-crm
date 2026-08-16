import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	CashShiftReconciliationService,
	type ShiftReconciliationInput,
} from "./CashShiftReconciliationService.js";

describe("CashShiftReconciliationService — Feature #138 Cash Shift Closing & Z-Reports", () => {
	const baseInput: ShiftReconciliationInput = {
		shiftId: "SHIFT-2026-0816-01",
		organizationId: "org-1",
		operatorId: "cashier-101",
		openedAt: new Date("2026-08-16T08:00:00Z"),
		expectedAmounts: {
			cashRub: 45000,
			sberTerminalRub: 120000,
			sbpQrRub: 35000,
			bonusAdvanceRub: 15000,
		},
		actualCashInDrawerRub: 45000,
		actualSberTerminalSlipTotalRub: 120000,
	};

	test("1. Reconciles exact shift without discrepancies", () => {
		const result = CashShiftReconciliationService.reconcileShift(baseInput);
		assert.equal(result.status, "closed");
		assert.equal(result.hasDiscrepancy, false);
		assert.equal(result.cashDiscrepancyRub, 0);
		assert.equal(result.cardDiscrepancyRub, 0);
		assert.equal(result.totalRevenueRub, 45000 + 120000 + 35000 + 15000);
		assert.equal(result.discrepancySummary, null);
	});

	test("2. Detects cash shortage in drawer", () => {
		const inputWithShortage: ShiftReconciliationInput = {
			...baseInput,
			actualCashInDrawerRub: 44500, // 500 rub shortage
		};

		const result = CashShiftReconciliationService.reconcileShift(inputWithShortage);
		assert.equal(result.status, "discrepancy_flagged");
		assert.equal(result.hasDiscrepancy, true);
		assert.equal(result.cashDiscrepancyRub, -500);
		assert.ok(result.discrepancySummary?.includes("Недостача наличных в кассе: -500 руб."));
	});

	test("3. Detects terminal surplus", () => {
		const inputWithSurplus: ShiftReconciliationInput = {
			...baseInput,
			actualSberTerminalSlipTotalRub: 122000, // 2000 rub surplus
		};

		const result = CashShiftReconciliationService.reconcileShift(inputWithSurplus);
		assert.equal(result.status, "discrepancy_flagged");
		assert.equal(result.hasDiscrepancy, true);
		assert.equal(result.cardDiscrepancyRub, 2000);
		assert.ok(result.discrepancySummary?.includes("Излишек по терминалу Сбера: +2000 руб."));
	});

	test("4. Generates compliant Z-Report payload", () => {
		const result = CashShiftReconciliationService.reconcileShift(baseInput);
		assert.equal(result.zReportData.shiftNumber, "SHIFT-2026-0816-01");
		assert.equal(result.zReportData.fiscalCashRub, 45000);
		assert.equal(result.zReportData.fiscalElectronicRub, 120000 + 35000); // Terminal + SBP
	});
});
