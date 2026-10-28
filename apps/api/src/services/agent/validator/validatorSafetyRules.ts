/**
 * validatorSafetyRules.ts — Clinical Pharmacological, Somatic & FDI Notation Rules
 * for Clinical Validator Agent.
 *
 * Compliant with Mandate 8b / 8zi (Dense module, ~200 lines).
 */

// ============================================================================
// CONTRACTS & TYPES
// ============================================================================

export type ClinicalValidationSeverity = "safe" | "info" | "warning" | "critical";

export type ClinicalValidationErrorCode =
	| "ALLERGY_CONTRAINDICATION"
	| "SOMATIC_CONTRAINDICATION"
	| "ODONTOGRAM_ABSENT_TOOTH"
	| "INVALID_FDI_TOOTH_NUMBER"
	| "PREGNANCY_NSAID_RISK"
	| "ULCER_NSAID_RISK";

export interface ClinicalValidationIssue {
	readonly code: ClinicalValidationErrorCode;
	readonly severity: "critical" | "warning" | "info";
	readonly message: string;
	readonly field?: string | undefined;
	readonly offender?: string | undefined;
	readonly suggestedFix?: string | undefined;
}

export interface SafeAlternativeRecommendation {
	readonly original: string;
	readonly replacement: string;
	readonly clinicalRationaleRu: string;
}

export interface OdontogramToothStatus {
	readonly statusCode: string; // e.g. "extracted_absent", "healthy", "caries", "implant", "crown"
	readonly surfaces?: readonly string[] | undefined;
	readonly notes?: string | undefined;
}

export interface ClinicalValidationContext {
	readonly patientId?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly knownAllergies?: readonly string[] | undefined;
	readonly somaticConditions?: readonly string[] | undefined;
	readonly currentMedications?: readonly string[] | undefined;
	readonly activeDentalFormula?: Record<number, OdontogramToothStatus> | undefined;
	readonly isPregnant?: boolean | undefined;
	readonly pregnancyTrimester?: number | undefined;
	readonly hasPepticUlcer?: boolean | undefined;
}

export interface ProposedClinicalItem {
	readonly type: "tooth_procedure" | "prescription" | "anesthesia" | "referral" | "other";
	readonly toothNumber?: number | undefined;
	readonly action?: string | undefined; // e.g. "extraction", "restoration", "endodontics", "implant"
	readonly procedureTitle?: string | undefined;
	readonly medicationName?: string | undefined;
	readonly dosage?: string | undefined;
	readonly icd10?: string | undefined;
}

export interface ClinicalPlanInput {
	readonly planId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly items: readonly ProposedClinicalItem[];
	readonly doctorNotes?: string | undefined;
}

export interface ClinicalValidationResult {
	readonly isValid: boolean;
	readonly severity: ClinicalValidationSeverity;
	readonly issues: readonly ClinicalValidationIssue[];
	readonly blockedActions: readonly string[];
	readonly revisedPlan?: ClinicalPlanInput | undefined;
	readonly safeAlternatives: readonly SafeAlternativeRecommendation[];
	readonly summaryRu: string;
	readonly auditedAtIso: string;
}

// ============================================================================
// FDI TOOTH NUMBER VALIDATOR
// ============================================================================

export const VALID_ADULT_FDI_TEETH = new Set<number>([
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
]);

export const VALID_DECIDUOUS_FDI_TEETH = new Set<number>([
	51, 52, 53, 54, 55,
	61, 62, 63, 64, 65,
	71, 72, 73, 74, 75,
	81, 82, 83, 84, 85,
]);

export function isValidFdiToothNumber(tooth: number): boolean {
	return VALID_ADULT_FDI_TEETH.has(tooth) || VALID_DECIDUOUS_FDI_TEETH.has(tooth);
}

// ============================================================================
// PHARMACOLOGICAL KEYWORD DETECTORS
// ============================================================================

export const EPINEPHRINE_KEYWORDS = [
	"адреналин",
	"эпинефрин",
	"epinephrine",
	"adrenaline",
	"ультракаин д-с",
	"ультракаин дс",
	"ультракаин форте",
	"убистезин",
	"убистезин форте",
	"септанест",
	"артикаин с адреналином",
	"артикаин с эпинефрином",
	"1:100000",
	"1:200000",
];

export const THYROTOXICOSIS_KEYWORDS = [
	"тиреотоксикоз",
	"гипертиреоз",
	"базедова",
	"зоб",
	"e05",
	"thyrotoxicosis",
	"hyperthyroidism",
];

export const HYPERTENSION_STAGE_3_KEYWORDS = [
	"гипертония 3",
	"гипертоническая болезнь 3",
	"аг 3",
	"артериальная гипертензия 3",
	"гипертонический криз",
	"кризовое течение",
	"i10",
	"i11",
	"stage 3 hypertension",
];

export const PHEOCHROMOCYTOMA_KEYWORDS = [
	"феохромоцитома",
	"c74.1",
	"d35.0",
	"pheochromocytoma",
];

export const NSAID_KEYWORDS = [
	"нпвп",
	"нпвс",
	"ибупрофен",
	"кеторол",
	"кеторолак",
	"нимесил",
	"нимесулид",
	"диклофенак",
	"аспирин",
	"ацетилсалицил",
	"кетопрофен",
	"мелоксикам",
];

export const PENICILLIN_KEYWORDS = [
	"пенициллин",
	"амоксициллин",
	"амоксиклав",
	"аугментин",
	"ампициллин",
	"оксациллин",
	"флемоксин",
];

export const ARTICAINE_KEYWORDS = [
	"артикаин",
	"ультракаин",
	"убистезин",
	"септанест",
	"примакаин",
	"брилокаин",
];
