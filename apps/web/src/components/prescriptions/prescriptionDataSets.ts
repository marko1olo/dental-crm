/**
 * prescriptionDataSets.ts — Outpatient Medication Datasets & Merged Catalog
 * Decomposed module <= 120 lines (Mandate 8b).
 */

import {
	DENTAL_CANONICAL_SSOT_MEDICATIONS,
	DENTAL_DRUG_ID_ALIASES,
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	type DentalPrescriptionDrugPreset,
} from "@dental/shared";
import {
	DENTAL_FAST_PRESCRIPTION_SETS,
	type DentalFastPrescriptionSet,
} from "./prescriptionFastSets";

export type { DentalFastPrescriptionSet };
export { DENTAL_FAST_PRESCRIPTION_SETS };
export type DentalOutpatientDrug = DentalPrescriptionDrugPreset;

export const DENTAL_OUTPATIENT_EXTENDED_DRUGS: readonly DentalPrescriptionDrugPreset[] =
	[];

/**
 * Canonical SSOT Prescription Catalog builder.
 * Aggregates all outpatient dental drugs from @dental/shared SSOT with zero frontend hardcoded arrays.
 */
export function buildMergedPrescriptionCatalog(): DentalPrescriptionDrugPreset[] {
	const map = new Map<string, DentalPrescriptionDrugPreset>();

	// 1. Primary: Canonical SSOT Outpatient Medications from @dental/shared
	for (const ssot of DENTAL_CANONICAL_SSOT_MEDICATIONS) {
		const preset: DentalPrescriptionDrugPreset = {
			id: ssot.id,
			tradeNameRu: ssot.tradeNameRu,
			activeSubstanceRu: ssot.activeSubstanceRu,
			category: ssot.category as DentalPrescriptionDrugPreset["category"],
			categoryLabel: ssot.categoryLabelRu,
			categoryLabelRu: ssot.categoryLabelRu,
			latinRp: ssot.latinRp,
			formRu: ssot.formRu,
			dosageRu: ssot.dosageRu,
			quantityLabel: ssot.quantityDefault,
			dispenseLatin: ssot.dispenseLatin,
			signaRu: ssot.signaRu,
			validityDays: ssot.validityDays || 60,
			recommendedForIcd10: ["K02", "K04", "K05", "K10", "T81"],
		};
		map.set(ssot.id, preset);
	}

	// 2. Secondary: DENTAL_PRESCRIPTION_DRUG_CATALOG from @dental/shared
	for (const drug of DENTAL_PRESCRIPTION_DRUG_CATALOG) {
		if (!map.has(drug.id)) {
			map.set(drug.id, drug);
		}
	}

	// 3. Register aliases from DENTAL_DRUG_ID_ALIASES so legacy IDs resolve seamlessly
	for (const [alias, canonicalId] of Object.entries(DENTAL_DRUG_ID_ALIASES)) {
		const target = map.get(canonicalId);
		if (target && !map.has(alias)) {
			map.set(alias, { ...target, id: alias });
		}
	}

	return Array.from(map.values());
}
