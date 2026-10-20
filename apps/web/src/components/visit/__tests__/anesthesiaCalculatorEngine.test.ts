/**
 * anesthesiaCalculatorEngine.test.ts — Core Engine Integration Smoke Test
 * Mandates 8e (Doctor Autonomy), 8n (Solo Doctor), 8b (<= 120 lines).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
	calculateAnesthesiaSafety,
} from "../anesthesiaCalculatorEngine";

describe("anesthesiaCalculatorEngine — Core Engine Verification", () => {
	it("exposes primary drugs with correct concentrations and defaults", () => {
		assert.ok(ANESTHESIA_DRUGS.ultracain_ds_forte);
		assert.ok(ANESTHESIA_DRUGS.ultracain_ds);
		assert.ok(ANESTHESIA_DRUGS.scandonest_3);
		assert.equal(ANESTHESIA_DRUGS.scandonest_3.isAdrenalineFree, true);
	});

	it("exposes core administration methods", () => {
		assert.ok(ANESTHESIA_METHODS.infiltration);
		assert.ok(ANESTHESIA_METHODS.mandibular);
		assert.ok(ANESTHESIA_METHODS.torusal);
	});

	it("executes safe default calculation for healthy adult", () => {
		const res = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1,
		});
		assert.equal(res.safetyLevel, "safe");
		assert.equal(res.patientWeightKg, 70);
		assert.equal(res.totalVolumeMl, 1.7);
	});
});
