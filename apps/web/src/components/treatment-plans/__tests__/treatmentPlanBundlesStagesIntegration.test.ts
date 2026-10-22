/**
 * treatmentPlanBundlesStagesIntegration.test.ts — применение пакета к этапам плана лечения.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import { parseKopecks } from "@dental/shared";
import { applyClinicalBundleToStages } from "../treatmentPlanBundlesEngine";
import type { TreatmentPlanStage } from "../types";

describe("treatmentPlanBundlesEngine — Применение пакета к этапам", () => {
	test("создает новый этап, если в плане еще нет этапа нужного типа", () => {
		const initialStages: TreatmentPlanStage[] = [];
		const updatedStages = applyClinicalBundleToStages(initialStages, "caries_turnkey", 36);

		assert.equal(updatedStages.length, 1);
		const stage = updatedStages[0]!;
		assert.equal(stage.stageNumber, 1);
		assert.equal(stage.stageKind, "stage_1_therapy");
		assert.equal(stage.items.length, 4);
		assert.equal(stage.totalRub, 7500);
		assert.equal(stage.totalKopecks, parseKopecks(7500));
		assert.equal(stage.order804nCodes?.length, 4);
	});

	test("добавляет позиции в существующий этап и корректно суммирует рубли и копейки", () => {
		const initialStages: TreatmentPlanStage[] = [
			{
				stageNumber: 1,
				stageKind: "stage_1_therapy",
				title: "Этап 1: Терапия",
				subtitle: "Санация",
				clinicalGoal: "Лечение",
				items: [
					{
						id: "existing-1",
						code804n: "A16.07.050",
						name: "Осмотр",
						category: "Терапия",
						priceRub: 1000,
						unitPriceRub: 1000,
						discountRub: 0,
						quantity: 1,
						phase: 1,
						stageKind: "stage_1_therapy",
						isAuto: false,
						fromCatalog: true,
						isDraft: false,
						requiresManualPricing: false,
					},
				],
				totalRub: 1000,
				totalKopecks: parseKopecks(1000),
				estimatedVisits: 1,
				estimatedWeeks: 1,
				order804nCodes: ["A16.07.050"],
			},
		];

		const updatedStages = applyClinicalBundleToStages(initialStages, "caries_turnkey", 11);
		assert.equal(updatedStages.length, 1);
		const stage = updatedStages[0]!;
		assert.equal(stage.items.length, 5);
		assert.equal(stage.totalRub, 8500);
		assert.equal(stage.totalKopecks, parseKopecks(8500));
		assert.ok(stage.order804nCodes?.includes("A16.07.002.001"));
	});

	test("корректно сортирует этапы по stageNumber при добавлении ортопедии к существующей хирургии", () => {
		const initialStages: TreatmentPlanStage[] = [
			{
				stageNumber: 2,
				stageKind: "stage_2_surgery",
				title: "Этап 2: Хирургия",
				subtitle: "Удаление",
				clinicalGoal: "Удаление",
				items: [],
				totalRub: 0,
				totalKopecks: parseKopecks(0),
				estimatedVisits: 1,
				estimatedWeeks: 2,
				order804nCodes: [],
			},
		];

		const updated = applyClinicalBundleToStages(initialStages, "crown_zirconia_turnkey", 16);
		assert.equal(updated.length, 2);
		assert.equal(updated[0]?.stageNumber, 2);
		assert.equal(updated[1]?.stageNumber, 3);
		assert.equal(updated[1]?.stageKind, "stage_3_orthopedics");
		assert.equal(updated[1]?.totalRub, 30500);
	});
});
