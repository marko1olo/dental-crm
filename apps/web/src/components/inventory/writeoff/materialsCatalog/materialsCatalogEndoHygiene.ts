import type { ClinicalMaterialDefinition } from "../clinicalWriteoffPresets.js";
import { MATERIALS_CATALOG_ENDO } from "./materialsCatalogEndo.js";
import { MATERIALS_CATALOG_HYGIENE } from "./materialsCatalogHygiene.js";

export const MATERIALS_CATALOG_ENDO_HYGIENE: readonly ClinicalMaterialDefinition[] = [
	...MATERIALS_CATALOG_ENDO,
	...MATERIALS_CATALOG_HYGIENE,
];
