/**
 * apps/web/src/utils/somaticNormTypes.ts
 *
 * Layer 0: Types & Interfaces for Somatic Status & Dental Contraindications.
 * Decomposed from somaticNorm.ts per Mandate 8b / decomposer skill (<= 500 lines limit).
 */

/**
 * Structure of a Tier-1 dental contraindication badge
 */
export interface DentalContraindicationBadge {
	readonly id: string;
	readonly testId: string;
	readonly shortLabel: string;
	readonly fullLabel: string;
	readonly title: string;
	readonly severity: "critical" | "warning" | "healthy";
	readonly actionHint: string;
}

/**
 * Interface matching patient safety profile fields relevant to dental contraindications
 */
export interface SomaticProfileInput {
	readonly hasArticaineAllergy?: boolean | null;
	readonly hasLidocaineAllergy?: boolean | null;
	readonly hasNovocaineAllergy?: boolean | null;
	readonly hasProcaineAllergy?: boolean | null;
	readonly hasMepivacaineAllergy?: boolean | null;
	readonly hasPenicillinAllergy?: boolean | null;
	readonly hasNsaidAllergy?: boolean | null;
	readonly hasLatexAllergy?: boolean | null;
	readonly hasSulfitesAllergy?: boolean | null;
	readonly hasIodineAllergy?: boolean | null;
	readonly hasAnaphylaxisHistory?: boolean | null;
	readonly hasPacemakerExs?: boolean | null;
	readonly takesAnticoagulants?: boolean | null;
	readonly hasAnticoagulantTherapy?: boolean | null;
	readonly anticoagulantName?: string | null;
	readonly takesBisphosphonates?: boolean | null;
	readonly hasBisphosphonateTherapy?: boolean | null;
	readonly bisphosphonateName?: string | null;
	readonly hasDiabetesMellitus?: boolean | null;
	readonly diabetesType?: string | null;
	readonly pregnancyTrimester?: string | null;
	readonly hasBronchialAsthma?: boolean | null;
	readonly hasAsthma?: boolean | null;
	readonly hasEpilepsy?: boolean | null;
	readonly patientWeightKg?: number | null;
	readonly patientAgeYears?: number | null;
	readonly customAllergyNotes?: string | null;
	readonly customChronicNotes?: string | null;
}

export interface PatientSomaticGuardStatus {
	readonly isHealthyNorm: boolean;
	readonly badges: readonly DentalContraindicationBadge[];
	readonly criticalBadges: readonly DentalContraindicationBadge[];
	readonly warningBadges: readonly DentalContraindicationBadge[];
	readonly hasCriticalAllergy: boolean;
	readonly normBadge: DentalContraindicationBadge | null;
}

export interface SomaticBadgeInfo {
	readonly hasAllergy: boolean;
	readonly allergyLabel: string;
	readonly hasSomaticWarning: boolean;
	readonly somaticLabel: string;
}
