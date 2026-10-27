import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getAnesthesiaAutopilotForPatient,
	checkProcedureSafety,
} from "../safetyMath";
import {
	applyAnamnesisPreset,
	DEFAULT_ANAMNESIS_PROFILE,
} from "../patientAnamnesisPresets";

describe("Somatic Safety — Anesthesia Procedure Checks & Presets", () => {
	it("autopilot diverts away from adrenaline when input is free text with severe hypertension or thyrotoxicosis", () => {
		const ap1 = getAnesthesiaAutopilotForPatient("АГ 3 стадии, кризы", 80, 60);
		assert.equal(ap1.selectedDrugKey, "scandonest_3");
		assert.equal(ap1.drug.isAdrenalineFree, true);

		const ap2 = getAnesthesiaAutopilotForPatient("Тиреотоксикоз", 65, 40);
		assert.equal(ap2.selectedDrugKey, "scandonest_3");
		assert.equal(ap2.drug.isAdrenalineFree, true);
	});

	it("checkProcedureSafety blocks adrenaline when patient has severe hypertension, thyrotoxicosis, or beta-blockers", () => {
		const resHypertension = checkProcedureSafety("Анестезия Ультракаин Д-С форте 1:100 000", {
			hasSevereHypertensionStage3: true,
		});
		assert.equal(resHypertension.isAllowed, false);
		assert.equal(resHypertension.severity, "critical");
		assert.match(resHypertension.warnings[0] ?? "", /адреналин/i);
		assert.match(resHypertension.alternatives[0] ?? "", /Скандонест/i);

		const resThyro = checkProcedureSafety("Ретракционная нить с адреналином", {
			hasThyrotoxicosis: true,
		});
		assert.equal(resThyro.isAllowed, false);
		assert.equal(resThyro.severity, "critical");

		const resBeta = checkProcedureSafety("Анестезия Ультракаин Д-С", {
			takesBetaBlockers: true,
		});
		assert.equal(resBeta.isAllowed, false);
		assert.equal(resBeta.severity, "critical");
	});

	it("checkProcedureSafety blocks specific anesthetics when patient has drug allergy", () => {
		const resArticaine = checkProcedureSafety("Инфильтрационная анестезия Ультракаин", {
			hasArticaineAllergy: true,
		});
		assert.equal(resArticaine.isAllowed, false);
		assert.equal(resArticaine.severity, "critical");
		assert.match(resArticaine.warnings[0] ?? "", /Артикаин/i);

		const resMepivacaine = checkProcedureSafety("Анестезия Скандонест 3%", {
			hasMepivacaineAllergy: true,
		});
		assert.equal(resMepivacaine.isAllowed, false);
		assert.equal(resMepivacaine.severity, "critical");
		assert.match(resMepivacaine.warnings[0] ?? "", /Мепивакаин/i);

		const resSulfite = checkProcedureSafety("Анестезия Септанест с адреналином", {
			hasSulfiteAllergy: true,
		});
		assert.equal(resSulfite.isAllowed, false);
		assert.equal(resSulfite.severity, "critical");
		assert.match(resSulfite.warnings[0] ?? "", /сульфит/i);
	});

	it("applies physiological norm preset (clean) in 1 click", () => {
		const result = applyAnamnesisPreset(DEFAULT_ANAMNESIS_PROFILE, "clean");
		assert.equal(result.toastType, "info");
		assert.match(result.toastMessage, /норма/i);
		assert.equal(result.updatedProfile.hasArticaineAllergy, false);
		assert.equal(result.updatedProfile.hasPacemakerExs, false);
		assert.match(result.updatedProfile.customChronicNotes ?? "", /Физиологическая норма/);
	});

	it("applies cardio stop preset (cardio) with pacemaker and hypertension", () => {
		const result = applyAnamnesisPreset(DEFAULT_ANAMNESIS_PROFILE, "cardio");
		assert.equal(result.toastType, "warning");
		assert.equal(result.updatedProfile.hasPacemakerExs, true);
		assert.equal(result.updatedProfile.hasHypertension, true);
		assert.equal(result.updatedProfile.hasCardiovascularDisease, true);
	});

	it("applies Articaine allergy preset with asthma and sulfite allergies", () => {
		const result = applyAnamnesisPreset(DEFAULT_ANAMNESIS_PROFILE, "allergy_articaine");
		assert.equal(result.toastType, "error");
		assert.equal(result.updatedProfile.hasArticaineAllergy, true);
		assert.equal(result.updatedProfile.hasBronchialAsthma, true);
		assert.equal(result.updatedProfile.hasSulfiteAllergy, true);
	});
});
