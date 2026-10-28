/**
 * anesthesiaSafetyAutopilotCardio.test.ts — Cardiovascular Risk Protocol & Doctor Autonomy
 * Mandates 8e (Doctor Autonomy), 8y (Zero Pharma Paranoia — passive warnings, no blocking).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CARDIO_LIMIT_BADGE_TEXT,
	CARDIO_MAX_EPINEPHRINE_MG,
	calculateAnesthesiaSafety,
	formatClinicalChairsideEntry,
} from "../anesthesiaCalculatorEngine";

describe("Chairside Cardiovascular Anesthesia Autonomy (Mandates 8e, 8y)", () => {
	it("recommends plain adrenaline-free Scandonest 3% for patients with hypertension or IHD", () => {
		const scandonest = calculateAnesthesiaSafety({
			drugKey: "scandonest_3",
			carpulesCount: 1,
			somaticProfile: { hasHypertension: true, hasIhd: true },
		});

		assert.equal(scandonest.drug.isAdrenalineFree, true);
		assert.equal(scandonest.totalEpinephrineMg, 0);
		assert.equal(scandonest.safetyLevel, "safe");
		assert.equal(scandonest.isCardioRestricted, false);
	});

	it("assigns passive «Кардиологический лимит» badge when adrenaline anesthetic is chosen for cardio patient", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1,
			somaticProfile: { hasHypertension: true },
		});

		assert.equal(result.isCardioRestricted, true);
		assert.equal(result.cardioLimitBadgeText, CARDIO_LIMIT_BADGE_TEXT);
		assert.equal(result.maxSafeEpinephrineMg, CARDIO_MAX_EPINEPHRINE_MG);
	});

	it("keeps 1-click execution available for Ultracain DS 1:200 000 with low adrenaline (0.0085 mg/carpule)", () => {
		const resultIhd = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds",
			carpulesCount: 2,
			somaticProfile: { hasIhd: true, hasArrhythmia: true },
		});

		assert.equal(resultIhd.isCardioRestricted, true);
		assert.equal(resultIhd.cardioLimitBadgeText, CARDIO_LIMIT_BADGE_TEXT);
		assert.ok(resultIhd.totalEpinephrineMg <= CARDIO_MAX_EPINEPHRINE_MG);
	});

	it("formats clean clinical entry for cardio patient with Scandonest 3% in medical record", () => {
		const entry = formatClinicalChairsideEntry({
			drugKey: "scandonest_3",
			carpulesCount: 1,
			toothNumber: 47,
		});

		assert.match(entry, /Скандонест 3%/);
		assert.match(entry, /без адреналина/);
		assert.match(entry, /1\.7 мл/);
		assert.match(entry, /зуба 47/);
		assert.match(entry, /Аспирационная проба отрицательная/);
	});
});
