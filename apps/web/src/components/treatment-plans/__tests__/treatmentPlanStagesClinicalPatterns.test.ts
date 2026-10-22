/**
 * treatmentPlanStagesClinicalPatterns.test.ts — Тестирование клинического паттерн-матчинга:
 * единичные имплантаты, мосты на 2 имплантах при 3 дефектах, All-on-4 при тотальной адентии,
 * эндодонтия моляров и детская стоматология.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { ToothData } from "../../odontogram/ToothChart";
import { generateTreatmentPlanStages } from "../treatmentPlanStagesEngine";

describe("treatmentPlanStagesEngine: Clinical Pattern Matching", () => {
	test("Паттерн 1 отсутствующий зуб: генерирует 1 имплантат в Этапе 2 и 1 коронку на имплантате в Этапе 3", () => {
		const teeth: ToothData[] = [{ toothNumber: 36, state: "Missing" }];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const [, stage2, stage3] = stages;

		assert.ok(stage2!.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.054.001"));
		assert.ok(stage2!.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.054"));
		assert.ok(stage3!.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.006"));
	});

	test("Паттерн 3 отсутствующих зуба подряд (34, 35, 36): генерирует 2 имплантата на краях (34, 36) и мост 3 ед.", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 34, state: "Missing" },
			{ toothNumber: 35, state: "Missing" },
			{ toothNumber: 36, state: "Missing" },
		];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const [, stage2, stage3] = stages;

		assert.ok(stage2!.items.some((i) => i.toothNumber === 34 && i.code804n === "A16.07.054.001"));
		assert.ok(stage2!.items.some((i) => i.toothNumber === 36 && i.code804n === "A16.07.054.001"));
		assert.equal(stage2!.items.some((i) => i.toothNumber === 35 && i.code804n === "A16.07.054.001"), false);

		const bridgeItem = stage3!.items.find((i) => i.code804n === "A16.07.005");
		assert.ok(bridgeItem);
		assert.deepEqual(bridgeItem.relatedToothNumbers, [34, 35, 36]);
	});

	test("Паттерн тотальной адентии (> 10 отсутствующих зубов): генерирует протокол All-on-4 / All-on-6", () => {
		const teeth: ToothData[] = [
			17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
		].map((t) => ({ toothNumber: t, state: "Missing" as const }));

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const [, stage2, stage3] = stages;

		assert.ok(stage2!.items.some((i) => i.code804n === "A16.07.054"));
		assert.ok(stage2!.items.some((i) => i.code804n === "A16.07.054.001"));
		const multiUnit = stage2!.items.find((i) => i.code804n === "A16.07.006.002");
		assert.ok(multiUnit);
		assert.equal(multiUnit.quantity, 4);

		assert.ok(stage3!.items.some((i) => i.code804n === "A16.07.035"));
	});

	test("Паттерн депульпированных моляров и премоляров: коффердам, обработка каналов, обтурация, билдап и коронка", () => {
		const teeth: ToothData[] = [{ toothNumber: 16, state: "Pulpitis" }];

		const stages = generateTreatmentPlanStages(teeth, undefined, 0, { isDemoMode: true });
		const [stage1, , stage3] = stages;

		assert.ok(stage1!.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.093"));
		assert.ok(stage1!.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.030.004"));
		assert.ok(stage1!.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.008.004"));
		assert.ok(stage1!.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.003.001"));
		assert.ok(stage3!.items.some((i) => i.toothNumber === 16 && i.code804n === "A16.07.004.001"));
	});

	test("Детская стоматология: кариес, пульпотомия с коронкой SSC и удаление молочного зуба", () => {
		const pedTeeth: ToothData[] = [
			{ toothNumber: 54, state: "Caries" },
			{ toothNumber: 65, state: "Pulpitis" },
			{ toothNumber: 74, state: "Periodontitis" },
		];

		const stages = generateTreatmentPlanStages(pedTeeth, undefined, 0, { isDemoMode: true });
		const [s1, s2, s3] = stages;

		assert.ok(s1!.items.some((i) => i.toothNumber === 54 && i.category === "Детская терапия"));
		assert.ok(s1!.items.some((i) => i.toothNumber === 65 && i.code804n === "A16.07.008.001"));
		assert.ok(s3!.items.some((i) => i.toothNumber === 65 && i.code804n === "A16.07.004.003"));
		assert.ok(s2!.items.some((i) => i.toothNumber === 74 && i.code804n === "A16.07.001"));
		assert.equal(s2!.items.some((i) => i.toothNumber === 74 && i.code804n === "A16.07.054.001"), false);
	});
});
