/**
 * treatmentPlanMathFormattingAndTotals.test.ts — форматирование цен и расчет итогов этапов.
 * (Мандат 8b: строго <= 120 строк).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Kopecks } from "@dental/shared";
import {
	formatChairsidePrice,
	formatKopecksToRubString,
	calculateStageTotals,
	calculatePlanStagesTotals,
} from "../treatmentPlanMath";
import type { TreatmentPlanItem, TreatmentPlanStage } from "../types";

describe("treatmentPlanMath — Форматирование и итоги этапов", () => {
	it("formats ruble amounts for chairside viewing with non-breaking spaces", () => {
		assert.equal(formatChairsidePrice(0), "0 ₽");
		assert.equal(formatChairsidePrice(154000).replace(/\s/g, " "), "154 000 ₽");
		assert.equal(formatChairsidePrice(1500000).replace(/\s/g, " "), "1 500 000 ₽");
		assert.equal(formatChairsidePrice(null), "0 ₽");
		assert.equal(formatChairsidePrice(undefined), "0 ₽");
		assert.equal(formatChairsidePrice(NaN), "0 ₽");
	});

	it("formats kopecks amounts to integer rubles with chairside formatting", () => {
		assert.equal(formatKopecksToRubString(0 as Kopecks), "0 ₽");
		assert.equal(formatKopecksToRubString(15400000 as Kopecks).replace(/\s/g, " "), "154 000 ₽");
		assert.equal(formatKopecksToRubString(99 as Kopecks), "1 ₽");
		assert.equal(formatKopecksToRubString(40 as Kopecks), "0 ₽");
	});

	it("calculates stage totals for empty items cleanly", () => {
		const res = calculateStageTotals([]);
		assert.equal(res.totalKopecks, 0 as Kopecks);
		assert.equal(res.totalRub, 0);
	});

	it("calculates items with quantities and individual line discounts", () => {
		const items: TreatmentPlanItem[] = [
			{
				id: "item-1",
				name: "Лечение кариеса",
				code804n: "A16.07.002",
				category: "Терапия",
				stageKind: "stage_1_therapy",
				unitPriceRub: 5000,
				quantity: 2,
				discountRub: 1000,
				priceRub: 9000,
			},
			{
				id: "item-2",
				name: "Анестезия инфильтрационная",
				code804n: "B01.003.004.004",
				category: "Терапия",
				stageKind: "stage_1_therapy",
				unitPriceRub: 1200,
				quantity: 1,
				discountRub: 0,
				priceRub: 1200,
			},
		];

		const res = calculateStageTotals(items);
		assert.equal(res.totalKopecks, 1020000 as Kopecks);
		assert.equal(res.totalRub, 10200);
	});

	it("aggregates multiple stages with weeks and visits metrics", () => {
		const stages: TreatmentPlanStage[] = [
			{
				stageNumber: 1,
				stageKind: "stage_1_therapy",
				title: "Терапевтический этап",
				subtitle: "Санация",
				clinicalGoal: "Купирование",
				order804nCodes: ["A16.07.002"],
				totalRub: 25000,
				totalKopecks: 2500000 as Kopecks,
				estimatedWeeks: 2,
				estimatedVisits: 3,
				items: [{ id: "it-1", name: "Пломба", code804n: "A16.07.002", category: "Терапия", stageKind: "stage_1_therapy", priceRub: 25000, unitPriceRub: 25000, discountRub: 0, quantity: 1 }],
			},
			{
				stageNumber: 2,
				stageKind: "stage_2_surgery",
				title: "Хирургия",
				subtitle: "Имплантация",
				clinicalGoal: "Восстановление",
				order804nCodes: ["A16.07.054.001"],
				totalRub: 75000,
				totalKopecks: 7500000 as Kopecks,
				estimatedWeeks: 4,
				estimatedVisits: 2,
				items: [{ id: "it-2", name: "Имплантация", code804n: "A16.07.054.001", category: "Хирургия", stageKind: "stage_2_surgery", priceRub: 75000, unitPriceRub: 75000, discountRub: 0, quantity: 1 }],
			},
		];

		const planTotals = calculatePlanStagesTotals(stages);
		assert.equal(planTotals.totalKopecks, 10000000 as Kopecks);
		assert.equal(planTotals.totalRub, 100000);
		assert.equal(planTotals.itemsCount, 2);
		assert.equal(planTotals.estimatedWeeks, 6);
		assert.equal(planTotals.estimatedVisits, 5);
	});
});
