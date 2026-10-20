/**
 * anesthesiaCalculatorAllergy.test.ts — Allergy & Pregnancy Anesthesia Protocols
 * Mandates 8e (Doctor Autonomy), 8y (Zero pharmacological paranoia), 8b (<= 120 lines).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkAnesthesiaSomaticContraindications } from "../anesthesiaCalculatorEngine";

describe("anesthesiaCalculatorEngine — Sulfite Allergy & Bronchial Asthma (J45)", () => {
	it("flags absolute contraindication for Ultracain DS Forte when sulfite allergy is present", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds_forte",
			somaticProfile: { hasSulfiteAllergy: true },
			carpulesCount: 1,
		});

		assert.equal(check.hasContraindications, true);
		assert.equal(check.recommendedDrugKey, "scandonest_3");
		const alert = check.alerts.find((a) => a.id === "sulfite_asthma_contraindication");
		assert.ok(alert);
		assert.equal(alert?.severity, "danger");
	});

	it("flags absolute contraindication for Septanest when bronchial asthma is present", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "septanest_100",
			somaticProfile: { hasBronchialAsthma: true },
			carpulesCount: 1,
		});

		assert.equal(check.hasContraindications, true);
		assert.equal(check.recommendedDrugKey, "scandonest_3");
		const alert = check.alerts.find((a) => a.id === "sulfite_asthma_contraindication");
		assert.ok(alert);
		assert.equal(alert?.severity, "danger");
	});

	it("approves Scandonest 3% and Lidocaine 2% as safe sulfite-free anesthetics", () => {
		const scandonestCheck = checkAnesthesiaSomaticContraindications({
			drugKey: "scandonest_3",
			somaticProfile: { hasBronchialAsthma: true, hasSulfiteAllergy: true },
			carpulesCount: 2,
		});
		assert.equal(scandonestCheck.hasContraindications, false);
		assert.ok(scandonestCheck.alerts.some((a) => a.id === "sulfite_asthma_safe"));
	});
});

describe("anesthesiaCalculatorEngine — Pregnancy & Lactation Protocols", () => {
	it("endorses Ultracain DS (1:200 000) as preferred choice during pregnancy", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds",
			somaticProfile: { isPregnantOrLactating: true },
			carpulesCount: 1,
		});

		const alert = check.alerts.find((a) => a.id === "pregnancy_preferred_choice");
		assert.ok(alert);
		assert.equal(alert?.severity, "safe");
		assert.match(alert?.message ?? "", /95%/);
	});

	it("warns against high epinephrine 1:100 000 in pregnancy due to uterine vasoconstriction", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "ultracain_ds_forte",
			somaticProfile: { isPregnantOrLactating: true },
			carpulesCount: 1,
		});

		assert.equal(check.recommendedDrugKey, "ultracain_ds");
		const alert = check.alerts.find((a) => a.id === "pregnancy_high_vaso_warning");
		assert.ok(alert);
		assert.equal(alert?.severity, "warning");
		assert.match(alert?.message ?? "", /маточно-плацентарного кровотока/);
	});

	it("provides caution note for Mepivacaine 3% in pregnancy when no sulfite allergy exists", () => {
		const check = checkAnesthesiaSomaticContraindications({
			drugKey: "scandonest_3",
			somaticProfile: { isPregnantOrLactating: true },
			carpulesCount: 1,
		});

		assert.equal(check.recommendedDrugKey, "ultracain_ds");
		const alert = check.alerts.find((a) => a.id === "pregnancy_mepivacaine_caution");
		assert.ok(alert);
		assert.equal(alert?.severity, "caution");
	});
});
