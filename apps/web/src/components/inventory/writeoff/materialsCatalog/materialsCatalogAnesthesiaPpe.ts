import type { ClinicalMaterialDefinition } from "../clinicalWriteoffPresets.js";
import { MATERIALS_CATALOG_ANESTHESIA } from "./materialsCatalogAnesthesia.js";
import { MATERIALS_CATALOG_PPE } from "./materialsCatalogPpe.js";

export const MATERIALS_CATALOG_ANESTHESIA_PPE: readonly ClinicalMaterialDefinition[] = [
	...MATERIALS_CATALOG_ANESTHESIA,
	...MATERIALS_CATALOG_PPE,
];
