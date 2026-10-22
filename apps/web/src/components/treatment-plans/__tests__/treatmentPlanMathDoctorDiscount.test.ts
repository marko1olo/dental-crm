/**
 * treatmentPlanMathDoctorDiscount.test.ts — скидки врача и гарантия 100% (Мандат 8e).
 * (Мандат 8b: строго <= 120 строк).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Kopecks } from "@dental/shared";
import { applyDoctorDiscountToStages } from "../treatmentPlanMath";
import type { TreatmentPlanStage } from "../types";

describe("treatmentPlanMath — Скидки врача и гарантия (Мандат 8e)", () => {
	const sampleStages: TreatmentPlanStage[] = [
		{
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Реставрация зубов",
			subtitle: "Эстетическое восстановление",
			clinicalGoal: "Восстановление формы коронок",
			order804nCodes: ["A16.07.002.001"],
			totalRub: 20000,
			totalKopecks: 2000000 as Kopecks,
			estimatedWeeks: 1,
			estimatedVisits: 1,
			items: [
				{
					id: "i1",
					name: "Реставрация 11 зуба",
					code804n: "A16.07.002.001",
					category: "Терапия",
					stageKind: "stage_1_therapy",
					unitPriceRub: 10000,
					priceRub: 10000,
					quantity: 1,
					discountRub: 0,
				},
				{
					id: "i2",
					name: "Реставрация 21 зуба",
					code804n: "A16.07.002.001",
					category: "Терапия",
					stageKind: "stage_1_therapy",
					unitPriceRub: 10000,
					priceRub: 10000,
					quantity: 1,
					discountRub: 0,
				},
			],
		},
	];

	it("applies 20% doctor discount accurately", () => {
		const discounted = applyDoctorDiscountToStages(sampleStages, 20);
		assert.equal(discounted[0]?.totalRub, 16000);
		assert.equal(discounted[0]?.totalKopecks, 1600000 as Kopecks);
		assert.equal(discounted[0]?.items[0]?.priceRub, 8000);
		assert.equal(discounted[0]?.items[0]?.discountRub, 2000);
	});

	it("applies 100% guarantee discount (0 ₽ clinical warranty case)", () => {
		const freeWarranty = applyDoctorDiscountToStages(sampleStages, 100);
		assert.equal(freeWarranty[0]?.totalRub, 0);
		assert.equal(freeWarranty[0]?.totalKopecks, 0 as Kopecks);
		assert.equal(freeWarranty[0]?.items[0]?.priceRub, 0);
		assert.equal(freeWarranty[0]?.items[0]?.discountRub, 10000);
	});

	it("clamps invalid discount percentages to [0, 100]", () => {
		const negative = applyDoctorDiscountToStages(sampleStages, -15);
		assert.equal(negative[0]?.totalRub, 20000);

		const excessive = applyDoctorDiscountToStages(sampleStages, 150);
		assert.equal(excessive[0]?.totalRub, 0);
	});
});
