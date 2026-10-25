export type ClinicalSafetySeverity = "critical" | "high" | "moderate" | "info" | "none";

export type ClinicalSafetyCategory =
	| "anesthesia_allergy"
	| "pacemaker_cardio"
	| "anticoagulants"
	| "bisphosphonates"
	| "pregnancy"
	| "chronic_somatic"
	| "general_allergy";

export type PregnancyTrimester = "none" | "trimester_1" | "trimester_2" | "trimester_3" | "lactation";

export interface ClinicalSafetyItemDefinition {
	readonly id: string;
	readonly category: ClinicalSafetyCategory;
	readonly severity: ClinicalSafetySeverity;
	readonly shortBadge: string;
	readonly titleRu: string;
	readonly fullDescription: string;
	readonly forbiddenProcedures: readonly string[];
	readonly mandatoryPrecautions: readonly string[];
	readonly recommendedAnesthesiaNotes?: string | undefined;
	readonly icd10Codes?: readonly string[] | undefined;
	readonly keywords: readonly string[];
}

export interface PatientClinicalSafetyProfile {
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasMepivacaineAllergy?: boolean | undefined;
	readonly hasEsterAnestheticsAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasSulfitesAllergy?: boolean | undefined;
	readonly hasAnestheticAllergy?: boolean | undefined;
	readonly hasIodineAllergy?: boolean | undefined;
	readonly hasAnaphylaxisHistory?: boolean | undefined;
	readonly hasPacemakerExs?: boolean | undefined;
	readonly hasCardiovascularDisease?: boolean | undefined;
	readonly hasHypertension?: boolean | undefined;
	readonly hasSevereHypertensionStage3?: boolean | undefined;
	readonly hasIhd?: boolean | undefined;
	readonly hasArrhythmia?: boolean | undefined;
	readonly takesBetaBlockers?: boolean | undefined;
	readonly hasPheochromocytoma?: boolean | undefined;
	readonly takesAnticoagulants?: boolean | undefined;
	readonly hasAnticoagulantTherapy?: boolean | undefined;
	readonly anticoagulantName?: string | undefined;
	readonly lastInrValue?: number | undefined;
	readonly takesBisphosphonates?: boolean | undefined;
	readonly hasBisphosphonateTherapy?: boolean | undefined;
	readonly bisphosphonateName?: string | undefined;
	readonly pregnancyTrimester: PregnancyTrimester;
	readonly gestationalWeeks?: number | undefined;
	readonly hasDiabetesMellitus?: boolean | undefined;
	readonly diabetesType?: "1" | "2" | "unknown" | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly hasEpilepsy?: boolean | undefined;
	readonly hasHepatitis?: boolean | undefined;
	readonly hasHiv?: boolean | undefined;
	readonly hasThyroidDisease?: boolean | undefined;
	readonly hasThyrotoxicosis?: boolean | undefined;
	readonly hasPenicillinAllergy?: boolean | undefined;
	readonly hasLatexAllergy?: boolean | undefined;
	readonly hasNsaidAllergy?: boolean | undefined;
	readonly customAllergyNotes?: string | undefined;
	readonly customAllergiesNotes?: string | undefined;
	readonly customChronicNotes?: string | undefined;
	readonly currentMedicationsList?: string | undefined;
	readonly lastUpdated?: string | undefined;
}
