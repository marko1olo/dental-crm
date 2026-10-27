import { CANONICAL_SOMATIC_HEALTHY_NORM_WITH_INFECTIONS_TEXT } from "@dental/shared";
import type { PatientClinicalSafetyProfile } from "../safetyMath";

export const DEFAULT_ANAMNESIS_PROFILE: PatientClinicalSafetyProfile = {
	hasLidocaineAllergy: false,
	hasArticaineAllergy: false,
	hasMepivacaineAllergy: false,
	hasSulfiteAllergy: false,
	hasAnaphylaxisHistory: false,
	hasPacemakerExs: false,
	hasCardiovascularDisease: false,
	hasHypertension: false,
	takesAnticoagulants: false,
	anticoagulantName: "",
	takesBisphosphonates: false,
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
	customChronicNotes: "",
	currentMedicationsList: "",
};

export type AnamnesisPresetType =
	| "clean"
	| "cardio"
	| "anticoag"
	| "bisphosphonate"
	| "pregnant_2"
	| "diabetes"
	| "allergy_articaine"
	| "allergy_penicillin"
	| "allergy_nsaid"
	| "allergy_latex";

export const ANAMNESIS_PRESETS: readonly AnamnesisPresetType[] = [
	"clean",
	"cardio",
	"anticoag",
	"bisphosphonate",
	"pregnant_2",
	"diabetes",
	"allergy_articaine",
	"allergy_penicillin",
	"allergy_nsaid",
	"allergy_latex",
] as const;

export interface PresetApplicationResult {
	readonly updatedProfile: PatientClinicalSafetyProfile;
	readonly toastMessage: string;
	readonly toastType: "info" | "warning" | "error";
}
