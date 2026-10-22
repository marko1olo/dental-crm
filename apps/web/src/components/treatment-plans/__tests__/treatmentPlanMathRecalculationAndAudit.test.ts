/**
 * treatmentPlanMathRecalculationAndAudit.test.ts — аудит финансовой целостности и пересчет тарифов.
 * (Мандат 8b: строго <= 120 строк).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Kopecks } from "@dental/shared";
import {
	calculateChairsideInstallments,
	recalculateTierTotals,
	validatePlanFinancialIntegrity,
} from "../treatmentPlanMath";
import type { TreatmentPlanStage, TreatmentPlanTier } from "../types";
import { sampleBaseTier } from "./helpers/mathTestHelpers";

describe("treatmentPlanMath — Пересчет тарифов и финансовый аудит", () => {
	it("detects high-cost codes and updates complete tier metrics", () => {
		const stagesWithImplant: TreatmentPlanStage[] = [
			{
				stageNumber: 1,
				stageKind: "stage_2_surgery",
				title: "Имплантология",
				subtitle: "Установка дентального импланта",
				clinicalGoal: "Остеоинтеграция",
				order804nCodes: ["A16.07.054.001"],
				totalRub: 80000,
				totalKopecks: 8000000 as Kopecks,
				estimatedWeeks: 3,
				estimatedVisits: 2,
				items: [
					{
						id: "it-impl",
						name: "Внутрикостная дентальная имплантация",
						code804n: "A16.07.054.001",
						category: "Хирургия",
						stageKind: "stage_2_surgery",
						unitPriceRub: 80000,
						priceRub: 80000,
						discountRub: 0,
						quantity: 1,
					},
				],
			},
		];

		const updated = recalculateTierTotals(sampleBaseTier, stagesWithImplant);
		assert.equal(updated.totalRub, 80000);
		assert.equal(updated.ndflDetails.code, "02");
		assert.equal(updated.ndflRefundRub, 10400);
		assert.equal(updated.monthlyInstallment12Rub, Math.round(80000 / 12));
		assert.ok(updated.stagedSchedule);
	});

	it("validates financial integrity and detects drift", () => {
		const validTier: TreatmentPlanTier = {
			...sampleBaseTier,
			totalRub: 50000,
			totalKopecks: 5000000 as Kopecks,
			itemsCount: 1,
			durationWeeks: 1,
			durationVisits: 1,
			stages: [
				{
					stageNumber: 1,
					stageKind: "stage_1_therapy",
					title: "Терапия",
					subtitle: "Пломбирование",
					clinicalGoal: "Санация",
					order804nCodes: ["A16.07.002"],
					totalRub: 50000,
					totalKopecks: 5000000 as Kopecks,
					estimatedWeeks: 1,
					estimatedVisits: 1,
					items: [
						{
							id: "it1",
							name: "Пломба",
							code804n: "A16.07.002",
							category: "Терапия",
							stageKind: "stage_1_therapy",
							priceRub: 50000,
							unitPriceRub: 50000,
							discountRub: 0,
							quantity: 1,
						},
					],
				},
			],
			installments: calculateChairsideInstallments(5000000 as Kopecks),
		};

		const validAudit = validatePlanFinancialIntegrity(validTier);
		assert.equal(validAudit.isValid, true);
		assert.equal(validAudit.kopecksDrift, 0);
		assert.equal(validAudit.errors.length, 0);

		const corruptedTier: TreatmentPlanTier = {
			...validTier,
			totalKopecks: 4900000 as Kopecks,
		};
		const invalidAudit = validatePlanFinancialIntegrity(corruptedTier);
		assert.equal(invalidAudit.isValid, false);
		assert.equal(invalidAudit.kopecksDrift, 100000);
		assert.ok(invalidAudit.errors.length > 0);
	});
});
