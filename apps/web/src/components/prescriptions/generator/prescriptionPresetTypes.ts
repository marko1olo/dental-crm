/**
 * prescriptionPresetTypes.ts — Prescription Presets Types
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

export interface DentalMedicationPreset {
	readonly id: string;
	readonly tradeNameRu: string;
	readonly nameRu?: string | undefined;
	readonly activeSubstanceRu: string;
	readonly category:
		| "antibiotic"
		| "nsaid"
		| "antiseptic"
		| "dental_gel"
		| "antihistamine"
		| "controlled_pku"
		| "hemostatic"
		| "gastroprotective"
		| "preferential_somatic"
		| "anesthetic"
		| "other";
	readonly categoryLabelRu: string;
	readonly latinRp: string;
	readonly latinName?: string | undefined;
	readonly formRu: string;
	readonly dosageRu: string;
	readonly quantityLabel: string;
	readonly dispenseLatin: string;
	readonly dispenseFormula?: string | undefined;
	readonly signaRu: string;
	readonly validityDays: 15 | 30 | 60 | 365;
}
