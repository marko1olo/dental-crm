export {
	type ProstheticTypeId,
	type ProstheticCategory,
	type ProstheticTypeDefinition,
} from "./prostheticTypesCatalogTypes";

import type { ProstheticTypeId, ProstheticTypeDefinition } from "./prostheticTypesCatalogTypes";
import { PROSTHETIC_TYPES_FIXED } from "./prostheticTypesFixed";
import { PROSTHETIC_TYPES_DIGITAL_ORTHO } from "./prostheticTypesDigitalOrtho";

export const PROSTHETIC_TYPES: Record<ProstheticTypeId, ProstheticTypeDefinition> = {
	...PROSTHETIC_TYPES_FIXED,
	...PROSTHETIC_TYPES_DIGITAL_ORTHO,
};
