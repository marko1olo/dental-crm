/**
 * prescriptionAllergyChecker.ts — Clinical Allergy & Somatic Safety Sentinel
 * Decomposed module <= 120 lines (Mandate 8b).
 */

import { checkMedicationSafetyContraindications } from "@dental/shared";
import { detectPrescriptionAllergyConflicts } from "./prescriptionAllergyDetector";
import {
	ANESTHETIC_KEYWORDS,
	extractAllergyTerms,
	NSAID_KEYWORDS,
	PENICILLIN_KEYWORDS,
	ULCER_GASTRITIS_KEYWORDS,
} from "./prescriptionAllergyKeywords";
import type {
	AllergyConflictDrugItem,
	PrescriptionAllergyConflict,
	PrescriptionAllergyType,
	PrescriptionDrugItemLike,
	PrescriptionSomaticWarning,
} from "./prescriptionAllergyTypes";
import {
	detectPrescriptionSomaticWarnings,
	hasUlcerGastritisCondition,
} from "./prescriptionSomaticChecker";

export type {
	AllergyConflictDrugItem,
	PrescriptionAllergyConflict,
	PrescriptionAllergyType,
	PrescriptionDrugItemLike,
	PrescriptionSomaticWarning,
};
export {
	ANESTHETIC_KEYWORDS,
	detectPrescriptionAllergyConflicts,
	detectPrescriptionSomaticWarnings,
	extractAllergyTerms,
	hasUlcerGastritisCondition,
	NSAID_KEYWORDS,
	PENICILLIN_KEYWORDS,
	ULCER_GASTRITIS_KEYWORDS,
};

export function hasPenicillinAllergy(patientAllergies: unknown): boolean {
	return PENICILLIN_KEYWORDS.some((kw) =>
		extractAllergyTerms(patientAllergies).includes(kw),
	);
}

export function hasNsaidAllergy(patientAllergies: unknown): boolean {
	return NSAID_KEYWORDS.some((kw) =>
		extractAllergyTerms(patientAllergies).includes(kw),
	);
}

export function hasAnestheticAllergy(patientAllergies: unknown): boolean {
	return ANESTHETIC_KEYWORDS.some((kw) =>
		extractAllergyTerms(patientAllergies).includes(kw),
	);
}

export function isDrugConflictingWithAllergies(
	drug: PrescriptionDrugItemLike,
	patientAllergies: unknown,
): boolean {
	return getDrugAllergyConflictType(drug, patientAllergies) !== null;
}

export function getDrugAllergyConflictType(
	drug: PrescriptionDrugItemLike,
	patientAllergies: unknown,
): PrescriptionAllergyType | null {
	const text = extractAllergyTerms(patientAllergies);
	if (!text) return null;
	const drugText =
		`${drug.id} ${drug.tradeName} ${drug.latinName}`.toLowerCase();

	if (
		hasPenicillinAllergy(patientAllergies) &&
		PENICILLIN_KEYWORDS.some((kw) => drugText.includes(kw))
	) {
		return "penicillin";
	}
	if (
		hasNsaidAllergy(patientAllergies) &&
		(drug.category === "nsaid" ||
			NSAID_KEYWORDS.some((kw) => drugText.includes(kw)))
	) {
		return "nsaid";
	}
	if (
		hasAnestheticAllergy(patientAllergies) &&
		(drug.category === "anesthetic" ||
			ANESTHETIC_KEYWORDS.some((kw) => drugText.includes(kw)))
	) {
		return "anesthetic";
	}

	const ssotSafety = checkMedicationSafetyContraindications(drug.id, [text]);
	if (ssotSafety.hasConflict) {
		if (
			drug.category === "antibiotic" ||
			PENICILLIN_KEYWORDS.some((kw) => drugText.includes(kw))
		) {
			return "penicillin";
		}
		if (drug.category === "anesthetic") return "anesthetic";
		return "nsaid";
	}
	return null;
}
