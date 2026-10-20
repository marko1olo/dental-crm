/**
 * anesthesiaCalculatorCardio.test.ts — Cardiovascular Risk & Epinephrine Limits (0.04 mg)
 * Mandates 8e, 8n, 8b (<= 120 lines).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CARDIO_MAX_EPINEPHRINE_MG,
	calculateAnesthesiaSafety,
	checkAnesthesiaSomaticContraindications,
} from "../anesthesiaCalculatorEngine";

describe("anesthesiaCalculatorEngine — Cardiovascular Risk & Epinephrine (0.04 mg Limit)", () => {
	it("alerts with danger and recommends Scandonest 3% when selecting 1:100 000 adrenaline for hypertensive patients", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds_forte",
			somaticProfile: { hasCardiovascularRisk: true },
			carpulesCount: 1,
		});

		assert.equal(check.recommendedDrugKey, "scandonest_3");
		const alert = check.alerts.find((a) => a.id === "cardio_high_vaso_alert");
		assert.ok(alert, "Should trigger cardio_high_vaso_alert");
		assert.equal(alert?.severity, "danger");
		assert.match(alert?.message ?? "", /I10–I15/);
		assert.match(alert?.message ?? "", /Скандонест 3%/);
		assert.equal(check.maxCardioCarpules, 2.0);
	});

	it("alerts with warning for Ultracain DS (1:200 000) in cardiovascular patients and caps at 4 carpules", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds",
			somaticProfile: { hasCardiovascularRisk: true },
			carpulesCount: 2,
		});

		const alert = check.alerts.find((a) => a.id === "cardio_low_vaso_caution");
		assert.ok(alert, "Should trigger cardio_low_vaso_caution");
		assert.equal(alert?.severity, "warning");
		assert.equal(check.maxCardioCarpules, 4.0);
	});

	it("strictly caps max safe carpules to cardiovascular epinephrine limit (2 carpules for 1:100k)", () => {
		const result = calculateAnesthesiaSafety({
			drugKey: "ultracain_ds_forte",
			patientWeightKg: 80,
			carpulesCount: 2,
			somaticProfile: { hasCardiovascularRisk: true },
		});

		assert.equal(result.maxSafeCarpules, 2.0);
		assert.equal(result.maxSafeEpinephrineMg, CARDIO_MAX_EPINEPHRINE_MG);
	});

	it("endorses Scandonest 3% as safe first-line choice for cardiovascular risk", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "scandonest_3",
			somaticProfile: { hasCardiovascularRisk: true },
			carpulesCount: 2,
		});

		assert.equal(check.hasContraindications, false);
		const alert = check.alerts.find((a) => a.id === "cardio_safe_plain");
		assert.ok(alert);
		assert.equal(alert?.severity, "safe");
	});
});
