/**
 * packages/shared/src/clinical/prescriptionCatalog.ts
 *
 * 56 Canonical Russian Dental Pharmaceuticals Formulary & 14 Dosage Forms Engine.
 * Adapted from DentalPin & Russian Dental Association (СтАР) / Vidal / GRLS standards.
 */

import { DENTAL_ANTIBIOTICS } from "./prescriptionCatalogAntibiotics.js";
import { DENTAL_ANALGESICS } from "./prescriptionCatalogAnalgesics.js";
import { DENTAL_TOPICALS } from "./prescriptionCatalogTopicals.js";
import { DENTAL_TAIL_MEDICATIONS } from "./prescriptionCatalogTail.js";
import type { DentalCatalogMedicationItem } from "./prescriptionCatalogTypes.js";
import { getDentalSsotMedicationById } from "./prescriptionCatalogSsot.js";

export * from "./prescriptionCatalogTypes.js";
export * from "./prescriptionCatalogAntibiotics.js";
export * from "./prescriptionCatalogAnalgesics.js";
export * from "./prescriptionCatalogTopicals.js";
export * from "./prescriptionCatalogTail.js";
export * from "./prescriptionRxSets.js";
export * from "./prescriptionCatalogSsot.js";

/**
 * The Complete 56-Item Dental Pharmaceutical Catalog for Russian Dental Clinics.
 */
export const DENTAL_TOP56_MEDICATIONS: readonly DentalCatalogMedicationItem[] = [
	...DENTAL_ANTIBIOTICS,
	...DENTAL_ANALGESICS,
	...DENTAL_TOPICALS,
	...DENTAL_TAIL_MEDICATIONS,
] as const;

/**
 * Lookup helper to find a medication by its ID (SSOT alias-aware with fallback).
 */
export function getDentalMedicationById(id: string): DentalCatalogMedicationItem | undefined {
	return getDentalSsotMedicationById(id) ?? DENTAL_TOP56_MEDICATIONS.find((m) => m.id === id);
}

/**
 * Filter medications by therapeutic class.
 */
export function getDentalMedicationsByCategory(category: string): DentalCatalogMedicationItem[] {
	return DENTAL_TOP56_MEDICATIONS.filter((m) => m.category === category);
}

