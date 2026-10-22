import type { ClinicalMaterialDefinition } from "./clinicalWriteoffPresets.js";
import { MATERIALS_CATALOG_THERAPY } from "./materialsCatalog/materialsCatalogTherapy.js";
import { MATERIALS_CATALOG_ENDO_HYGIENE } from "./materialsCatalog/materialsCatalogEndoHygiene.js";
import { MATERIALS_CATALOG_SURGERY_IMPLANT } from "./materialsCatalog/materialsCatalogSurgeryImplant.js";
import { MATERIALS_CATALOG_ANESTHESIA_PPE } from "./materialsCatalog/materialsCatalogAnesthesiaPpe.js";

export const CLINICAL_MATERIALS_CATALOG: readonly ClinicalMaterialDefinition[] = [
	...MATERIALS_CATALOG_THERAPY,
	...MATERIALS_CATALOG_ENDO_HYGIENE,
	...MATERIALS_CATALOG_SURGERY_IMPLANT,
	...MATERIALS_CATALOG_ANESTHESIA_PPE,
];

export function getClinicalMaterialById(materialId: string): ClinicalMaterialDefinition | undefined {
	return CLINICAL_MATERIALS_CATALOG.find((m) => m.id === materialId);
}
