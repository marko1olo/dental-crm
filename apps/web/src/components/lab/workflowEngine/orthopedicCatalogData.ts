import type { OrthopedicWorkTypeId, OrthopedicWorkTypeDefinition } from "./orthopedicWorkTypes";
import { FIXED_ORTHOPEDIC_WORK_TYPES } from "./orthopedicCatalogFixed";
import { REMOVABLE_ORTHOPEDIC_WORK_TYPES } from "./orthopedicCatalogRemovable";
import { DENTAL_LAB_CONSTRUCTIONS } from "@dental/shared";

export { DENTAL_LAB_CONSTRUCTIONS } from "@dental/shared";

export const ORTHOPEDIC_WORK_TYPES: Record<OrthopedicWorkTypeId, OrthopedicWorkTypeDefinition> = {
	...FIXED_ORTHOPEDIC_WORK_TYPES,
	...REMOVABLE_ORTHOPEDIC_WORK_TYPES,
};

export const ORDERED_MARKET_ORTHOPEDIC_TYPES: readonly OrthopedicWorkTypeId[] = [
	"crown_zirconia",
	"crown_emax",
	"metal_ceramic",
	"temporary_pmma",
	"clasp_prosthesis",
	"custom_abutment",
	"removable_acrylic",
	"aligners",
] as const;

/**
 * Получить каноническое определение конструкции из SSOT @dental/shared.
 */
export function getCanonicalLabConstruction(typeId: OrthopedicWorkTypeId) {
	const item = ORTHOPEDIC_WORK_TYPES[typeId];
	if (!item?.canonicalConstructionId) return null;
	return DENTAL_LAB_CONSTRUCTIONS[item.canonicalConstructionId] ?? null;
}
