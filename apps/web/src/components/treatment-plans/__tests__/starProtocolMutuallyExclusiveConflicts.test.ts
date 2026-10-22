/**
 * starProtocolMutuallyExclusiveConflicts.test.ts — выявление взаимоисключающих манипуляций СтАР.
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

describe("starProtocolValidationEngine — Взаимоисключающие манипуляции", () => {
	test("detectMutuallyExclusiveToothProcedures выявляет одновременное удаление и коронку на одном FDI зубе", () => {
		const items: TreatmentPlanItem[] = [
			createItem("ext-16", 16, "A16.07.001.001", "Удаление постоянного зуба сложное", "Хирургия", 4500, "stage_2_surgery"),
			createItem("crown-16", 16, "A16.07.004.001", "Восстановление зуба коронкой цельнокерамической", "Ортопедия", 28000, "stage_3_orthopedics"),
			createItem("ext-38", 38, "A16.07.001.001", "Удаление зуба мудрости", "Хирургия", 6000, "stage_2_surgery"),
		];

		const conflicts = detectMutuallyExclusiveToothProcedures(items);
		assert.equal(conflicts.length, 1);
		assert.equal(conflicts[0]!.toothNumber, 16);
		assert.equal(conflicts[0]!.conflictType, "EXTRACTION_VS_PROSTHETICS");
		assert.ok(conflicts[0]!.descriptionRu.includes("Удаление постоянного зуба сложное"));
		assert.ok(conflicts[0]!.descriptionRu.includes("Восстановление зуба коронкой"));
	});

	test("detectMutuallyExclusiveToothProcedures выявляет одновременное удаление и лечение кариеса", () => {
		const items: TreatmentPlanItem[] = [
			createItem("ext-24", 24, "A16.07.001", "Удаление зуба простое", "Хирургия", 3500, "stage_2_surgery"),
			createItem("caries-24", 24, "A16.07.002.001", "Восстановление зуба пломбой светового отверждения", "Терапия", 5000, "stage_1_therapy"),
		];

		const conflicts = detectMutuallyExclusiveToothProcedures(items);
		assert.equal(conflicts.length, 1);
		assert.equal(conflicts[0]!.toothNumber, 24);
		assert.equal(conflicts[0]!.conflictType, "EXTRACTION_VS_PRESERVATION");
	});

	test("validateTreatmentPlanStarProtocols переводит план с взаимоисключающими процедурами в NON_COMPLIANT_DEFECTS", () => {
		const stageWithConflict: TreatmentPlanStage = {
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Комплексный этап",
			subtitle: "Конфликтные манипуляции",
			clinicalGoal: "Проверка валидатора",
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

		const summary = validateTreatmentPlanStarProtocols([stageWithConflict]);
		assert.equal(summary.overallStatus, "NON_COMPLIANT_DEFECTS");
		assert.ok(summary.errorsCount >= 1);
		assert.ok(summary.criticalDefects.some((d) => d.toothNumber === 16 && d.ruleId.startsWith("star-conflict-exclusive-16")));
	});
});
