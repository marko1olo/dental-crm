/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Facade: Clinical Synonyms Dictionary: Therapy, Surgery, Hygiene & Diagnostics
 */

import { CLINICAL_SYNONYMS_THERAPY } from "./clinicalSynonymsTherapy";
import { CLINICAL_SYNONYMS_SURGERY } from "./clinicalSynonymsSurgery";

export * from "./clinicalSynonymsTherapy";
export * from "./clinicalSynonymsSurgery";

export const CLINICAL_SYNONYMS_THERAPY_SURGERY: Record<string, readonly string[]> = {
	...CLINICAL_SYNONYMS_THERAPY,
	...CLINICAL_SYNONYMS_SURGERY,
};
