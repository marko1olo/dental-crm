import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	CadCamMarginLineVerifierService,
	type PreparationData,
} from "./CadCamMarginLineVerifierService.js";

describe("CadCamMarginLineVerifierService — Feature #242 CAD/CAM Margin & Preparation Verifier", () => {
	test("1. Validates ideal zirconia crown preparation", () => {
		const idealZirconia: PreparationData = {
			radialCementGapMicrons: 40,
			occlusalCementGapMicrons: 60,
			shoulderDepthMm: 0.8,
			taperAngleDegrees: 8,
			hasUndercuts: false,
			material: "zirconia",
		};

		const report = CadCamMarginLineVerifierService.verifyPreparation(idealZirconia);
		assert.equal(report.isValid, true);
		assert.equal(report.errors.length, 0);
		assert.equal(report.warnings.length, 0);
	});

	test("2. Rejects preparation with undercuts and inadequate shoulder depth", () => {
		const flawedPrep: PreparationData = {
			radialCementGapMicrons: 20, // Too tight (< 30)
			occlusalCementGapMicrons: 80, // Too loose (> 70)
			shoulderDepthMm: 0.3, // Too shallow (< 0.6)
			taperAngleDegrees: 15, // Warning (> 10)
			hasUndercuts: true, // Fatal error
			material: "zirconia",
		};

		const report = CadCamMarginLineVerifierService.verifyPreparation(flawedPrep);
		assert.equal(report.isValid, false);
		assert.equal(report.errors.length, 4);
		assert.equal(report.warnings.length, 1);
	});
});