import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	StaffDosimetrySafetyService,
} from "./StaffDosimetrySafetyService.js";

describe("StaffDosimetrySafetyService — Feature #262 Staff Dosimetry & Radiation Safety", () => {
	test("1. Calculates cumulative radiation exposure accurately", () => {
		const dose = StaffDosimetrySafetyService.calculateShotsDose({
			periapicalCount: 50, // 50 * 0.003 = 0.150 mSv
			opgCount: 20, // 20 * 0.02 = 0.400 mSv
			cbctCount: 10, // 10 * 0.05 = 0.500 mSv
		});

		assert.equal(dose, 1.05);
	});

	test("2. Warns on high monthly exposure (>1.5 mSv)", () => {
		const evalWarning = StaffDosimetrySafetyService.evaluateExposureRisk(10.0, 1.8);
		assert.equal(evalWarning.status, "monthly_warning");
		assert.equal(evalWarning.isSuspended, false);
	});

	test("3. Suspends staff exceeding 20 mSv annual limit per SanPiN 2.6.1.1192-03", () => {
		const evalExceeded = StaffDosimetrySafetyService.evaluateExposureRisk(20.5, 0.8);
		assert.equal(evalExceeded.status, "annual_limit_exceeded");
		assert.equal(evalExceeded.isSuspended, true);
	});
});
