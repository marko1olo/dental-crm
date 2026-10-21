import type { OrthopedicWorkTypeId, OrthopedicWorkTypeDefinition } from "./orthopedicWorkTypes";
import { FIXED_ORTHOPEDIC_WORK_TYPES } from "./orthopedicCatalogFixed";
import { REMOVABLE_ORTHOPEDIC_WORK_TYPES } from "./orthopedicCatalogRemovable";

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
