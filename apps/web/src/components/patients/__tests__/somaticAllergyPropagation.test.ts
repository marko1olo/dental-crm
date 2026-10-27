import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getAnesthesiaAutopilotForPatient,
	patientProfileToSomaticRiskProfile,
	parseSafetyProfileFromText,
	type PatientClinicalSafetyProfile,
} from "../safetyMath";

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
});
