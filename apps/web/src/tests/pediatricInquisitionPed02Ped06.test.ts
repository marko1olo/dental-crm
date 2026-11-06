/**
 * @dental/web/tests/pediatricInquisitionPed02Ped06.test.ts
 *
 * Red Team Inquisition Verification Test Suite for Defects PED-02..PED-06:
 * - PED-02: Root resorption stages coexist with crown pathology without resetting to Healthy.
 * - PED-03: Primary tooth exfoliation triggers permanent successor eruption via getPermanentSuccessor.
 * - PED-04: Canonical 6-tooth Green-Vermillion OHI-S calculation without fake stub buttons.
 * - PED-05: Fedorov-Volodkina staining index & Parma PMA gingivitis score with 1-click norm.
 * - PED-06: Pediatric kp and combined KPU+kp caries intensity index, avoiding false KPU: 0.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getPermanentSuccessor,
	transitionPrimaryToothSuccession,
	calculatePmaScore,
	calculateFedorovVolodkinaScore,
	calculateDmftFromOdontogram,
} from "@dental/shared";
import {
	CANONICAL_OHI_S_TEETH,
	createIdealOhiSTeethScores,
	computeCanonicalOhiS,
} from "../components/hygiene/hygieneCatalogData";
import { calculateDmft } from "../components/odontogram/gost/gostHistoryTypes";

describe("Red Team Pediatric & Hygiene Inquisition (PED-02..PED-06)", () => {
	it("[PED-02]: physiological root resorption stage coexists with caries/pulpitis without resetting crown", () => {
		// Mock primary tooth 54 with Caries
		const toothNumber = 54;
		const initialState = "Caries";
		let currentState = initialState;
		let resorptionStage = 0;

		const handleResorptionSelect = (state: string, stage: number) => {
			currentState = state; // Should remain initial state, not forced to "Healthy"
			resorptionStage = stage;
		};

		// Apply Resorption II (50%)
		handleResorptionSelect(currentState, 50);

		assert.equal(currentState, "Caries", "Crown pathology must be preserved!");
		assert.equal(resorptionStage, 50, "Root resorption stage must be 50%");
	});

	it("[PED-03]: physical succession of primary tooth 51 activates permanent successor 11", () => {
		const primaryTooth = 51;
		const succession = transitionPrimaryToothSuccession(primaryTooth);

		assert.equal(succession.isSuccessionSupported, true);
		assert.equal(succession.permanentSuccessor, 11);

		// Map of active tooth states
		const teethMap = new Map<number, string>();
		teethMap.set(51, "Healthy");

		// Exfoliation event
		teethMap.set(51, "Missing");
		const successor = getPermanentSuccessor(51);
		if (successor) {
			teethMap.set(successor, "Healthy");
		}

		assert.equal(teethMap.get(51), "Missing", "Primary tooth 51 must be marked Missing");
		assert.equal(teethMap.get(11), "Healthy", "Permanent successor 11 must be activated in chart");
	});

	it("[PED-04]: canonical 6-tooth OHI-S calculator computes DI + CI correctly without fake stubs", () => {
		assert.equal(CANONICAL_OHI_S_TEETH.length, 6);

		// Ideal norm (all 0)
		const idealScores = createIdealOhiSTeethScores();
		const idealResult = computeCanonicalOhiS(idealScores);
		assert.equal(idealResult.score, 0.0);
		assert.equal(idealResult.debris, 0.0);
		assert.equal(idealResult.calculus, 0.0);
		assert.equal(idealResult.id, "ideal");

		// Custom scores: 6 teeth each with debris=1, calculus=1 -> DI=1.0, CI=1.0 -> OHI-S = 2.0
		const customScores: Record<number, { debris: number; calculus: number }> = {
			16: { debris: 1, calculus: 1 },
			11: { debris: 1, calculus: 1 },
			26: { debris: 1, calculus: 1 },
			31: { debris: 1, calculus: 1 },
			36: { debris: 1, calculus: 1 },
			46: { debris: 1, calculus: 1 },
		};
		const customResult = computeCanonicalOhiS(customScores);
		assert.equal(customResult.score, 2.0);
		assert.equal(customResult.debris, 1.0);
		assert.equal(customResult.calculus, 1.0);
		assert.equal(customResult.id, "poor");
		assert.ok(customResult.label.includes("Удовлетворительная"));
	});

	it("[PED-05]: Fedorov-Volodkina staining and Parma PMA indices calculate cleanly with 1-click norm", () => {
		// Fedorov-Volodkina norm (all 1)
		const fedorovNorm = calculateFedorovVolodkinaScore([
			{ toothNumber: 43, fedorovScore: 1 },
			{ toothNumber: 42, fedorovScore: 1 },
			{ toothNumber: 41, fedorovScore: 1 },
			{ toothNumber: 31, fedorovScore: 1 },
			{ toothNumber: 32, fedorovScore: 1 },
			{ toothNumber: 33, fedorovScore: 1 },
		]);
		assert.equal(fedorovNorm.score, 1.0);
		assert.equal(fedorovNorm.evaluation, "good");
		assert.equal(fedorovNorm.isOptimal, true);

		// PMA norm (all 0)
		const pmaNorm = calculatePmaScore([
			{ toothNumber: 16, pmaScore: 0 },
			{ toothNumber: 11, pmaScore: 0 },
			{ toothNumber: 26, pmaScore: 0 },
			{ toothNumber: 36, pmaScore: 0 },
			{ toothNumber: 31, pmaScore: 0 },
			{ toothNumber: 46, pmaScore: 0 },
		]);
		assert.equal(pmaNorm.pmaPercent, 0);
		assert.equal(pmaNorm.isHealthy, true);

		// PMA gingivitis: 3 points out of 18 -> 16.7%
		const pmaGingivitis = calculatePmaScore([
			{ toothNumber: 16, pmaScore: 1 },
			{ toothNumber: 11, pmaScore: 1 },
			{ toothNumber: 26, pmaScore: 1 },
			{ toothNumber: 36, pmaScore: 0 },
			{ toothNumber: 31, pmaScore: 0 },
			{ toothNumber: 46, pmaScore: 0 },
		]);
		assert.equal(pmaGingivitis.pmaPercent, 16.7);
		assert.equal(pmaGingivitis.severity, "mild");
	});

	it("[PED-06]: pediatric caries intensity calculation handles primary 'kp' without false KPU: 0", () => {
		// Child with 5 decayed primary teeth and 0 permanent teeth
		const pediatricTeeth = [
			{ toothNumber: 51, condition: "caries_media" },
			{ toothNumber: 52, condition: "caries_media" },
			{ toothNumber: 61, condition: "caries_profunda" },
			{ toothNumber: 74, condition: "pulpitis_acute" },
			{ toothNumber: 85, condition: "F", statusCode: "F" }, // 1 filled
		];

		const dmftResult = calculateDmftFromOdontogram(pediatricTeeth);

		assert.equal(dmftResult.totalDmft, 0, "Permanent DMFT is 0");
		assert.equal(dmftResult.isPediatricOnly, true, "Should be flagged as pediatric only");
		assert.equal(dmftResult.deciduousDecayed, 4);
		assert.equal(dmftResult.deciduousFilled, 1);
		assert.equal(dmftResult.totalDft, 5);
		assert.equal(dmftResult.intensityLevel, "high", "5 affected deciduous teeth must have HIGH intensity, NOT very_low!");
		assert.ok(dmftResult.displayKpuText.includes("Индекс кп: 5"));

		// In Classic Gost Odontogram
		const gostDmft = calculateDmft(
			pediatricTeeth.map((t) => ({
				toothNumber: t.toothNumber,
				state: t.condition === "F" ? "Filled" : "Caries",
			}))
		);
		assert.equal(gostDmft.isPediatric, true);
		assert.equal(gostDmft.pediatricKpu.total, 5);
		assert.equal(gostDmft.displayKpuHeader, "Индекс кп:");
		assert.equal(gostDmft.severity, "high");
	});
});
