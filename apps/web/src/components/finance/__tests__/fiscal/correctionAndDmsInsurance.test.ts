/**
 * correctionAndDmsInsurance.test.ts — Correction receipt, instant change, DMS insurance & family wallet.
 * Mandate 8b: <= 120 lines.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseKopecks } from "@dental/shared";
import {
	calculateSplitPaymentAllocation,
	generateFiscalCorrectionReceipt54Fz,
} from "../../fiscalReceiptEngine.js";
import type { TreatmentPlanItem } from "../../../treatment-plans/types.js";

describe("Fiscal Receipt Engine — Correction, DMS Insurance & Family Wallet", () => {
	const singleProcItems: TreatmentPlanItem[] = [
		{
			id: "proc-1",
			toothNumber: 16,
			code804n: "A16.07.002.001",
			name: "Лечение кариеса",
			category: "therapy",
			unitPriceRub: 4000,
			priceRub: 4000,
			discountRub: 0,
			quantity: 1,
			stageKind: "stage_1_therapy",
		},
	];

	it("generates correction fiscal receipt with statutory base document tags", () => {
		const corr = generateFiscalCorrectionReceipt54Fz({
			items: singleProcItems,
			splitPayment: { cashRub: 4000 },
			operationType: "income",
			correctionType: "self_initiated",
			correctionDocDate: "2026-08-24",
			correctionDocNumber: "АКТ-2026/08",
			correctionReason: "Коррекция неприменения ККТ при сбое питания",
			patientId: "pat-100",
			patientName: "Смирнов Алексей",
			customerContact: "+7 999 555-44-33",
		});
		assert.equal(corr.isCorrection, true);
		assert.equal(corr.operationType, "income");
		assert.equal(corr.correctionType, "self_initiated");
		assert.equal(corr.correctionTypeName, "Самостоятельно");
		assert.equal(corr.correctionDocDate, "2026-08-24");
		assert.equal(corr.correctionDocNumber, "АКТ-2026/08");
		assert.equal(corr.correctionReason, "Коррекция неприменения ККТ при сбое питания");
		assert.equal(corr.totalRub, 4000);
		assert.equal(corr.totalKopecks, 400000);
		assert.ok(corr.receiptNumber.startsWith("CHK-COR-"));
	});

	it("calculates instant cash change and shortage correctly for cash tender", () => {
		const alloc = calculateSplitPaymentAllocation(400000, { cashRub: 4000, receivedCashRub: 5000 });
		assert.equal(alloc.cashKopecks, 400000);
		assert.equal(alloc.receivedCashKopecks, 500000);
		assert.equal(alloc.changeKopecks, 100000);
		assert.equal(alloc.changeRub, 1000);
		assert.equal(alloc.isCashShortage, false);
	});

	it("handles DMS insurance split with patient co-payment across cash and card", () => {
		const alloc = calculateSplitPaymentAllocation(parseKopecks(50000), {
			insuranceRub: 35000, guaranteeLetterNumber: "ГП-2026/8412", cardRub: 10000, cashRub: 5000, receivedCashRub: 5000,
		});
		assert.equal(alloc.isFullyAllocated, true);
		assert.equal(alloc.insuranceRub, 35000);
		assert.equal(alloc.patientCoPayRub, 15000);
		assert.equal(alloc.cardRub, 10000);
		assert.equal(alloc.cashRub, 5000);
	});

	it("handles family wallet deduction with kopeck-exact precision", () => {
		const alloc = calculateSplitPaymentAllocation(400000, { familyWalletRub: 1500.50, cardRub: 2499.50 });
		assert.equal(alloc.familyWalletKopecks, 150050);
		assert.equal(alloc.cardKopecks, 249950);
		assert.equal(alloc.isFullyAllocated, true);
	});
});
