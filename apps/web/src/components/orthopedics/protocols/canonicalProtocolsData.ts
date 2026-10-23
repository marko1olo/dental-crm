import type { OrthopedicProtocolPreset } from "./orthopedicProtocolTypes.js";
import { ORTHOPEDIC_FIXED_PROTOCOLS } from "./protocolsFixed.js";
import { ORTHOPEDIC_TRY_IN_AND_TEMP_PROTOCOLS } from "./protocolsTryInAndTemp.js";
import { ORTHOPEDIC_REMOVABLE_AND_NORM_PROTOCOLS } from "./protocolsRemovableAndNorm.js";

export const ORTHOPEDIC_CANONICAL_PROTOCOLS: readonly OrthopedicProtocolPreset[] = [
	...ORTHOPEDIC_FIXED_PROTOCOLS,
	...ORTHOPEDIC_TRY_IN_AND_TEMP_PROTOCOLS,
	...ORTHOPEDIC_REMOVABLE_AND_NORM_PROTOCOLS,
] as const;
