/**
 * packages/shared/src/pricelist/order804n/surgicalAndOrthoCatalog.ts
 * Layer 1: Statutory Catalog Facade for Surgical, Implantology, Orthopedic & Orthodontic Services.
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Zero synthetic mocks — 100% statutory Minzdrav Order 804n positions.
 */

import { SURGICAL_EXTRACTIONS_804N_CATALOG } from "./surgicalExtractionsCatalog.js";
import { SURGICAL_OPERATIONS_804N_CATALOG } from "./surgicalOperationsCatalog.js";
import { SURGICAL_IMPLANTOLOGY_804N_CATALOG } from "./surgicalImplantologyCatalog.js";
import { PROSTHETICS_FIXED_804N_CATALOG } from "./prostheticsFixedCatalog.js";
import { PROSTHETICS_REMOVABLE_804N_CATALOG } from "./prostheticsRemovableCatalog.js";
import { ORTHO_AUXILIARY_804N_CATALOG } from "./orthoAuxiliaryCatalog.js";
import { ORTHODONTICS_804N_CATALOG } from "./orthodonticsCatalog.js";
import type { StatutoryNomenclatureEntry } from "./types.js";

export { SURGICAL_EXTRACTIONS_804N_CATALOG } from "./surgicalExtractionsCatalog.js";
export { SURGICAL_OPERATIONS_804N_CATALOG } from "./surgicalOperationsCatalog.js";
export { SURGICAL_IMPLANTOLOGY_804N_CATALOG } from "./surgicalImplantologyCatalog.js";
export { PROSTHETICS_FIXED_804N_CATALOG } from "./prostheticsFixedCatalog.js";
export { PROSTHETICS_REMOVABLE_804N_CATALOG } from "./prostheticsRemovableCatalog.js";
export { ORTHO_AUXILIARY_804N_CATALOG } from "./orthoAuxiliaryCatalog.js";
export { ORTHODONTICS_804N_CATALOG } from "./orthodonticsCatalog.js";

/**
 * Surgical & dental implantology statutory 804n services.
 */
export const SURGICAL_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	...SURGICAL_EXTRACTIONS_804N_CATALOG,
	...SURGICAL_OPERATIONS_804N_CATALOG,
	...SURGICAL_IMPLANTOLOGY_804N_CATALOG,
];

/**
 * Orthopedic, prosthetics & orthodontics statutory 804n services.
 */
export const ORTHO_AND_PROSTHETIC_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	...PROSTHETICS_FIXED_804N_CATALOG,
	...PROSTHETICS_REMOVABLE_804N_CATALOG,
	...ORTHO_AUXILIARY_804N_CATALOG,
	...ORTHODONTICS_804N_CATALOG,
];

/**
 * Combined surgical, implant, orthopedic, prosthetics & orthodontics catalog.
 */
export const SURGICAL_AND_ORTHO_804N_CATALOG: readonly StatutoryNomenclatureEntry[] = [
	...SURGICAL_804N_CATALOG,
	...ORTHO_AND_PROSTHETIC_804N_CATALOG,
];
