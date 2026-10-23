/**
 * packages/shared/src/pricelist/order804n/therapeuticAndDiagnosticCatalog.ts
 * Layer 1: Statutory Catalog Facade for Therapeutic, Diagnostic, Hygiene & Pediatric Services.
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import { CONSULTATIONS_804N_CATALOG } from "./consultations804nCatalog.js";
import { ANESTHESIA_804N_CATALOG } from "./anesthesiaCatalog.js";
import { RADIOLOGY_804N_CATALOG } from "./radiologyCatalog.js";
import { THERAPY_CARIES_804N_CATALOG } from "./therapyCariesCatalog.js";
import { THERAPY_ENDO_804N_CATALOG } from "./therapyEndodonticsCatalog.js";
import { HYGIENE_804N_CATALOG } from "./hygieneCatalog.js";
import { PERIODONTOLOGY_804N_CATALOG } from "./periodontologyCatalog.js";
import { PEDIATRIC_804N_CATALOG } from "./pediatricCatalog.js";
import type { StatutoryNomenclatureEntry } from "./types.js";

export { CONSULTATIONS_804N_CATALOG } from "./consultations804nCatalog.js";
export { ANESTHESIA_804N_CATALOG } from "./anesthesiaCatalog.js";
export { RADIOLOGY_804N_CATALOG } from "./radiologyCatalog.js";
export { THERAPY_CARIES_804N_CATALOG } from "./therapyCariesCatalog.js";
export { THERAPY_ENDO_804N_CATALOG } from "./therapyEndodonticsCatalog.js";
export { HYGIENE_804N_CATALOG } from "./hygieneCatalog.js";
export { PERIODONTOLOGY_804N_CATALOG } from "./periodontologyCatalog.js";
export { PEDIATRIC_804N_CATALOG } from "./pediatricCatalog.js";

/**
 * Base statutory 804n catalog covering consultations, anesthesia, imaging, therapy, hygiene & perio.
 */
export const THERAPEUTIC_AND_DIAGNOSTIC_BASE_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	...CONSULTATIONS_804N_CATALOG,
	...ANESTHESIA_804N_CATALOG,
	...RADIOLOGY_804N_CATALOG,
	...THERAPY_CARIES_804N_CATALOG,
	...THERAPY_ENDO_804N_CATALOG,
	...HYGIENE_804N_CATALOG,
	...PERIODONTOLOGY_804N_CATALOG,
];

/**
 * Combined therapeutic, diagnostic and pediatric catalog.
 */
export const THERAPEUTIC_AND_DIAGNOSTIC_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	...THERAPEUTIC_AND_DIAGNOSTIC_BASE_CATALOG,
	...PEDIATRIC_804N_CATALOG,
];
