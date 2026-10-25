import {
	type AnesthesiaDrugKey,
	type AutopilotResolutionResult,
	type PatientMrdCalculation,
	type SomaticRiskProfile,
	calculatePatientMrd,
	resolveAutopilotAnesthesia,
} from "../../visit/anesthesiaCalculatorEngine";
import { parseSafetyProfileFromText } from "./somaticTextParser";
import type { PatientClinicalSafetyProfile } from "./types";

export function patientProfileToSomaticRiskProfile(
	profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined,
): SomaticRiskProfile {
	if (!profile) return {};
	if (typeof profile === "string") return patientProfileToSomaticRiskProfile(parseSafetyProfileFromText(profile));

	const hasCardio = Boolean(profile.hasCardiovascularDisease || profile.hasHypertension || profile.hasSevereHypertensionStage3 || profile.hasIhd || profile.hasArrhythmia || profile.hasPacemakerExs);
	const isPregnant = Boolean(profile.pregnancyTrimester && profile.pregnancyTrimester !== "none");

	return {
		hasCardiovascularRisk: hasCardio,
		hasHypertension: Boolean(profile.hasHypertension),
		hasSevereHypertensionStage3: Boolean(profile.hasSevereHypertensionStage3),
		hasIhd: Boolean(profile.hasIhd),
		hasArrhythmia: Boolean(profile.hasArrhythmia),
		hasThyrotoxicosis: Boolean(profile.hasThyrotoxicosis),
		takesBetaBlockers: Boolean(profile.takesBetaBlockers),
		hasArticaineAllergy: Boolean(profile.hasArticaineAllergy),
		hasMepivacaineAllergy: Boolean(profile.hasMepivacaineAllergy),
		hasLidocaineAllergy: Boolean(profile.hasLidocaineAllergy),
		hasSulfiteAllergy: Boolean(profile.hasSulfiteAllergy || profile.hasSulfitesAllergy),
		hasBronchialAsthma: Boolean(profile.hasBronchialAsthma),
		isPregnantOrLactating: isPregnant,
		pregnancyTrimester: profile.pregnancyTrimester,
		customNotes: profile.customChronicNotes || profile.customAllergyNotes,
	};
}

export function getAnesthesiaAutopilotForPatient(
	profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined,
	weightKg?: number | undefined,
	ageYears?: number | null | undefined,
	isPediatric?: boolean | undefined,
): AutopilotResolutionResult {
	const somatic = patientProfileToSomaticRiskProfile(profile);
	return resolveAutopilotAnesthesia({ somaticProfile: somatic, patientWeightKg: weightKg, patientAgeYears: ageYears, isPediatric });
}

export function calculatePatientMrdForProfile(params: {
	profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined;
	drugKey: AnesthesiaDrugKey;
	patientWeightKg: number;
	patientAgeYears?: number | null | undefined;
	isPediatric?: boolean | undefined;
}): PatientMrdCalculation {
	const somatic = patientProfileToSomaticRiskProfile(params.profile);
	const hasCardio = Boolean(somatic.hasCardiovascularRisk || somatic.hasHypertension || somatic.hasIhd || somatic.hasArrhythmia);
	return calculatePatientMrd({
		drugKey: params.drugKey,
		patientWeightKg: params.patientWeightKg,
		patientAgeYears: params.patientAgeYears,
		isPediatric: params.isPediatric,
		isCardioRestricted: hasCardio,
	});
}
