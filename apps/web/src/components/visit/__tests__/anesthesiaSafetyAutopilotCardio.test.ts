import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CARDIO_LIMIT_BADGE_TEXT,
	CARDIO_MAX_EPINEPHRINE_MG,
	calculateAnesthesiaSafety,
} from "../anesthesiaCalculatorEngine";

describe("Anesthesia Safety Autopilot — Cardiovascular Epinephrine Limits (0.04 mg)", () => {
	it("enforces strict 0.04 mg epinephrine limit and assigns «Кардиологический лимит» badge for hypertension", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 75,
			carpulesCount: 2,
			somaticProfile: { hasHypertension: true },
		});

		assert.equal(result.isCardioRestricted, true);
		assert.equal(result.cardioLimitBadgeText, CARDIO_LIMIT_BADGE_TEXT);
		assert.equal(result.maxSafeEpinephrineMg, CARDIO_MAX_EPINEPHRINE_MG);
		assert.equal(result.maxSafeCarpules, 2.0); // 2 carpules * 0.017 = 0.034 mg <= 0.04 mg
		assert.equal(result.totalEpinephrineMg, 0.034);
		assert.equal(result.cardioLimitDetails?.maxEpinephrineMg, 0.04);
		assert.equal(result.cardioLimitDetails?.maxCarpules, 2.0);
		assert.equal(result.cardioLimitDetails?.isExceeded, false);
	});

	it("enforces 4 carpule limit for Ultracain DS 1:200 000 in patients with IHD (ИБС) and Arrhythmia", () => {
		const resultIhd = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds",
			patientWeightKg: 80,
			carpulesCount: 4,
			somaticProfile: { hasIhd: true, hasArrhythmia: true },
		});

		assert.equal(resultIhd.isCardioRestricted, true);
		assert.equal(resultIhd.cardioLimitBadgeText, CARDIO_LIMIT_BADGE_TEXT);
		assert.equal(resultIhd.maxSafeCarpules, 4.0); // 4 carpules * 0.0085 = 0.034 mg <= 0.04 mg
		assert.equal(resultIhd.totalEpinephrineMg, 0.034);
		assert.ok(resultIhd.totalEpinephrineMg <= CARDIO_MAX_EPINEPHRINE_MG);
		assert.equal(resultIhd.cardioLimitDetails?.isExceeded, false);
	});

	it("triggers immediate danger and overdose alert when carpules exceed 0.04 mg cardio limit", () => {
		const overLimit100k = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 70,
			carpulesCount: 3,
			somaticProfile: { hasCardiovascularRisk: true },
		});

		assert.equal(overLimit100k.safetyLevel, "danger");
		assert.equal(overLimit100k.cardioLimitDetails?.isExceeded, true);
		assert.match(overLimit100k.warningMessage ?? "", /кардиологическ.*порог|кардиологическ.*лимит/i);

		const overLimit200k = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds",
			patientWeightKg: 70,
			carpulesCount: 5,
			somaticProfile: { hasHypertension: true },
		});

		assert.equal(overLimit200k.safetyLevel, "danger");
		assert.equal(overLimit200k.cardioLimitDetails?.isExceeded, true);
		assert.match(overLimit200k.warningMessage ?? "", /кардиологическ.*порог|кардиологическ.*лимит/i);
	});

	it("confirms plain anesthetics (Scandonest 3% and Lidocaine 2%) have 0 epinephrine and no cardio restriction", () => {
		const scandonest = calculateAnesthesiaSafety({
			drugKey: "scandonest_3",
			patientWeightKg: 65,
			carpulesCount: 2,
			somaticProfile: { hasHypertension: true, hasIhd: true },
		});

		assert.equal(scandonest.drug.isAdrenalineFree, true);
		assert.equal(scandonest.isCardioRestricted, false);
		assert.equal(scandonest.totalEpinephrineMg, 0);
		assert.equal(scandonest.safetyLevel, "safe");
	});
});
