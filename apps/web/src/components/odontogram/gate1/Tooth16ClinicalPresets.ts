import { TOOTH16_BASE_PRESETS } from "./Tooth16BasePresets";
import { TOOTH16_CROWN_PRESETS } from "./Tooth16CrownPresets";
import { TOOTH16_PATHOLOGY_PRESETS } from "./Tooth16PathologyPresets";
import type { Tooth16Preset } from "./tooth16Types";

export {
	TOOTH16_BASE_PRESETS,
	TOOTH16_CROWN_PRESETS,
	TOOTH16_PATHOLOGY_PRESETS,
};

export const TOOTH16_CLINICAL_PRESETS: Tooth16Preset[] = [
	...TOOTH16_BASE_PRESETS,
	...TOOTH16_CROWN_PRESETS,
	...TOOTH16_PATHOLOGY_PRESETS,
];
