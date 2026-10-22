import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateIncomeReturnDraft,
	calculateInstallmentPlanSchedule,
	type FiscalItemDraft,
	type SplitTenderState,
} from "../fiscal54fzEngine";

describe("Fiscal Installment & Return Tests", () => {
	it("1.1 calculateIncomeReturnDraft — 1-Click Income Return with Deposit Reversal and Card Refund", () => {
		const originalTenders: SplitTenderState = {
			cashRub: 0,
			cardRub: 30000.0,
			sbpRub: 0,
			advanceOffsetRub: 20000.0,
			familyWalletRub: 0,
			certificateRub: 0,
		};

		const returnedItems: FiscalItemDraft[] = [
			{
				id: "ret-item-1",
				name: "Керамическая коронка E-max (Возврат)",
				priceRub: 25000.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];

		const returnDraft = calculateIncomeReturnDraft({
			returnedItems,
			originalTenders,
			originalTotalKopecks: 5000000,
		});

		assert.equal(returnDraft.operationType, "income_return");
		assert.equal(returnDraft.totalReturnRub, 25000.0);
		assert.equal(returnDraft.totalReturnKopecks, 2500000);
		assert.equal(returnDraft.isPartialRefund, true);
		assert.equal(returnDraft.refundToCardRub, 15000.0);
		assert.equal(returnDraft.restoredDepositRub, 10000.0);
		assert.equal(returnDraft.fiscalTags.isBalanced, true);
	});

	it("1.2 calculateInstallmentPlanSchedule — Zero-interest installment plan calculation", () => {
		const result = calculateInstallmentPlanSchedule({
			totalRub: 100000.5,
			downPaymentPercent: 30,
			monthsCount: 3,
			startDateIso: "2026-09-01T10:00:00.000Z",
			planTitle: "Тотальная реабилитация All-on-4",
		});

		assert.equal(result.totalPlanRub, 100000.5);
		assert.equal(result.totalPlanKopecks, 10000050);
		assert.equal(result.downPaymentPercent, 30);
		assert.equal(result.downPaymentRub, 30000.15);
		assert.equal(result.remainingDebtRub, 70000.35);
		assert.equal(result.stages.length, 4);

		assert.equal(result.stages[0]?.stageIndex, 0);
		assert.equal(result.stages[0]?.isInitialDownPayment, true);
		assert.equal(result.stages[0]?.amountRub, 30000.15);

		const sumKop = result.stages.reduce((acc, s) => acc + s.amountKopecks, 0);
		assert.equal(sumKop, 10000050);
	});
});
