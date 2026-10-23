/**
 * packages/shared/src/pricelist/order804n/hygieneCatalog.ts
 * Layer 1: Statutory Catalog Facade for Dental Hygiene, Bleaching & Prophylaxis Services.
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import { HYGIENE_PROPHYLAXIS_804N_CATALOG } from "./hygieneProphylaxisCatalog.js";
import { HYGIENE_BLEACHING_AND_FLUORIDE_804N_CATALOG } from "./hygieneBleachingAndFluorideCatalog.js";
import type { StatutoryNomenclatureEntry } from "./types.js";

export { HYGIENE_PROPHYLAXIS_804N_CATALOG } from "./hygieneProphylaxisCatalog.js";
export { HYGIENE_BLEACHING_AND_FLUORIDE_804N_CATALOG } from "./hygieneBleachingAndFluorideCatalog.js";

/**
 * Statutory 804n dental hygiene, bleaching and prophylaxis services.
 */
export const HYGIENE_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	...HYGIENE_PROPHYLAXIS_804N_CATALOG,
	...HYGIENE_BLEACHING_AND_FLUORIDE_804N_CATALOG,
];
