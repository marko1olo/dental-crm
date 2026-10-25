import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateCephalometrics,
	CLASS_I_NORMAL_LANDMARKS_PRESET,
	CLASS_II_DISTAL_LANDMARKS_PRESET,
	CLASS_III_MESIAL_LANDMARKS_PRESET,
} from "../cephalometricMath";

describe("Orthodontic TRG 1-Click Clinical Presets Calculation", () => {
	it("instantly calculates Class I diagnosis when CLASS_I_NORMAL_LANDMARKS_PRESET is applied", () => {
		const result = calculateCephalometrics(CLASS_I_NORMAL_LANDMARKS_PRESET);
		assert.equal(result.isComplete, true);
		assert.equal(result.placedCount, 16);
		assert.equal(result.completionPercentage, 100);

		const sna = result.measurements.find((m) => m.id === "SNA");
		const snb = result.measurements.find((m) => m.id === "SNB");
		const anb = result.measurements.find((m) => m.id === "ANB");
		assert.ok(sna && sna.value !== null && sna.value >= 78 && sna.value <= 86);
		assert.ok(snb && snb.value !== null && snb.value >= 76 && snb.value <= 84);
		assert.ok(anb && anb.value !== null && anb.value >= 0 && anb.value <= 4);

		assert.equal(result.diagnosis.skeletalClass, "Class I");
		assert.ok(result.diagnosis.skeletalClassRu.includes("Скелетный класс I"));
	});

	it("instantly calculates Class II diagnosis when CLASS_II_DISTAL_LANDMARKS_PRESET is applied", () => {
		const result = calculateCephalometrics(CLASS_II_DISTAL_LANDMARKS_PRESET);
		assert.equal(result.isComplete, true);
		assert.equal(result.placedCount, 16);

		const anb = result.measurements.find((m) => m.id === "ANB");
		assert.ok(anb && anb.value !== null && anb.value > 4.0);
		assert.equal(anb.status, "increased");
		assert.equal(result.diagnosis.skeletalClass, "Class II");
		assert.ok(result.diagnosis.skeletalClassRu.includes("Скелетный класс II"));
	});

	it("instantly calculates Class III diagnosis when CLASS_III_MESIAL_LANDMARKS_PRESET is applied", () => {
		const result = calculateCephalometrics(CLASS_III_MESIAL_LANDMARKS_PRESET);
		assert.equal(result.isComplete, true);
		assert.equal(result.placedCount, 16);

		const anb = result.measurements.find((m) => m.id === "ANB");
		assert.ok(anb && anb.value !== null && anb.value < 0.0);
		assert.equal(anb.status, "decreased");
		assert.equal(result.diagnosis.skeletalClass, "Class III");
		assert.ok(result.diagnosis.skeletalClassRu.includes("Скелетный класс III"));
	});
});
