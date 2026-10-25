/**
 * prescriptionPresets.ts — Russian Dental Pharmacopeia Presets Facade
 * DENTE Dental CRM (Mandates 8e, 8n, 8x, 8y & Mandate 8b <= 120 lines).
 */

import { PRESETS_ANTIBIOTICS } from "./prescriptionPresetsAntibiotics";
import { PRESETS_NSAIDS } from "./prescriptionPresetsNsaids";
import { PRESETS_SPECIAL } from "./prescriptionPresetsSpecial";
import { PRESETS_TOPICAL } from "./prescriptionPresetsTopical";
import type { DentalMedicationPreset } from "./prescriptionPresetTypes";

export * from "./prescriptionPresetTypes";
export * from "./prescriptionPresetsAntibiotics";
export * from "./prescriptionPresetsNsaids";
export * from "./prescriptionPresetsTopical";
export * from "./prescriptionPresetsSpecial";

export const DENTAL_MEDICATIONS_BASE: readonly DentalMedicationPreset[] = [
	...PRESETS_ANTIBIOTICS,
	...PRESETS_NSAIDS,
	...PRESETS_TOPICAL,
	...PRESETS_SPECIAL,
];

export const DENTAL_MEDICATIONS_CATALOG: readonly DentalMedicationPreset[] =
	DENTAL_MEDICATIONS_BASE.map((m) => ({
		...m,
		nameRu: m.tradeNameRu,
		latinName: m.latinRp,
		dispenseFormula: m.dispenseLatin,
	}));

export {
	type DentalFastPrescriptionPackage,
	DENTAL_FAST_PRESCRIPTION_PACKAGES_BASE,
	DENTAL_FAST_PRESCRIPTION_PACKAGES,
	calculatePediatricIbuprofenDose,
} from "./prescriptionPackages";
