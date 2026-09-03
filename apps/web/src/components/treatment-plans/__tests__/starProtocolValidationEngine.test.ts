/**
 * starProtocolValidationEngine.test.ts — тестирование валидации соответствия протоколам СтАР и Номенклатуре 804н.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	isValidOrder804nCodeFormat,
	validateTreatmentPlanStarProtocols,
} from "../validation/starProtocolValidationEngine";
import { generateTreatmentPlanStages } from "../treatmentPlanStagesEngine";
import type { ToothData } from "../../odontogram/ToothChart";
import type { TreatmentPlanStage } from "../types";

describe("starProtocolValidationEngine: Order 804n & Star Protocols Compliance", () => {
	test("isValidOrder804nCodeFormat строго проверяет соответствие стандарту Приказа 804н", () => {
		// Валидные коды
		assert.equal(isValidOrder804nCodeFormat("A06.07.004"), true);
		assert.equal(isValidOrder804nCodeFormat("A16.07.002.001"), true);
		assert.equal(isValidOrder804nCodeFormat("A16.07.054.001"), true);
		assert.equal(isValidOrder804nCodeFormat("B01.003.004.005"), true);
		assert.equal(isValidOrder804nCodeFormat("a16.07.050"), true); // регистронезависимо

		// Невалидные коды
		assert.equal(isValidOrder804nCodeFormat("123"), false);
		assert.equal(isValidOrder804nCodeFormat("INVALID_CODE"), false);
		assert.equal(isValidOrder804nCodeFormat("A16-07-001"), false);
		assert.equal(isValidOrder804nCodeFormat(""), false);
	});

	test("Авто-сгенерированный план из одонтограммы проходит валидацию СтАР с высокой оценкой соответствия", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 24, state: "Pulpitis" },
			{ toothNumber: 36, state: "Missing" },
		];

		const stages = generateTreatmentPlanStages(teeth);
		const summary = validateTreatmentPlanStarProtocols(stages);

		assert.ok(summary.complianceScorePercent >= 85, `Оценка соответствия (${summary.complianceScorePercent}%) должна быть >= 85%`);
		assert.notEqual(summary.overallStatus, "NON_COMPLIANT_DEFECTS");
		assert.equal(summary.criticalDefects.length, 0, "Не должно быть критических блокирующих дефектов");
		assert.ok(summary.passedChecksCount > 0, "Должны быть успешно пройденные проверки СтАР");
	});

	test("Обнаруживает отсутствие КЛКТ при планировании дентальной имплантации", () => {
		// Формируем этап без КЛКТ диагностики A06.07.004
		const stageWithoutCT: TreatmentPlanStage = {
			stageNumber: 2,
			stageKind: "stage_2_surgery",
			title: "Хирургический этап",
			subtitle: "Имплантация",
			clinicalGoal: "Имплантация",
			items: [
				{
					id: "imp-36",
					toothNumber: 36,
					code804n: "A16.07.054.001",
					name: "Внутрикостная дентальная имплантация",
					category: "Хирургия",
					unitPriceRub: 42000,
					priceRub: 42000,
					discountRub: 0,
					quantity: 1,
					phase: 2,
					stageKind: "stage_2_surgery",
				},
			],
			totalRub: 42000,
			totalKopecks: 4200000 as any,
			estimatedVisits: 1,
			estimatedWeeks: 8,
			order804nCodes: ["A16.07.054.001"],
		};

		const summary = validateTreatmentPlanStarProtocols([stageWithoutCT]);
		assert.equal(summary.overallStatus, "COMPLIANT_WITH_RECOMMENDATIONS");
		assert.ok(summary.clinicalRecommendations.some((d) => d.ruleId === "star-implant-no-ct-36"));
	});

	test("Обнаруживает невалидный формат кода Номенклатуры 804н", () => {
		const stageWithBadCode: TreatmentPlanStage = {
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Терапевтический этап",
			subtitle: "Лечение",
			clinicalGoal: "Лечение",
			items: [
				{
					id: "bad-item",
					toothNumber: 11,
					code804n: "НЕВАЛИДНЫЙ_КОД_999",
					name: "Нестандартная услуга",
					category: "Терапия",
					unitPriceRub: 5000,
					priceRub: 5000,
					discountRub: 0,
					quantity: 1,
					phase: 1,
					stageKind: "stage_1_therapy",
				},
			],
			totalRub: 5000,
			totalKopecks: 500000 as any,
			estimatedVisits: 1,
			estimatedWeeks: 1,
			order804nCodes: ["НЕВАЛИДНЫЙ_КОД_999"],
		};

		const summary = validateTreatmentPlanStarProtocols([stageWithBadCode]);
		assert.equal(summary.overallStatus, "COMPLIANT_WITH_RECOMMENDATIONS");
		assert.ok(summary.clinicalRecommendations.some((d) => d.ruleId === "804n-format-bad-item"));
	});
});
