import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	checkAnesthesiaSomaticContraindications,
	resolveAutopilotAnesthesia,
} from "../anesthesiaCalculatorEngine";

describe("Anesthesia Safety Autopilot — Bronchial Asthma (J45) & Sulfite Allergy", () => {
	it("triggers danger contraindication on any adrenaline anesthetic for bronchial asthma", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds_forte",
			somaticProfile: { hasBronchialAsthma: true },
		});

		assert.equal(check.hasContraindications, true);
		assert.equal(check.recommendedDrugKey, "scandonest_3");
		const alert = check.alerts.find((a) => a.id === "sulfite_asthma_contraindication");
		assert.ok(alert);
		assert.equal(alert?.severity, "danger");
		assert.match(alert?.message ?? "", /метабисульфит/);
		assert.match(alert?.message ?? "", /бронхоспазм/);
	});

	it("triggers danger contraindication on Septanest 100 for sulfite/preservative allergy", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "septanest_100",
			somaticProfile: { hasSulfiteAllergy: true },
		});

		assert.equal(check.hasContraindications, true);
		assert.equal(check.recommendedDrugKey, "scandonest_3");
	});

	it("verifies Scandonest 3% is fully compatible and endorsed for asthma/sulfite patients", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "scandonest_3",
			somaticProfile: { hasBronchialAsthma: true, hasSulfiteAllergy: true },
		});

		assert.equal(check.hasContraindications, false);
		assert.ok(check.alerts.some((a) => a.id === "sulfite_asthma_safe"));
	});
});

describe("Anesthesia Safety Autopilot — Pregnancy & Lactation Protocols", () => {
	it("auto-selects Ultracain DS 1:200 000 as gold standard during pregnancy", () => {
		const autopilot = resolveAutopilotAnesthesia({
			somaticProfile: { isPregnantOrLactating: true, pregnancyTrimester: "trimester_2" },
			patientWeightKg: 60,
		});

		assert.equal(autopilot.selectedDrugKey, "ultracain_ds");
		assert.match(autopilot.rationaleRu, /Артикаин 4% с пониженной концентрацией адреналина 1:200 000/);
		assert.match(autopilot.badgeText, /Ультракаин Д-С 1:200k/);
	});

	it("warns against high epinephrine 1:100 000 during pregnancy due to uterine vasoconstriction", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds_forte",
			somaticProfile: { pregnancyTrimester: "trimester_1" },
		});

		assert.equal(check.recommendedDrugKey, "ultracain_ds");
		const alert = check.alerts.find((a) => a.id === "pregnancy_high_vaso_warning");
		assert.ok(alert);
		assert.equal(alert?.severity, "warning");
		assert.match(alert?.message ?? "", /маточно-плацентарного кровотока/);
	});

	it("notes caution for Mepivacaine and Lidocaine during pregnancy when no sulfite allergy exists", () => {
		const mepiCheck = checkAnesthesiaSomaticContraindications({
			drugKey: "scandonest_3",
			somaticProfile: { isPregnantOrLactating: true },
		});
		assert.equal(mepiCheck.recommendedDrugKey, "ultracain_ds");
		assert.ok(mepiCheck.alerts.some((a) => a.id === "pregnancy_mepivacaine_caution"));

		const lidoCheck = checkAnesthesiaSomaticContraindications({
			drugKey: "lidocaine_2",
			somaticProfile: { isPregnantOrLactating: true },
		});
		assert.equal(lidoCheck.recommendedDrugKey, "ultracain_ds");
		assert.ok(lidoCheck.alerts.some((a) => a.id === "pregnancy_lidocaine_caution"));
	});
});
