/**
 * treatmentPlanCopilotScenariosAndPresentation.test.ts — AI валидация, 3 сценария и презентация.
 * (Мандат 8b: строго <= 120 строк).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	applyCopilotCommandToPlan,
	requestTreatmentPlanAiValidationAndComment,
	applyEconomyScenarioToPlan,
	applyOptimumScenarioToPlan,
	applyPremiumScenarioToPlan,
	buildChairsidePatientCasePresentation,
} from "../../../services/ai/treatmentPlanCopilot";
import { generateTreatmentPlanStages } from "../treatmentPlanStagesEngine";
import type { TreatmentPlanStage } from "../types";
import { sampleItemPriced } from "./helpers/copilotTestHelpers";

describe("AI Copilot Scenarios & Chairside Presentation", () => {
	const initialStages = generateTreatmentPlanStages([
		{ id: 16, toothNumber: 16, state: "Caries" } as any,
		{ id: 36, toothNumber: 36, state: "Missing" } as any,
	]);

	it("1. requestTreatmentPlanAiValidationAndComment returns validation and commentary", async () => {
		const stages = generateTreatmentPlanStages([{ toothNumber: 16, state: "Pulpitis", mobility: 0 }], undefined, 0, { isDemoMode: true });
		const aiResult = await requestTreatmentPlanAiValidationAndComment(stages, {
			patientContext: { patientName: "Иванов И.И." },
			targetBudgetRub: 45000,
		});

		assert.ok(aiResult.clinicalValidation);
		assert.ok(aiResult.chairsideCommentary);
		assert.ok(aiResult.financialArgumentation);
		assert.ok(aiResult.chairsideCommentary.urgencyArgument.length > 0);
		assert.ok(aiResult.financialArgumentation.ndflDeduction.totalRefundRub > 0);
	});

	it("2. applyEconomyScenarioToPlan, Optimum and Premium apply correct integer rubles", () => {
		const econ = applyEconomyScenarioToPlan(initialStages);
		assert.ok(econ.success);
		assert.equal(econ.commandType, "tier_economy");
		assert.equal(Number.isInteger(econ.newTotalRub), true);

		const opt = applyOptimumScenarioToPlan(initialStages);
		assert.ok(opt.success);
		assert.equal(opt.commandType, "tier_optimum");
		assert.equal(Number.isInteger(opt.newTotalRub), true);

		const prem = applyPremiumScenarioToPlan(initialStages);
		assert.ok(prem.success);
		assert.equal(prem.commandType, "tier_premium");
		assert.equal(Number.isInteger(prem.newTotalRub), true);
	});

	it("3. applyCopilotCommandToPlan dispatches 3 clinical scenario commands", () => {
		assert.equal(applyCopilotCommandToPlan(initialStages, "tier_economy").commandType, "tier_economy");
		assert.equal(applyCopilotCommandToPlan(initialStages, "Перейти на сценарий Оптимум").commandType, "tier_optimum");
		assert.equal(applyCopilotCommandToPlan(initialStages, "Включить премиум").commandType, "tier_premium");
	});

	it("4. buildChairsidePatientCasePresentation filters consumables while preserving BOM", () => {
		const stageWithConsumables: TreatmentPlanStage = {
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Этап 1: Терапия",
			subtitle: "Санация",
			clinicalGoal: "Лечение кариеса",
			items: [
				sampleItemPriced,
				{
					id: "consumable-saliva-01",
					code804n: "B01.003.004",
					name: "Слюноотсос одноразовый стоматологический",
					category: "Расходные материалы",
					priceRub: 50,
					unitPriceRub: 50,
					discountRub: 0,
					quantity: 2,
					phase: 1,
					stageKind: "stage_1_therapy",
				},
			],
			totalRub: 4500 + 100,
			totalKopecks: 460000 as any,
			estimatedVisits: 1,
			estimatedWeeks: 1,
			order804nCodes: ["A16.07.002.001"],
		};

		const presentation = buildChairsidePatientCasePresentation([stageWithConsumables]);
		const slide2Summary = presentation.slides.roadmap.stages[0]?.itemsSummaryRu || [];
		assert.ok(slide2Summary.some((txt) => txt.includes("Лечение кариеса эмали")));
		assert.equal(slide2Summary.some((txt) => /слюноотсос|валик/i.test(txt)), false);
		assert.equal(stageWithConsumables.items.length, 2);
	});
});
