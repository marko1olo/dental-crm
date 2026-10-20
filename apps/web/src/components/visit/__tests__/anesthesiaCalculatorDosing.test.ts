/**
 * anesthesiaCalculatorDosing.test.ts — Weight-free 1-carpule instant preset & physiological dosing
 * Mandates 8e (Doctor Autonomy), 8n (Solo Doctor), 8b (<= 120 lines).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ANESTHESIA_DRUGS,
	calculateAnesthesiaSafety,
} from "../anesthesiaCalculatorEngine";

describe("Anesthesia Dosing — Instant 1-Carpule & Physiological Autonomy", () => {
	it("instantly applies 1-carpule (1.7 ml) Ultracain DS Forte without requiring patient weight (Mandate 8e)", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1,
		});

		assert.equal(result.drug.key, "ultracain_ds_forte");
		assert.equal(result.totalVolumeMl, 1.7);
		assert.equal(result.totalDoseMg, 68);
		assert.equal(result.patientWeightKg, 70); // physiological adult default
		assert.equal(result.safetyLevel, "safe");
		assert.equal(result.warningMessage, null);
	});

	it("correctly calculates safe dosage for Ultracain DS Forte in 70kg patient", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 70,
			carpulesCount: 1,
		});

		assert.equal(result.drug.key, "ultracain_ds_forte");
		assert.equal(result.patientWeightKg, 70);
		assert.equal(result.totalVolumeMl, 1.7);
		assert.equal(result.totalDoseMg, 68);
		assert.equal(result.maxSafeDoseMg, 490);
		assert.equal(result.maxSafeCarpules, 7.2);
		assert.equal(result.totalEpinephrineMg, 0.017);
		assert.equal(result.safetyLevel, "safe");
	});

	it("caps maximum dose at absolute limit for heavy patients", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 100,
			carpulesCount: 2,
		});

		assert.equal(result.maxSafeDoseMg, 500);
		assert.equal(result.totalVolumeMl, 3.4);
		assert.equal(result.totalDoseMg, 136);
		assert.equal(result.safetyLevel, "safe");
	});

	it("correctly calculates safe dose for Mepivacaine 3% (Scandonest)", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "scandonest_3",
			patientWeightKg: 50,
			carpulesCount: 2,
		});

		assert.equal(result.drug.key, "scandonest_3");
		assert.equal(result.drug.isAdrenalineFree, true);
		assert.equal(result.totalVolumeMl, 3.4);
		assert.equal(result.totalDoseMg, 102);
		assert.equal(result.maxSafeDoseMg, 220);
		assert.equal(result.totalEpinephrineMg, 0);
		assert.equal(result.safetyLevel, "safe");
	});

	it("detects danger overdose thresholds when exceeding maximum safe carpules", () => {
		const danger = calculateAnesthesiaSafety({
			drugKey: "scandonest_3",
			patientWeightKg: 50,
			carpulesCount: 5,
		});
		assert.equal(danger.safetyLevel, "danger");
		assert.match(danger.warningMessage ?? "", /Превышена максимально допустимая доза/);
	});
});
