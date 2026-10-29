import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyBatchPriceMarkup,
	calculateServiceProfitability,
	calculateTierPrice,
} from "../pricelist/servicePricelistEngine";
import type { ServicePricelistItem } from "../pricelist/servicePricelistPresets";

describe("Service Pricelist Engine: Tiers & Profitability Tests", () => {
	const sampleService: ServicePricelistItem = {
		id: "test-srv-1",
		code804n: "A16.07.002.001",
		statutoryTitle804n: "Восстановление зуба пломбой I, V, VI класс по Блэку",
		commercialTitle: "Лечение кариеса эмали/дентина (композит светового отверждения)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4500,
		basePriceKopecks: 450000,
		materialCostRub: 900,
		labCostRub: 0,
		estimatedDurationMin: 45,
		icd10Indications: ["K02.0", "K02.1"],
		vatRate: 0,
		vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
		isActive: true,
		isArchived: false,
		tags: ["терапия", "пломба"],
	};

	describe("Price Tier Calculations", () => {
		it("calculates standard tier price equal to base price", () => {
			assert.equal(calculateTierPrice(4500, "standard"), 4500);
		});

		it("calculates VIP tier (+20%)", () => {
			assert.equal(calculateTierPrice(5000, "vip"), 6000);
		});

		it("calculates Promo tier (-10%)", () => {
			assert.equal(calculateTierPrice(5000, "promo"), 4500);
		});

		it("calculates Night/Weekend tier (+30%)", () => {
			assert.equal(calculateTierPrice(5000, "night_weekend"), 6500);
		});

		it("respects manual tier override when provided", () => {
			assert.equal(calculateTierPrice(5000, "vip", 7200), 7200);
			assert.equal(calculateTierPrice(5000, "dms", 4200), 4200);
		});
	});

	describe("Profitability and Unit Economics", () => {
		it("calculates margin percentage and high profitability tier", () => {
			const prof = calculateServiceProfitability(sampleService, "standard");
			assert.equal(prof.totalCostRub, 900);
			assert.equal(prof.grossProfitRub, 3600);
			assert.equal(prof.marginPercent, 80);
			assert.equal(prof.level, "high");
		});

		it("detects loss when cost exceeds price", () => {
			const lossService: ServicePricelistItem = {
				...sampleService,
				basePriceRub: 1000,
				materialCostRub: 800,
				labCostRub: 500,
			};
			const prof = calculateServiceProfitability(lossService, "standard");
			assert.equal(prof.totalCostRub, 1300);
			assert.equal(prof.grossProfitRub, -300);
			assert.equal(prof.level, "loss");
		});
	});

	describe("Batch Markups and Rounding", () => {
		it("applies +10% batch price markup with round_100", () => {
			const items: ServicePricelistItem[] = [
				{ ...sampleService, id: "1", basePriceRub: 1450 },
			];
			const updated = applyBatchPriceMarkup(items, {
				percentChange: 10,
				roundMode: "round_100",
				applyToTiers: ["standard"],
			});
			assert.equal(updated[0]?.basePriceRub, 1600);
		});

		it("supports -100% warranty discount (0 rub, Mandate 8e)", () => {
			const items: ServicePricelistItem[] = [
				{ ...sampleService, id: "1", basePriceRub: 5000 },
			];
			const updated = applyBatchPriceMarkup(items, {
				percentChange: -100,
				roundMode: "none",
				applyToTiers: ["standard"],
			});
			assert.equal(updated[0]?.basePriceRub, 0);
		});
	});
});
