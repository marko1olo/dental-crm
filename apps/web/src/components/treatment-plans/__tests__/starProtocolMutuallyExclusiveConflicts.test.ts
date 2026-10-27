/**
 * starProtocolMutuallyExclusiveConflicts.test.ts — Автономия врача СтАР (Мандат 8e).
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	detectMutuallyExclusiveToothProcedures,
	validateTreatmentPlanStarProtocols,
} from "../validation/starProtocolValidationEngine";
import type { TreatmentPlanItem, TreatmentPlanStage } from "../types";

function createItem(id: string, tooth: number, code: string, name: string, cat: string, price: number, stage: any): TreatmentPlanItem {
	return { id, toothNumber: tooth, code804n: code, name, category: cat, unitPriceRub: price, priceRub: price, discountRub: 0, quantity: 1, stageKind: stage };
}

describe("starProtocolValidationEngine — Автономия врача при планировании (Мандат 8e)", () => {
	test("detectMutuallyExclusiveToothProcedures не генерирует ложных конфликтов (врач свободен в планировании)", () => {
		const items: TreatmentPlanItem[] = [
			createItem("ext-16", 16, "A16.07.001.001", "Удаление постоянного зуба сложное", "Хирургия", 4500, "stage_2_surgery"),
			createItem("crown-16", 16, "A16.07.004.001", "Восстановление зуба коронкой цельнокерамической", "Ортопедия", 28000, "stage_3_orthopedics"),
			createItem("ext-38", 38, "A16.07.001.001", "Удаление зуба мудрости", "Хирургия", 6000, "stage_2_surgery"),
		];

		const conflicts = detectMutuallyExclusiveToothProcedures(items);
		assert.equal(conflicts.length, 0, "Не должно быть ложных конфликтов, блокирующих врача");
	});

	test("detectMutuallyExclusiveToothProcedures оставляет альтернативные планы без спама предупреждениями", () => {
		const items: TreatmentPlanItem[] = [
			createItem("ext-24", 24, "A16.07.001", "Удаление зуба простое", "Хирургия", 3500, "stage_2_surgery"),
			createItem("caries-24", 24, "A16.07.002.001", "Восстановление зуба пломбой светового отверждения", "Терапия", 5000, "stage_1_therapy"),
		];

		const conflicts = detectMutuallyExclusiveToothProcedures(items);
		assert.equal(conflicts.length, 0);
	});

	test("validateTreatmentPlanStarProtocols сохраняет автономию врача (0 блокирующих дефектов на совмещение)", () => {
		const stageWithAlternative: TreatmentPlanStage = {
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Комплексный этап",
			subtitle: "Этапные манипуляции",
			clinicalGoal: "Проверка автономии врача",
			items: [
				createItem("ext-16", 16, "A16.07.001.001", "Удаление зуба сложное", "Хирургия", 4500, "stage_1_therapy"),
				createItem("rest-16", 16, "A16.07.004.001", "Восстановление зуба коронкой цельнокерамической", "Ортопедия", 28000, "stage_1_therapy"),
			],
			totalRub: 32500,
			totalKopecks: 3250000 as any,
			estimatedVisits: 2,
			estimatedWeeks: 2,
			order804nCodes: ["A16.07.001.001", "A16.07.004.001"],
		};

		const summary = validateTreatmentPlanStarProtocols([stageWithAlternative]);
		// Мандат 8e: Врач свободен комбинировать терапию и хирургию, ошибки не блокируют план
		assert.notEqual(summary.overallStatus, "NON_COMPLIANT_DEFECTS");
		assert.equal(summary.errorsCount, 0);
		assert.equal(summary.criticalDefects.length, 0);
	});
});

