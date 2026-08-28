import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	ALL_PRIMARY_TEETH,
	isPrimaryTooth,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	PERMANENT_TO_PRIMARY_PREDECESSOR_MAP,
	calculateEruptionTimelineByAge,
	calculateCariogramRisk,
	getPrimaryToothResorptionVisual,
	getToothDentitionType,
	DEFAULT_CARIOGRAM_INPUT,
} from "../pediatricDentitionEngine";

describe("Pediatric Dentition & Cariogram Engine", () => {
	it("correctly identifies all 20 primary teeth", () => {
		assert.equal(ALL_PRIMARY_TEETH.length, 20);
		for (const tooth of ALL_PRIMARY_TEETH) {
			assert.equal(isPrimaryTooth(tooth), true, `Tooth ${tooth} should be primary`);
		}
		// Permanent teeth should return false
		assert.equal(isPrimaryTooth(11), false);
		assert.equal(isPrimaryTooth(16), false);
		assert.equal(isPrimaryTooth(36), false);
		assert.equal(isPrimaryTooth(48), false);
	});

	it("correctly maps primary teeth to permanent successors", () => {
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[51], 11);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[55], 15);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[61], 21);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[71], 31);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[85], 45);

		// Reverse predecessor map
		assert.equal(PERMANENT_TO_PRIMARY_PREDECESSOR_MAP[11], 51);
		assert.equal(PERMANENT_TO_PRIMARY_PREDECESSOR_MAP[45], 85);
	});

	it("calculates physiological eruption timeline across childhood ages", () => {
		// Age 5 (Primary Dentition)
		const age5 = calculateEruptionTimelineByAge(5.0);
		assert.equal(age5.stageCategory, "primary");
		assert.ok(age5.expectedUpperArchTeeth.includes(51));
		assert.equal(age5.expectedUpperArchTeeth.includes(16), false);

		// Age 7 (Early Mixed Dentition)
		const age7 = calculateEruptionTimelineByAge(7.0);
		assert.equal(age7.stageCategory, "early_mixed");
		assert.ok(age7.expectedUpperArchTeeth.includes(16), "Should include first molar 16");
		assert.ok(age7.clinicalAlerts.length > 0);

		// Age 11 (Late Mixed Dentition)
		const age11 = calculateEruptionTimelineByAge(11.0);
		assert.equal(age11.stageCategory, "late_mixed");

		// Age 14 (Permanent Dentition)
		const age14 = calculateEruptionTimelineByAge(14.0);
		assert.equal(age14.stageCategory, "permanent");
		assert.ok(age14.expectedUpperArchTeeth.includes(17));
	});

	it("evaluates root resorption stages accurately", () => {
		const res0 = getPrimaryToothResorptionVisual(51, 0);
		assert.equal(res0.clipHeightPercent, 100);
		assert.equal(res0.isExfoliated, false);

		const res50 = getPrimaryToothResorptionVisual(51, 50);
		assert.equal(res50.clipHeightPercent, 50);
		assert.equal(res50.rootOpacity, 0.65);

		const res100 = getPrimaryToothResorptionVisual(51, 100);
		assert.equal(res100.clipHeightPercent, 0);
		assert.equal(res100.isExfoliated, true);

		// Permanent tooth returns 100% full root
		const perm = getPrimaryToothResorptionVisual(16, 50);
		assert.equal(perm.clipHeightPercent, 100);
	});

	it("computes Cariogram caries risk and sector breakdown per 3-state clinical model", () => {
		// Default low risk
		const result = calculateCariogramRisk(DEFAULT_CARIOGRAM_INPUT);
		assert.equal(result.chanceOfAvoidingCariesPercent, 85);
		assert.equal(result.riskCategory, "low");
		assert.equal(result.preventiveProgram.hygieneRecallIntervalMonths, 6);

		// Moderate-risk profile
		const modRisk = calculateCariogramRisk({ cariesRiskLevel: "moderate" });
		assert.equal(modRisk.chanceOfAvoidingCariesPercent, 55);
		assert.equal(modRisk.riskCategory, "moderate");
		assert.equal(modRisk.preventiveProgram.hygieneRecallIntervalMonths, 4);

		// High-risk profile
		const highRisk = calculateCariogramRisk({ cariesRiskLevel: "high" });
		assert.equal(highRisk.chanceOfAvoidingCariesPercent, 20);
		assert.equal(highRisk.riskCategory, "high");
		assert.equal(highRisk.preventiveProgram.hygieneRecallIntervalMonths, 2);
	});

	it("classifies tooth dentition category properly", () => {
		assert.equal(getToothDentitionType(54), "primary");
		assert.equal(getToothDentitionType(16), "mixed_first_molar");
		assert.equal(getToothDentitionType(11), "permanent");
	});

	it("correctly models physiological root resorption stages (I, II, III) and mobility", () => {
		// Stage I: 1/3 root resorption (clipHeight 75%)
		const stageI = getPrimaryToothResorptionVisual(54, 25);
		assert.equal(stageI.clipHeightPercent, 75);
		assert.equal(stageI.isExfoliated, false);
		assert.match(stageI.descriptionRu, /апикальной трети|25%/i);

		// Stage II: 1/2 root resorption (clipHeight 50%)
		const stageII = getPrimaryToothResorptionVisual(61, 50);
		assert.equal(stageII.clipHeightPercent, 50);
		assert.equal(stageII.isExfoliated, false);
		assert.match(stageII.descriptionRu, /1\/2|50%/i);

		// Stage III: Complete root resorption / crown only (clipHeight 0..25%)
		const stageIII = getPrimaryToothResorptionVisual(71, 75);
		assert.equal(stageIII.clipHeightPercent, 25);
		assert.match(stageIII.descriptionRu, /четверть|75%/i);

		// Exfoliated / 100%
		const exfoliated = getPrimaryToothResorptionVisual(85, 100);
		assert.equal(exfoliated.clipHeightPercent, 0);
		assert.equal(exfoliated.isExfoliated, true);
	});

	it("stress-tests mixed dentition (51–85 + 16/26/36/46) dual routing behavior", () => {
		const mixedArchUpper = [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26];
		const mixedArchLower = [46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36];

		// 1. Check upper arch partitioning
		const permanentUpper = mixedArchUpper.filter((t) => !isPrimaryTooth(t));
		const primaryUpper = mixedArchUpper.filter((t) => isPrimaryTooth(t));
		assert.deepEqual(permanentUpper, [16, 26], "Permanent first molars must be recognized");
		assert.equal(primaryUpper.length, 10, "10 deciduous teeth in upper mixed arch");

		// 2. Check lower arch partitioning
		const permanentLower = mixedArchLower.filter((t) => !isPrimaryTooth(t));
		const primaryLower = mixedArchLower.filter((t) => isPrimaryTooth(t));
		assert.deepEqual(permanentLower, [46, 36], "Permanent lower molars must be recognized");
		assert.equal(primaryLower.length, 10, "10 deciduous teeth in lower mixed arch");

		// 3. Verify that all 20 primary teeth in mixed dentition have valid physiological resorption values
		for (const t of [...primaryUpper, ...primaryLower]) {
			const resI = getPrimaryToothResorptionVisual(t, 25);
			const resII = getPrimaryToothResorptionVisual(t, 50);
			const resIII = getPrimaryToothResorptionVisual(t, 75);
			assert.equal(resI.clipHeightPercent, 75);
			assert.equal(resII.clipHeightPercent, 50);
			assert.equal(resIII.clipHeightPercent, 25);
		}

		// 4. Verify permanent molars do not have resorption
		for (const perm of [16, 26, 36, 46]) {
			const res = getPrimaryToothResorptionVisual(perm, 50);
			assert.equal(res.clipHeightPercent, 100);
			assert.equal(res.isExfoliated, false);
		}
	});
});
