/**
 * anesthesiaSafetyAutopilotAllergy.test.ts — Allergy & Pregnancy Protocols with Zero Blocking
 * Mandates 8e (Doctor Autonomy), 8y (Zero Pharma Paranoia).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	checkAnesthesiaSomaticContraindications,
	getPassiveAllergyNotice,
	resolveAutopilotAnesthesia,
} from "../anesthesiaCalculatorEngine";

describe("Chairside Allergy & Somatic Protocols (Mandates 8e, 8y)", () => {
	it("recommends sulfite-free Scandonest 3% for bronchial asthma or sulfite allergy", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds_forte",
			somaticProfile: { hasBronchialAsthma: true },
		});

		assert.equal(check.hasContraindications, true);
		assert.equal(check.recommendedDrugKey, "scandonest_3");
		const alert = check.alerts.find((a) => a.id === "sulfite_asthma_contraindication");
		assert.ok(alert);
		assert.match(alert?.message ?? "", /метабисульфит/);
	});

	it("generates passive non-blocking warning string with ⚠️ icon without modal blocking", () => {
		const warning = getPassiveAllergyNotice("septanest_100", { hasSulfiteAllergy: true });
		assert.ok(warning);
		assert.match(warning ?? "", /^⚠️/);
	});

	it("verifies Scandonest 3% is completely safe for asthma/sulfite patients", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "scandonest_3",
			somaticProfile: { hasBronchialAsthma: true, hasSulfiteAllergy: true },
		});

		assert.equal(check.hasContraindications, false);
		const warning = getPassiveAllergyNotice("scandonest_3", { hasSulfiteAllergy: true });
		assert.equal(warning, null);
	});

	it("auto-selects Ultracain DS 1:200 000 as gentle choice during pregnancy", () => {
		const autopilot = resolveAutopilotAnesthesia({
			somaticProfile: { isPregnantOrLactating: true, pregnancyTrimester: "trimester_2" },
		});

		assert.equal(autopilot.selectedDrugKey, "ultracain_ds");
		assert.match(autopilot.badgeText, /Ультракаин Д-С 1:200k/);
	});
});
