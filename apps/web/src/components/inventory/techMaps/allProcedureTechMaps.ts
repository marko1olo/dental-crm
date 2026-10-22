import type { ProcedureTechMap } from "../inventoryMath.js";
import { COMMON_PPE_TECH_MAP, STERILIZATION_KRAFT_TECH_MAP } from "./commonPpeTechMap.js";
import { ANESTHESIA_TECH_MAP, CARIES_TREATMENT_TECH_MAP } from "./anesthesiaAndCariesTechMaps.js";
import { ENDO_1_CANAL_TECH_MAP, ENDO_MULTI_CANAL_TECH_MAP } from "./endoTechMaps.js";
import { HYGIENE_TECH_MAP, SURGERY_EXTRACTION_TECH_MAP } from "./surgeryAndHygieneTechMaps.js";
import { IMPLANT_PLACEMENT_TECH_MAP, BONE_GRAFT_GBR_TECH_MAP } from "./implantAndGbrTechMaps.js";

/**
 * Полный каталог стандартных технологических карт
 */
export const ALL_PROCEDURE_TECH_MAPS: readonly ProcedureTechMap[] = [
	COMMON_PPE_TECH_MAP,
	STERILIZATION_KRAFT_TECH_MAP,
	ANESTHESIA_TECH_MAP,
	CARIES_TREATMENT_TECH_MAP,
	ENDO_1_CANAL_TECH_MAP,
	ENDO_MULTI_CANAL_TECH_MAP,
	HYGIENE_TECH_MAP,
	SURGERY_EXTRACTION_TECH_MAP,
	IMPLANT_PLACEMENT_TECH_MAP,
	BONE_GRAFT_GBR_TECH_MAP,
];

/**
 * Быстрый поиск техкарты по коду процедуры или названию
 */
export function findTechMapByCodeOrTitle(query: string): ProcedureTechMap | undefined {
	const q = query.trim().toLowerCase();
	return ALL_PROCEDURE_TECH_MAPS.find(
		(tm) => tm.code.toLowerCase() === q || tm.title.toLowerCase().includes(q) || tm.id.toLowerCase() === q,
	);
}
