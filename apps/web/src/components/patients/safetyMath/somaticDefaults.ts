import { CANONICAL_SOMATIC_HEALTHY_NORM_WITH_INFECTIONS_TEXT } from "../../../utils/somaticNorm";
import type { PatientClinicalSafetyProfile } from "./types";

export const DEFAULT_SOMATIC_HEALTHY_NORM: PatientClinicalSafetyProfile = {
	hasLidocaineAllergy: false,
	hasArticaineAllergy: false,
	hasMepivacaineAllergy: false,
	hasSulfiteAllergy: false,
	hasSulfitesAllergy: false,
	hasAnestheticAllergy: false,
	hasIodineAllergy: false,
	hasAnaphylaxisHistory: false,
	hasPacemakerExs: false,
	hasCardiovascularDisease: false,
	hasHypertension: false,
	takesAnticoagulants: false,
	hasAnticoagulantTherapy: false,
	anticoagulantName: "",
	takesBisphosphonates: false,
	hasBisphosphonateTherapy: false,
	bisphosphonateName: "",
	pregnancyTrimester: "none",
	hasDiabetesMellitus: false,
	diabetesType: "unknown",
	hasBronchialAsthma: false,
	hasEpilepsy: false,
	hasHepatitis: false,
	hasHiv: false,
	hasThyroidDisease: false,
	hasPenicillinAllergy: false,
	hasLatexAllergy: false,
	hasNsaidAllergy: false,
	customAllergyNotes: "",
	customChronicNotes: CANONICAL_SOMATIC_HEALTHY_NORM_WITH_INFECTIONS_TEXT,
	currentMedicationsList: "",
};

export function createHealthySomaticNormProfile(): PatientClinicalSafetyProfile {
	return { ...DEFAULT_SOMATIC_HEALTHY_NORM };
}

export function isSomaticProfilePhysiologicalNorm(profile?: Partial<PatientClinicalSafetyProfile> | null): boolean {
	if (!profile) return true;
	return (
		!profile.hasLidocaineAllergy &&
		!profile.hasArticaineAllergy &&
		!profile.hasMepivacaineAllergy &&
		!profile.hasSulfiteAllergy &&
		!profile.hasSulfitesAllergy &&
		!profile.hasAnestheticAllergy &&
		!profile.hasIodineAllergy &&
		!profile.hasAnaphylaxisHistory &&
		!profile.hasPacemakerExs &&
		!profile.hasCardiovascularDisease &&
		!profile.hasHypertension &&
		!profile.takesAnticoagulants &&
		!profile.hasAnticoagulantTherapy &&
		!profile.takesBisphosphonates &&
		!profile.hasBisphosphonateTherapy &&
		(profile.pregnancyTrimester === "none" || !profile.pregnancyTrimester) &&
		!profile.hasDiabetesMellitus &&
		!profile.hasBronchialAsthma &&
		!profile.hasEpilepsy &&
		!profile.hasHepatitis &&
		!profile.hasHiv &&
		!profile.hasThyroidDisease &&
		!profile.hasPenicillinAllergy &&
		!profile.hasLatexAllergy &&
		!profile.hasNsaidAllergy
	);
}
