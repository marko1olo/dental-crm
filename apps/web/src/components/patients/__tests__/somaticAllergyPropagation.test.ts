import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getAnesthesiaAutopilotForPatient,
	patientProfileToSomaticRiskProfile,
	parseSafetyProfileFromText,
	checkProcedureSafety,
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

	it("parses severe hypertension stage 3, thyrotoxicosis, and beta-blockers from free clinical text", () => {
		const text1 = "Диагноз: ГБ 3 стадии, кризовое течение, АД до 190/110";
		const p1 = parseSafetyProfileFromText(text1);
		assert.equal(p1.hasSevereHypertensionStage3, true);
		assert.equal(p1.hasCardiovascularDisease, true);

		const text2 = "Эндокринолог: Диффузный токсический зоб, тиреотоксикоз средней степени";
		const p2 = parseSafetyProfileFromText(text2);
		assert.equal(p2.hasThyrotoxicosis, true);
		assert.equal(p2.hasCardiovascularDisease, true);

		const text3 = "Постоянная терапия: принимает Конкор (бисопролол 5мг утром)";
		const p3 = parseSafetyProfileFromText(text3);
		assert.equal(p3.takesBetaBlockers, true);
		assert.equal(p3.hasCardiovascularDisease, true);
	});

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
