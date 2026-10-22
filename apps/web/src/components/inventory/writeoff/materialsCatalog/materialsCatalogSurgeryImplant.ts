import type { ClinicalMaterialDefinition } from "../clinicalWriteoffPresets.js";
import { MATERIALS_CATALOG_IMPLANT } from "./materialsCatalogImplant.js";
import { MATERIALS_CATALOG_SURGERY } from "./materialsCatalogSurgery.js";

export const MATERIALS_CATALOG_SURGERY_IMPLANT: readonly ClinicalMaterialDefinition[] = [
	...MATERIALS_CATALOG_IMPLANT,
	...MATERIALS_CATALOG_SURGERY,
];
