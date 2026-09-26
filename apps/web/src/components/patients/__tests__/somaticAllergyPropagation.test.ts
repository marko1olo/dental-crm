import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getAnesthesiaAutopilotForPatient,
	patientProfileToSomaticRiskProfile,
	type PatientClinicalSafetyProfile,
} from "../safetyMath";
import {
	applyAnamnesisPreset,
	DEFAULT_ANAMNESIS_PROFILE,
} from "../patientAnamnesisPresets";

describe("Subagent 4: Somatic Safety & Allergy Propagation to Autopilot", () => {
	it("propagates Articaine allergy into SomaticRiskProfile", () => {
		const profile: Partial<PatientClinicalSafetyProfile> = {
			hasArticaineAllergy: true,
		};
		const somatic = patientProfileToSomaticRiskProfile(profile);
		assert.equal(somatic.hasArticaineAllergy, true);
	});

	it("propagates Mepivacaine and Lidocaine allergies into SomaticRiskProfile", () => {
		const profile: Partial<PatientClinicalSafetyProfile> = {
			hasMepivacaineAllergy: true,
			hasLidocaineAllergy: true,
		};
		const somatic = patientProfileToSomaticRiskProfile(profile);
		assert.equal(somatic.hasMepivacaineAllergy, true);
		assert.equal(somatic.hasLidocaineAllergy, true);
	});

	it("propagates severe hypertension stage 3, thyrotoxicosis, and beta blockers", () => {
		const profile: Partial<PatientClinicalSafetyProfile> = {
			hasSevereHypertensionStage3: true,
			hasThyrotoxicosis: true,
			takesBetaBlockers: true,
		};
		const somatic = patientProfileToSomaticRiskProfile(profile);
		assert.equal(somatic.hasSevereHypertensionStage3, true);
		assert.equal(somatic.hasThyrotoxicosis, true);
		assert.equal(somatic.takesBetaBlockers, true);
		assert.equal(somatic.hasCardiovascularRisk, true);
	});

	it("marks cardiovascular risk when patient has implanted pacemaker (ЭКС)", () => {
		const profile: Partial<PatientClinicalSafetyProfile> = {
			hasPacemakerExs: true,
		};
		const somatic = patientProfileToSomaticRiskProfile(profile);
		assert.equal(somatic.hasCardiovascularRisk, true);
	});

	it("autopilot diverts away from Articaine when patient has Articaine allergy", () => {
		const profile: Partial<PatientClinicalSafetyProfile> = {
			hasArticaineAllergy: true,
		};
		const autopilot = getAnesthesiaAutopilotForPatient(profile, 70, 35);
		// With articaine allergy, autopilot must recommend a safe alternative (e.g. Scandonest 3% or Lidocaine 2%)
		assert.notEqual(autopilot.selectedDrugKey, "ultracain_ds");
		assert.notEqual(autopilot.selectedDrugKey, "ultracain_ds_forte");
		assert.notEqual(autopilot.selectedDrugKey, "septanest_100");
	});

	it("autopilot selects plain Scandonest 3% when patient has severe hypertension stage 3", () => {
		const profile: Partial<PatientClinicalSafetyProfile> = {
			hasSevereHypertensionStage3: true,
		};
		const autopilot = getAnesthesiaAutopilotForPatient(profile, 75, 55);
		assert.equal(autopilot.selectedDrugKey, "scandonest_3");
		assert.equal(autopilot.drug.isAdrenalineFree, true);
	});
});

describe("Subagent 4: Patient Anamnesis 1-Click Presets", () => {
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
