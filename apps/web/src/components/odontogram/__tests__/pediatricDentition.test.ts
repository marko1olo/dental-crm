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
	generateCariogramPieChartSlices,
	getToothDentitionType,
	DEFAULT_CARIOGRAM_INPUT,
} from "../pediatricDentitionEngine.js";

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

	it("computes Cariogram caries risk and sector breakdown per Douglas Bratthall model", () => {
		// Default balanced input
		const result = calculateCariogramRisk(DEFAULT_CARIOGRAM_INPUT);
		assert.ok(result.chanceOfAvoidingCariesPercent >= 1 && result.chanceOfAvoidingCariesPercent <= 99);
		assert.ok(["very_low", "low", "moderate", "high", "very_high"].includes(result.riskCategory));
		assert.ok(result.preventiveProgram.hygieneRecallIntervalMonths > 0);

		// Low-risk profile
		const lowRisk = calculateCariogramRisk({
			dietContents: 0,
			dietFrequency: 0,
			plaqueAmount: 0,
			streptococcusMutans: 0,
			fluorideProgram: 0,
			salivaSecretionRate: 0,
			salivaBufferCapacity: 0,
			pastCariesExperience: 0,
			systemicDiseases: 0,
			clinicalJudgment: 0,
		});
		assert.ok(lowRisk.chanceOfAvoidingCariesPercent >= 80, `Expected >= 80%, got ${lowRisk.chanceOfAvoidingCariesPercent}%`);
		assert.equal(lowRisk.riskCategory, "very_low");

		// High-risk profile
		const highRisk = calculateCariogramRisk({
			dietContents: 3,
			dietFrequency: 3,
			plaqueAmount: 3,
			streptococcusMutans: 3,
			fluorideProgram: 3,
			salivaSecretionRate: 3,
			salivaBufferCapacity: 2,
			pastCariesExperience: 3,
			systemicDiseases: 2,
			clinicalJudgment: 3,
		});
		assert.ok(highRisk.chanceOfAvoidingCariesPercent <= 30, `Expected <= 30%, got ${highRisk.chanceOfAvoidingCariesPercent}%`);
		assert.ok(highRisk.riskCategory === "high" || highRisk.riskCategory === "very_high");
	});

	it("generates SVG arc path slices for Cariogram pie visualization", () => {
		const risk = calculateCariogramRisk(DEFAULT_CARIOGRAM_INPUT);
		const slices = generateCariogramPieChartSlices(risk.sectors, 100, 0, { x: 100, y: 100 });
		assert.ok(slices.length >= 2, "Should generate multiple non-zero sector slices");
		for (const slice of slices) {
			assert.ok(slice.pathData.startsWith("M"), `Slice ${slice.nameRu} path must start with M`);
			assert.ok(slice.fillColor.length > 0);
		}
	});

	it("classifies tooth dentition category properly", () => {
		assert.equal(getToothDentitionType(54), "primary");
		assert.equal(getToothDentitionType(16), "mixed_first_molar");
		assert.equal(getToothDentitionType(11), "permanent");
	});
});
