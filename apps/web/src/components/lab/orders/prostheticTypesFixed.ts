import type { ProstheticTypeId, ProstheticTypeDefinition } from "./prostheticTypesCatalogTypes";
import { PROSTHETIC_CROWNS_DATA } from "./prostheticCrownsData";
import { PROSTHETIC_RESTORATIONS_DATA } from "./prostheticRestorationsData";

export const PROSTHETIC_TYPES_FIXED: Record<
	| 'crown_zirconia_monolithic'
	| 'crown_pmma_temporary'
	| 'crown_pfm_cocr'
	| 'crown_emax_press'
	| 'veneer_refractory'
	| 'implant_screw_retained_crown'
	| 'removable_clasp_prosthesis'
	| 'all_on_4_hybrid',
	ProstheticTypeDefinition
> = {
	...PROSTHETIC_CROWNS_DATA,
	...PROSTHETIC_RESTORATIONS_DATA,
};
