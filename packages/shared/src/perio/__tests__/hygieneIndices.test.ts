import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateCombinedHygieneReport,
	calculateKpiScore,
	calculateOhiSScore,
	calculatePmaScore,
	createDefaultPerioTeeth,
	createHealthyHygieneAssessment,
	deriveHygieneFromPerioTeeth,
	HYGIENE_INDEX_TEETH_CONFIG,
	HYGIENE_INDEX_TEETH_NUMBERS,
} from "../index.js";

describe("Dental Hygiene Indices Engine (OHI-S, PMA, KPI Leus)", () => {
	it("verifies 6 canonical index teeth configuration (16, 11, 26, 36, 31, 46)", () => {
		assert.deepEqual(HYGIENE_INDEX_TEETH_NUMBERS, [16, 11, 26, 36, 31, 46]);
		assert.equal(HYGIENE_INDEX_TEETH_CONFIG.length, 6);

		const tooth16 = HYGIENE_INDEX_TEETH_CONFIG.find((t) => t.toothNumber === 16);
		assert.equal(tooth16?.surfaceAspect, "vestibular");

		const tooth36 = HYGIENE_INDEX_TEETH_CONFIG.find((t) => t.toothNumber === 36);
		assert.equal(tooth36?.surfaceAspect, "oral");

		const tooth46 = HYGIENE_INDEX_TEETH_CONFIG.find((t) => t.toothNumber === 46);
		assert.equal(tooth46?.surfaceAspect, "oral");
	});

	it("calculates healthy OHI-S = 0 (perfect oral hygiene)", () => {
		const healthy = createHealthyHygieneAssessment();
		const result = calculateOhiSScore(healthy);

		assert.equal(result.totalScore, 0);
		assert.equal(result.debrisScore, 0);
		assert.equal(result.calculusScore, 0);
		assert.equal(result.clinicalEvaluation, "excellent");
		assert.equal(result.isOptimal, true);
	});

	it("calculates OHI-S with partial index teeth (1 to 6 teeth)", () => {
		// Only 2 teeth entered: tooth 16 (debris 1, calculus 0), tooth 11 (debris 2, calculus 1)
		const partial = [
			{ toothNumber: 16, debrisScore: 1, calculusScore: 0 },
			{ toothNumber: 11, debrisScore: 2, calculusScore: 1 },
		];
		const result = calculateOhiSScore(partial);

		// avgDebris = (1 + 2) / 2 = 1.5
		// avgCalculus = (0 + 1) / 2 = 0.5
		// total = 2.0 -> "moderate" (1.7 - 2.5)
		assert.equal(result.debrisScore, 1.5);
		assert.equal(result.calculusScore, 0.5);
		assert.equal(result.totalScore, 2);
		assert.equal(result.clinicalEvaluation, "moderate");
		assert.equal(result.assessedTeethCount, 2);
	});

	it("calculates severe OHI-S with high calculus and debris", () => {
		const severe = [
			{ toothNumber: 16, debrisScore: 3, calculusScore: 2 },
			{ toothNumber: 11, debrisScore: 2, calculusScore: 2 },
			{ toothNumber: 26, debrisScore: 3, calculusScore: 3 },
			{ toothNumber: 36, debrisScore: 3, calculusScore: 2 },
			{ toothNumber: 31, debrisScore: 2, calculusScore: 2 },
			{ toothNumber: 46, debrisScore: 3, calculusScore: 3 },
		];
		const result = calculateOhiSScore(severe);
		assert.ok(result.totalScore > 3.0);
		assert.equal(result.clinicalEvaluation, "severe");
	});

	it("calculates Parma PMA index correctly", () => {
		// Healthy: all 0
		const healthy = calculatePmaScore(createHealthyHygieneAssessment());
		assert.equal(healthy.pmaPercent, 0);
		assert.equal(healthy.severity, "intact");
		assert.equal(healthy.isHealthy, true);

		// Mild: 6 teeth, 3 points total out of 18 -> (3 / 18) * 100 = 16.7%
		const mild = calculatePmaScore([
			{ toothNumber: 16, pmaScore: 1 },
			{ toothNumber: 11, pmaScore: 1 },
			{ toothNumber: 26, pmaScore: 1 },
			{ toothNumber: 36, pmaScore: 0 },
			{ toothNumber: 31, pmaScore: 0 },
			{ toothNumber: 46, pmaScore: 0 },
		]);
		assert.equal(mild.pmaPercent, 16.7);
		assert.equal(mild.severity, "mild");
		assert.equal(mild.isHealthy, false);

		// Severe: 6 teeth, all score 3 -> 100%
		const severe = calculatePmaScore([
			{ toothNumber: 16, pmaScore: 3 },
			{ toothNumber: 11, pmaScore: 3 },
			{ toothNumber: 26, pmaScore: 3 },
			{ toothNumber: 36, pmaScore: 3 },
			{ toothNumber: 31, pmaScore: 3 },
			{ toothNumber: 46, pmaScore: 3 },
		]);
		assert.equal(severe.pmaPercent, 100);
		assert.equal(severe.severity, "severe");
	});

	it("calculates Leus KPI index correctly", () => {
		// Healthy: 0.0
		const healthy = calculateKpiScore(createHealthyHygieneAssessment());
		assert.equal(healthy.kpiScore, 0);
		assert.equal(healthy.severity, "healthy");
		assert.equal(healthy.isHealthy, true);

		// Risk: sum = 3 over 6 teeth -> 0.5
		const risk = calculateKpiScore([
			{ toothNumber: 16, kpiScore: 1 },
			{ toothNumber: 11, kpiScore: 1 },
			{ toothNumber: 26, kpiScore: 1 },
			{ toothNumber: 36, kpiScore: 0 },
			{ toothNumber: 31, kpiScore: 0 },
			{ toothNumber: 46, kpiScore: 0 },
		]);
		assert.equal(risk.kpiScore, 0.5);
		assert.equal(risk.severity, "risk");

		// Moderate: sum = 15 over 6 teeth -> 2.5
		const moderate = calculateKpiScore([
			{ toothNumber: 16, kpiScore: 3 },
			{ toothNumber: 11, kpiScore: 2 },
			{ toothNumber: 26, kpiScore: 3 },
			{ toothNumber: 36, kpiScore: 2 },
			{ toothNumber: 31, kpiScore: 2 },
			{ toothNumber: 46, kpiScore: 3 },
		]);
		assert.equal(moderate.kpiScore, 2.5);
		assert.equal(moderate.severity, "moderate");
	});

	it("derives hygiene assessment from full 32-tooth periodontogram", () => {
		const defaultTeeth = createDefaultPerioTeeth(2);
		// Mark tooth 16 with plaque and BOP
		const tooth16 = defaultTeeth.find((t) => t.toothNumber === 16);
		if (tooth16) {
			tooth16.midBuccal = {
				...tooth16.midBuccal,
				plaque: true,
				bleedingOnProbing: true,
			};
		}

		const derived = deriveHygieneFromPerioTeeth(defaultTeeth);
		assert.equal(derived[16]?.debrisScore, 1);
		assert.equal(derived[16]?.pmaScore, 1);
		assert.equal(derived[16]?.kpiScore, 1);

		// Unaffected teeth should remain 0
		assert.equal(derived[26]?.debrisScore, 0);
	});

	it("generates comprehensive 043/u Russian clinical summary", () => {
		const healthy = createHealthyHygieneAssessment();
		const report = calculateCombinedHygieneReport(healthy);

		assert.ok(report.summaryText043.includes("КЛИНИЧЕСКИЕ ИНДЕКСЫ ГИГИЕНЫ И СОСТОЯНИЯ ПАРОДОНТА"));
		assert.ok(report.summaryText043.includes("OHI-S"));
		assert.ok(report.summaryText043.includes("PMA"));
		assert.ok(report.summaryText043.includes("КПИ"));
		assert.ok(report.summaryText043.includes("интактны"));
	});
});
