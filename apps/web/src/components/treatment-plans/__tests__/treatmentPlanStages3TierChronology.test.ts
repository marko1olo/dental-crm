/**
 * treatmentPlanStages3TierChronology.test.ts — Тестирование хронологии этапов остеоинтеграции
 * и генерации 3-уровневого сравнения планов лечения (Эконом / Стандарт / Оптимум).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { ToothData } from "../../odontogram/ToothChart";
import {
	generate3TierPlanComparison,
	generateTreatmentPlanStages,
} from "../treatmentPlanStagesEngine";

describe("treatmentPlanStagesEngine: Stage Linkage & Chronology", () => {
	test("Фиксирует хронологию этапов: Этап 1 (2 нед), Этап 2 (16 нед при имплантации), Этап 3 (4 нед с 3D-сканированием)", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 36, state: "Missing" },
		];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const [s1, s2, s3] = stages;

		assert.equal(s1!.estimatedWeeks, 2);
		assert.equal(s2!.estimatedWeeks, 16);
		assert.equal(s3!.estimatedWeeks, 4);
		assert.equal(s3!.items[0]?.code804n, "A02.07.010");
	});
});

describe("treatmentPlanStagesEngine: 3-Option Comparison (Эконом, Стандарт, Оптимальный)", () => {
	test("Генерирует 3 варианта с корректной финансовой и клинической иерархией в DEMO-режиме", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 26, state: "Pulpitis" },
			{ toothNumber: 36, state: "Missing" },
		];

		const tiers = generate3TierPlanComparison(teeth, undefined, 0, 0, { isDemoMode: true });
		assert.equal(tiers.length, 3);

		const [econ, std, opt] = tiers;

		assert.equal(econ?.tierId, "economy");
		assert.equal(std?.tierId, "standard");
		assert.equal(opt?.tierId, "optimum");

		assert.equal(opt?.isRecommended, true);
		assert.equal(std?.isRecommended, false);
		assert.equal(econ?.isRecommended, false);

		assert.ok(econ!.totalRub < std!.totalRub, "Эконом должен быть < Стандарт");
		assert.ok(std!.totalRub < opt!.totalRub, "Стандарт должен быть < Оптимальный");

		assert.equal(econ?.warrantyYears, 1);
		assert.equal(std?.warrantyYears, 2);

		assert.ok(econ!.materialsList.length >= 3);
		assert.ok(std!.materialsList.length >= 3);
		assert.ok(opt!.materialsList.length >= 3);
		assert.ok(opt!.keyAdvantages.length >= 3);

		assert.ok(econ!.monthlyInstallment12Rub > 0);
		assert.ok(std!.monthlyInstallment12Rub > 0);
		assert.ok(opt!.monthlyInstallment12Rub > 0);

		assert.ok(econ!.ndflRefundRub > 0);
		assert.ok(std!.ndflRefundRub > 0);
		assert.ok(opt!.ndflRefundRub > 0);
	});
});
