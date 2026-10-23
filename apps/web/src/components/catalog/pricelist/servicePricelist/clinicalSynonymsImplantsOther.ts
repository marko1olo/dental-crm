/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Facade: Clinical Synonyms Dictionary: Implants, Orthodontics, Packages & Periodontics
 */

import { CLINICAL_SYNONYMS_IMPLANTS_ANESTHESIA } from "./clinicalSynonymsImplantsAnesthesia";
import { CLINICAL_SYNONYMS_ORTHO_PACKAGES } from "./clinicalSynonymsOrthoPackages";

export * from "./clinicalSynonymsImplantsAnesthesia";
export * from "./clinicalSynonymsOrthoPackages";

export const CLINICAL_SYNONYMS_IMPLANTS_OTHER: Record<string, readonly string[]> = {
	...CLINICAL_SYNONYMS_IMPLANTS_ANESTHESIA,
	...CLINICAL_SYNONYMS_ORTHO_PACKAGES,
};
