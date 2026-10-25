/**
 * treatmentPlanCopilotAutopilotInquisition.test.ts — Red Team Inquisition Suite
 * Verifying Critical Clinical Invariants and Autopilot Gates for Treatment Plan Copilot:
 * 1. Quantity preservation and exact kopeck math in clinical scenarios (Economy, Optimum, Premium, Budget Optimize).
 * 2. Anatomical boundary checks for bridge replacement (Kennedy Class I free-end defect immunity).
 * 3. High-cost implant/surgery tax deduction classification (Code 02 vs Code 01) in tier comparison.
 * 4. Periodontal hygiene filtering: missing teeth and hopeless roots immunity from SRP and curettage.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyEconomyScenarioToPlan,
	applyOptimumScenarioToPlan,
	applyPremiumScenarioToPlan,
	optimizePlanForBudget,
	replaceImplantationWithBridge,
	getAdjacentFdiTeeth,
} from "../services/ai/treatmentPlanCopilot";
import type { TreatmentPlanStage } from "../components/treatment-plans/types";
import type { ToothData } from "../components/odontogram/ToothChart";
import { buildPeriodontalAndHygieneItems } from "../components/treatment-plans/autoGenerator/autoGenPeriodontal";
import { assembleTierFromPreset } from "../components/treatment-plans/tierComparison/makeTierHelper";
import { ECONOMY_TIER_META } from "../components/treatment-plans/tierComparison/tierMetadataPresets";

describe("Treatment Plan Copilot & Autopilot Red Team Inquisition", () => {
	it("1. Preserves item quantity and calculates exact sums without losing units across scenarios", () => {
		const stagesWithMultiQuantity: TreatmentPlanStage[] = [
			{
				stageNumber: 1,
				title: "Терапия",
				subtitle: "",
				clinicalGoal: "Санация",
				stageKind: "stage_1_therapy",
				estimatedWeeks: 2,
				estimatedVisits: 2,
				totalRub: 20000,
				totalKopecks: 2000000,
				order804nCodes: ["A16.07.002.001"],
				serviceCatalogCodes: ["A16.07.002.001"],
				items: [
					{
						id: "c1",
						toothNumber: 14,
						code804n: "A16.07.002.001",
						name: "Пломбирование 2 зубов светоотверждаемым материалом",
						category: "Терапия",
						priceRub: 20000,
						unitPriceRub: 10000,
						discountRub: 0,
						quantity: 2,
						phase: 1,
						stageKind: "stage_1_therapy",
					},
				],
			},
			{
				stageNumber: 2,
				title: "Хирургия",
				subtitle: "",
				clinicalGoal: "Имплантация",
				stageKind: "stage_2_surgery",
				estimatedWeeks: 8,
				estimatedVisits: 2,
				totalRub: 110000,
				totalKopecks: 11000000,
				order804nCodes: ["A16.07.054.001"],
				serviceCatalogCodes: ["A16.07.054.001"],
				items: [
					{
						id: "imp1",
						toothNumber: 36,
						code804n: "A16.07.054.001",
						name: "Дентальная имплантация (2 единицы)",
						category: "Хирургия",
						priceRub: 110000,
						unitPriceRub: 55000,
						discountRub: 0,
						quantity: 2,
						phase: 2,
						stageKind: "stage_2_surgery",
					},
				],
			},
			{
				stageNumber: 3,
				title: "Ортопедия",
				subtitle: "",
				clinicalGoal: "Протезирование",
				stageKind: "stage_3_orthopedics",
				estimatedWeeks: 4,
				estimatedVisits: 2,
				totalRub: 90000,
				totalKopecks: 9000000,
				order804nCodes: ["A16.07.004.001"],
				serviceCatalogCodes: ["A16.07.004.001"],
				items: [
					{
						id: "cr1",
						toothNumber: 11,
						code804n: "A16.07.004.001",
						name: "Коронка циркониевая (3 единицы)",
						category: "Ортопедия",
						priceRub: 90000,
						unitPriceRub: 30000,
						discountRub: 0,
						quantity: 3,
						phase: 3,
						stageKind: "stage_3_orthopedics",
					},
				],
			},
		];

		// 1. Budget Optimize: 3 crowns * 16 000 = 48 000, 2 implants * 32 000 = 64 000
		const budgetRes = optimizePlanForBudget(stagesWithMultiQuantity, 150000);
		assert.equal(budgetRes.success, true);
		const optSurg = budgetRes.stages[1]?.items[0];
		assert.equal(optSurg?.quantity, 2);
		assert.equal(optSurg?.unitPriceRub, 32000);
		assert.equal(optSurg?.priceRub, 64000, "2 implants in budget optimize must equal 64 000 ₽, not 32 000 ₽!");

		const optOrtho = budgetRes.stages[2]?.items[0];
		assert.equal(optOrtho?.quantity, 3);
		assert.equal(optOrtho?.unitPriceRub, 16000);
		assert.equal(optOrtho?.priceRub, 48000, "3 crowns in budget optimize must equal 48 000 ₽, not 16 000 ₽!");

		// 2. Economy Scenario: 2 therapy * 4500 = 9000, 2 implants * 32000 = 64000, 3 crowns * 16000 = 48000
		const econRes = applyEconomyScenarioToPlan(stagesWithMultiQuantity);
		assert.equal(econRes.stages[0]?.items[0]?.priceRub, 9000);
		assert.equal(econRes.stages[1]?.items[0]?.priceRub, 64000);
		assert.equal(econRes.stages[2]?.items[0]?.priceRub, 48000);

		// 3. Optimum Scenario: 2 therapy * 7500 = 15000, 2 implants * 38000 = 76000, 3 crowns * 26000 = 78000
		const optRes = applyOptimumScenarioToPlan(stagesWithMultiQuantity);
		assert.equal(optRes.stages[0]?.items[0]?.priceRub, 15000);
		assert.equal(optRes.stages[1]?.items[0]?.priceRub, 76000);
		assert.equal(optRes.stages[2]?.items[0]?.priceRub, 78000);

		// 4. Premium Scenario: 2 therapy * 12000 = 24000, 2 implants * 65000 = 130000, 3 crowns * 45000 = 135000
		const premRes = applyPremiumScenarioToPlan(stagesWithMultiQuantity);
		assert.equal(premRes.stages[0]?.items[0]?.priceRub, 24000);
		assert.equal(premRes.stages[1]?.items[0]?.priceRub, 130000);
		assert.equal(premRes.stages[2]?.items[0]?.priceRub, 135000);
	});

	it("2. Blocks bridge replacement on free-end terminal defects without distal abutments", () => {
		const stagesWithWisdomToothImplant: TreatmentPlanStage[] = [
			{
				stageNumber: 2,
				title: "Хирургия",
				subtitle: "",
				clinicalGoal: "Имплантация",
				stageKind: "stage_2_surgery",
				estimatedWeeks: 8,
				estimatedVisits: 1,
				totalRub: 50000,
				totalKopecks: 5000000,
				order804nCodes: ["A16.07.054.001"],
				serviceCatalogCodes: ["A16.07.054.001"],
				items: [
					{
						id: "imp-38",
						toothNumber: 38,
						code804n: "A16.07.054.001",
						name: "Имплантация в области зуба 38",
						category: "Хирургия",
						priceRub: 50000,
						unitPriceRub: 50000,
						discountRub: 0,
						quantity: 1,
						phase: 2,
						stageKind: "stage_2_surgery",
					},
				],
			},
		];

		const res = replaceImplantationWithBridge(stagesWithWisdomToothImplant, { replaceToothNumbers: [38] });
		assert.equal(res.success, false);
		assert.ok(res.explanation.includes("Концевой дефект"), "Must reject bridge replacement for tooth 38 due to missing distal abutment");

		const adj = getAdjacentFdiTeeth(38);
		assert.equal(adj.mesial, 37);
		assert.equal(adj.distal, 37); // дистальный сосед зажат на 37 — конца ряда, опоры дистальнее нет
	});

	it("3. Correctly identifies Code 02 high-cost services with wildcards in tier comparison", () => {
		const mockStages: [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] = [
			{
				stageNumber: 1,
				title: "Терапия",
				subtitle: "",
				clinicalGoal: "Терапия",
				stageKind: "stage_1_therapy",
				estimatedWeeks: 1,
				estimatedVisits: 1,
				totalRub: 10000,
				totalKopecks: 1000000,
				order804nCodes: ["A16.07.002.001"],
				serviceCatalogCodes: ["A16.07.002.001"],
				items: [
					{
						id: "t1",
						toothNumber: 11,
						code804n: "A16.07.002.001",
						name: "Пломба",
						category: "Терапия",
						priceRub: 10000,
						unitPriceRub: 10000,
						discountRub: 0,
						quantity: 1,
						phase: 1,
						stageKind: "stage_1_therapy",
					},
				],
			},
			{
				stageNumber: 2,
				title: "Хирургия",
				subtitle: "",
				clinicalGoal: "Имплантация",
				stageKind: "stage_2_surgery",
				estimatedWeeks: 12,
				estimatedVisits: 2,
				totalRub: 200000,
				totalKopecks: 20000000,
				order804nCodes: ["A16.07.054"],
				serviceCatalogCodes: ["A16.07.054"],
				items: [
					{
						id: "imp-generic",
						toothNumber: 16,
						code804n: "A16.07.054", // Generic code without .001
						name: "Внутрикостная дентальная имплантация",
						category: "Хирургия",
						priceRub: 200000,
						unitPriceRub: 200000,
						discountRub: 0,
						quantity: 1,
						phase: 2,
						stageKind: "stage_2_surgery",
					},
				],
			},
			{
				stageNumber: 3,
				title: "Ортопедия",
				subtitle: "",
				clinicalGoal: "Ортопедия",
				stageKind: "stage_3_orthopedics",
				estimatedWeeks: 4,
				estimatedVisits: 2,
				totalRub: 50000,
				totalKopecks: 5000000,
				order804nCodes: ["A16.07.004"],
				serviceCatalogCodes: ["A16.07.004"],
				items: [
					{
						id: "cr1",
						toothNumber: 16,
						code804n: "A16.07.004",
						name: "Коронка",
						category: "Ортопедия",
						priceRub: 50000,
						unitPriceRub: 50000,
						discountRub: 0,
						quantity: 1,
						phase: 3,
						stageKind: "stage_3_orthopedics",
					},
				],
			},
		];

		const tier = assembleTierFromPreset("economy", ECONOMY_TIER_META, mockStages);
		// Total: 260 000 ₽. With high-cost Code 02 (200 000 ₽ implant), refund is unlimited:
		// Code 02: 200k * 0.13 = 26 000 ₽. Code 01: 60k * 0.13 = 7 800 ₽. Total = 33 800 ₽.
		// If isHighCost failed, it would cap total base at 150 000 ₽ (max refund 19 500 ₽).
		assert.ok(tier.ndflRefundRub > 19500, `Expected refund > 19 500 ₽ for high-cost implant plan, got ${tier.ndflRefundRub} ₽`);
		assert.equal(tier.ndflRefundRub, 33800);
	});

	it("4. Excludes missing teeth and roots to extract from periodontal scaling (SRP) and curettage", () => {
		const teethWithMissingAndRoot: ToothData[] = [
			{ toothNumber: 16, state: "Missing", boneLossLevel: 3, mobility: 2 },
			{ toothNumber: 26, state: "Root", boneLossLevel: 3, mobility: 2 },
			{ toothNumber: 36, state: "Extracted", boneLossLevel: 2, mobility: 0 },
			{ toothNumber: 46, state: "Healthy", boneLossLevel: 2, mobility: 2 },
		];

		const perio = buildPeriodontalAndHygieneItems(teethWithMissingAndRoot, undefined, 0, false);
		const perioTeeth = perio.stage1PerioItems.map((i) => i.toothNumber).filter(Boolean);

		assert.ok(!perioTeeth.includes(16), "Missing tooth 16 must NOT have periodontal procedures");
		assert.ok(!perioTeeth.includes(26), "Root 26 scheduled for extraction must NOT have periodontal SRP");
		assert.ok(!perioTeeth.includes(36), "Extracted tooth 36 must NOT have periodontal SRP");
		assert.ok(perioTeeth.includes(46), "Healthy tooth 46 with pathology MUST have SRP");
	});
});
