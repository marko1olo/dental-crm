/**
 * anesthesiaTechniqueCatalog.ts — Catalogs for Dental Needles, Drugs & Techniques
 * Standards: Минздрав РФ, СтАР. Mandate 8b (<= 120 lines SSOT Facade).
 */

import {
	ANESTHETIC_DRUGS_CATALOG,
	type AnestheticDrugInfo,
	DENTAL_ANESTHETICS,
} from "./anesthesiaDrugCatalogData";
import { DENTAL_NEEDLE_CATALOG } from "./anesthesiaNeedleCatalog";
import { INFILTRATION_TECHNIQUES } from "./anesthesiaTechniquesInfiltration";
import { MANDIBULAR_TECHNIQUES } from "./anesthesiaTechniquesMandibular";
import { MAXILLARY_TECHNIQUES } from "./anesthesiaTechniquesMaxillary";
import type {
	ConductionTechniqueId,
	TechniqueSpecification,
} from "./anesthesiaTechniqueTypes";

export {
	ANESTHETIC_DRUGS_CATALOG,
	type AnestheticDrugInfo,
	DENTAL_ANESTHETICS,
	DENTAL_NEEDLE_CATALOG,
};

export const CONDUCTION_TECHNIQUES_CATALOG: Record<
	ConductionTechniqueId,
	TechniqueSpecification
> = {
	...MANDIBULAR_TECHNIQUES,
	...MAXILLARY_TECHNIQUES,
	...INFILTRATION_TECHNIQUES,
} as Record<ConductionTechniqueId, TechniqueSpecification>;
