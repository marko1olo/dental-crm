/**
 * prescriptionAllergyTypes.ts — Types for Allergy & Somatic Contraindication Checking
 */

export interface AllergyConflictDrugItem {
	readonly id: string;
	readonly tradeName: string;
	readonly latinName: string;
}

export type PrescriptionAllergyType = "penicillin" | "nsaid" | "anesthetic";

export interface PrescriptionAllergyConflict {
	readonly type: PrescriptionAllergyType;
	readonly matchedAllergyTerm: string;
	readonly conflictingDrugs: readonly AllergyConflictDrugItem[];
}

export interface PrescriptionDrugItemLike {
	readonly id: string;
	readonly tradeName: string;
	readonly latinName: string;
	readonly category?: string | undefined;
	readonly form?: string | undefined;
	readonly dosage?: string | undefined;
	readonly quantity?: string | undefined;
	readonly dispenseLatin?: string | undefined;
	readonly signaRussian?: string | undefined;
}

export interface PrescriptionSomaticWarning {
	readonly id: string;
	readonly type: "ulcer_gastritis_nsaid";
	readonly messageRu: string;
	readonly recommendationRu: string;
	readonly matchedTerm: string;
	readonly affectedDrugs: readonly string[];
}
