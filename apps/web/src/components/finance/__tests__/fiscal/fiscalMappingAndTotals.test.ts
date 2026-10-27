/**
 * fiscalMappingAndTotals.test.ts — Mapping treatment plan items to fiscal receipt with integer kopecks.
 * Mandate 8b: <= 120 lines.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapTreatmentItemsToFiscalReceipt } from "../../fiscalReceiptEngine.js";
import type { TreatmentPlanItem } from "../../../treatment-plans/types.js";

describe("Fiscal Receipt Engine — Item Mapping & Exact Kopecks", () => {
	const sampleTreatmentItems: TreatmentPlanItem[] = [
		{
			id: "proc-1", toothNumber: 16, code804n: "A16.07.002.001", name: "Лечение глубокого кариеса",
			category: "Терапия", unitPriceRub: 4500, priceRub: 4000, quantity: 1, discountRub: 500, phase: 1, stageKind: "stage_1_therapy",
		},
		{
			id: "proc-2", toothNumber: 36, code804n: "A16.07.054.001", name: "Дентальная имплантация",
			category: "Хирургия", unitPriceRub: 45000, priceRub: 45000, quantity: 1, discountRub: 0, phase: 2, stageKind: "stage_2_surgery",
		},
		{
			id: "proc-3", toothNumber: 11, code804n: "A16.07.004.001", name: "Коронка из диоксида циркония",
			category: "Ортопедия", unitPriceRub: 25000, priceRub: 45000, quantity: 2, discountRub: 5000, phase: 3, stageKind: "stage_3_orthopedics",
		},
	];

	it("maps treatment plan items to compliant fiscal receipt items with kopeck-exact totals", () => {
		const result = mapTreatmentItemsToFiscalReceipt(sampleTreatmentItems);

		assert.equal(result.items.length, 3);
		assert.equal(result.totalRub, 94000);
		assert.equal(result.totalKopecks, 9400000);
		assert.equal(result.grossRub, 99500);
		assert.equal(result.grossKopecks, 9950000);
		assert.equal(result.taxRateKopecks, 0); // Без НДС
		assert.equal(result.hasExpensiveTreatment, true);
		assert.equal(result.taxDeductionSummaryCode, "2");

		const item0 = result.items[0]!;
		assert.ok(item0);
		assert.equal(item0.vatRate, "vat_none");
		assert.equal(item0.taxRateKopecks, 0);
		assert.equal(item0.grossKopecks, 450000);
		assert.equal(item0.discountKopecks, 50000);
		assert.equal(item0.amountKopecks, 400000);
		assert.equal(item0.paymentSubject, "service");
		assert.equal(item0.paymentMethod, "full_payment");
		assert.equal(item0.quantityMeasure, "piece");
		assert.equal(item0.taxDeductionCategory, "1");

		const item1 = result.items[1]!;
		assert.ok(item1);
		assert.equal(item1.taxDeductionCategory, "2");
		assert.equal(item1.isMarkedItem, true);
		assert.equal(item1.paymentSubject, "goods_with_marking");
	});
});
