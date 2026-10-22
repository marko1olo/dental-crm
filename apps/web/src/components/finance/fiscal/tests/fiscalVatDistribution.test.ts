import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateRoundToHundredsDiscountRub,
	distributeLoyaltyDiscountAcrossItems,
	type FiscalItemDraft,
	roundToHundredsRub,
} from "../fiscal54fzEngine";

describe("Fiscal Loyalty & VAT Distribution Tests", () => {
	it("1.1 distributeLoyaltyDiscountAcrossItems — Exact kopeck distribution for presets", () => {
		const items: FiscalItemDraft[] = [
			{
				id: "it-1",
				name: "Лечение глубокого кариеса",
				quantity: 1,
				priceRub: 4500,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
			{
				id: "it-2",
				name: "Профессиональная гигиена",
				quantity: 1,
				priceRub: 3500,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];

		const resPension = distributeLoyaltyDiscountAcrossItems(items, { preset: "pensioner_10" });
		assert.equal(resPension.totalGrossRub, 8000);
		assert.equal(resPension.totalDiscountRub, 800);
		assert.equal(resPension.totalNetRub, 7200);

		const resWarranty = distributeLoyaltyDiscountAcrossItems(items, { preset: "warranty_100" });
		assert.equal(resWarranty.totalDiscountRub, 8000);
		assert.equal(resWarranty.totalNetRub, 0);
	});

	it("1.2 distributeLoyaltyDiscountAcrossItems — Capping and negative protection", () => {
		const items: FiscalItemDraft[] = [
			{
				id: "it-1",
				name: "Консультация",
				quantity: 1,
				priceRub: 1000,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];

		const resCapped = distributeLoyaltyDiscountAcrossItems(items, { preset: "manual_rub", customRub: 5000 });
		assert.equal(resCapped.totalDiscountRub, 1000);
		assert.equal(resCapped.totalNetRub, 0);

		const resNeg = distributeLoyaltyDiscountAcrossItems(items, { preset: "manual_rub", customRub: -500 });
		assert.equal(resNeg.totalDiscountRub, 0);
		assert.equal(resNeg.totalNetRub, 1000);
	});

	it("1.3 distributeLoyaltyDiscountAcrossItems — 1-click round to hundreds and percentage discounts", () => {
		const items = [
			{ id: "1", name: "Лечение кариеса", quantity: 1, priceRub: 4428.5 },
			{ id: "2", name: "Анестезия", quantity: 1, priceRub: 3000 },
		];

		const roundRes = distributeLoyaltyDiscountAcrossItems(items, { preset: "round_hundreds" });
		assert.equal(roundRes.totalGrossRub, 7428.5);
		assert.equal(roundRes.totalNetRub, 7400);
		assert.equal(roundRes.totalDiscountRub, 28.5);

		assert.equal(calculateRoundToHundredsDiscountRub(7428), 28);
		assert.equal(roundToHundredsRub(7428), 7400);

		const disc3Res = distributeLoyaltyDiscountAcrossItems(items, { preset: "discount_3" });
		const expected3Kop = Math.round(742850 * 0.03);
		assert.equal(disc3Res.totalDiscountKopecks, expected3Kop);

		const warrantyRes = distributeLoyaltyDiscountAcrossItems(items, { preset: "warranty_100" });
		assert.equal(warrantyRes.totalNetRub, 0);
	});
});
