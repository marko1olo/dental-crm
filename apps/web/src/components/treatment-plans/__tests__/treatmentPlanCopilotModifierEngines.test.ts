/**
 * treatmentPlanCopilotModifierEngines.test.ts — тестирование алгоритмов модификации сметы ИИ Copilot.
 * (Мандат 8b: строго <= 120 строк).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	optimizePlanForBudget,
	replaceImplantationWithBridge,
	getAdjacentFdiTeeth,
	applyCopilotCommandToPlan,
	recalculateAnesthesiaAndIsolation,
} from "../../../services/ai/treatmentPlanCopilot";
import { generateTreatmentPlanStages } from "../treatmentPlanStagesEngine";
import type { ToothData } from "../../odontogram/ToothChart";

describe("AI Copilot Modifier Engines (treatmentPlanCopilot.ts)", () => {
	const sampleTeeth: ToothData[] = [
		{ id: 16, toothNumber: 16, state: "Caries" } as any,
		{ id: 36, toothNumber: 36, state: "Missing" } as any,
		{ id: 46, toothNumber: 46, state: "Pulpitis" } as any,
	];

	const initialStages = generateTreatmentPlanStages(sampleTeeth);

	it("1. optimizePlanForBudget parses numbers with spaces and optimizes total sum", () => {
		const initialTotal = initialStages.reduce((acc, s) => acc + s.totalRub, 0);
		const result = optimizePlanForBudget(initialStages, 60000);

		assert.ok(result.success);
		assert.equal(result.commandType, "budget_optimize");
		assert.ok(result.stages.length >= 1);
		assert.ok(result.newTotalRub <= initialTotal);
		assert.ok(result.explanation.includes("успешно оптимизирован") || result.explanation.includes("укладывается"));

		const nlpResult = applyCopilotCommandToPlan(initialStages, "Оптимизировать смету под 100 000 руб");
		assert.equal(nlpResult.commandType, "budget_optimize");
		assert.ok(nlpResult.explanation.includes("100 000 ₽") || nlpResult.explanation.includes("100 000 ₽") || nlpResult.explanation.includes("100000"));
	});

	it("2. replaceImplantationWithBridge handles single tooth and tooth ranges with valid FDI adjacency", () => {
		assert.equal(getAdjacentFdiTeeth(11).mesial, 21);
		assert.equal(getAdjacentFdiTeeth(11).distal, 12);
		assert.equal(getAdjacentFdiTeeth(41).mesial, 31);
		assert.equal(getAdjacentFdiTeeth(41).distal, 42);
		assert.equal(getAdjacentFdiTeeth(36).mesial, 35);
		assert.equal(getAdjacentFdiTeeth(36).distal, 37);

		const resultSingle = replaceImplantationWithBridge(initialStages, { replaceToothNumbers: [36] });
		assert.ok(resultSingle.success);
		assert.equal(resultSingle.commandType, "implant_to_bridge");
		const stage3Single = resultSingle.stages.find((s) => s.stageNumber === 3);
		assert.ok(stage3Single?.items.some((it) => it.name.includes("35-36-37")));

		const resultRange = applyCopilotCommandToPlan(initialStages, "Заменить импланты 34-36 на мост");
		assert.equal(resultRange.commandType, "implant_to_bridge");
		const stage3Range = resultRange.stages.find((s) => s.stageNumber === 3);
		assert.ok(stage3Range?.items.some((it) => it.name.includes("33-34-35-36-37") || it.name.includes("единиц")));
	});

	it("3. addAllOn4UpperJaw and addAllOn4LowerJaw add total rehabilitation protocols", () => {
		const resUpper = applyCopilotCommandToPlan(initialStages, "Добавить All-on-4 на верхнюю челюсть");
		assert.equal(resUpper.commandType, "all_on_4_upper");
		const stage2Upper = resUpper.stages.find((s) => s.stageNumber === 2);
		assert.ok(stage2Upper?.items.some((it) => it.quantity === 4 && it.code804n === "A16.07.054.001"));
		assert.ok(resUpper.explanation.includes("верхней челюсти"));

		const resLower = applyCopilotCommandToPlan(initialStages, "Добавить All-on-4 на нижнюю челюсть");
		assert.equal(resLower.commandType, "all_on_4_lower");
		const stage2Lower = resLower.stages.find((s) => s.stageNumber === 2);
		assert.ok(stage2Lower?.items.some((it) => it.quantity === 4 && it.code804n === "A16.07.054.001"));
		assert.ok(resLower.explanation.includes("нижней челюсти"));
	});

	it("4. addBoneGraftingBioOss and recalculateAnesthesiaAndIsolation audits procedures", () => {
		const resGraft = applyCopilotCommandToPlan(initialStages, "Включить костную пластику Bio-Oss");
		assert.equal(resGraft.commandType, "bone_graft_bio_oss");
		const stage2 = resGraft.stages.find((s) => s.stageNumber === 2);
		assert.ok(stage2?.items.some((it) => it.code804n === "A16.07.041" && it.name.includes("Bio-Oss")));

		const resultAnesth = recalculateAnesthesiaAndIsolation(initialStages);
		assert.ok(resultAnesth.success);
		assert.equal(resultAnesth.commandType, "recalculate_anesthesia_isolation");
		resultAnesth.stages.forEach((st) => {
			if (st.items.length > 0) {
				assert.ok(st.items.some((it) => it.code804n === "A11.07.012" || /анестези/i.test(it.name)));
			}
		});
	});
});
