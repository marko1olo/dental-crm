/**
 * DENTE Dental CRM — Clinical Presets for Tooth 46 Gate 0
 * Authentic clinical pathology & restorative states (Mandate 8b <= 120 lines).
 */

import { TOOTH46_ADVANCED_PRESETS } from "./Tooth46AdvancedPresets";
import {
	TOOTH46_BASE_PRESETS,
	type Tooth46PresetDef,
} from "./Tooth46BasePresets";
import { TOOTH46_CARIES_DEPTH_PRESETS } from "./Tooth46CariesDepthPresets";
import { TOOTH46_CARIES_PRESETS } from "./Tooth46CariesPresets";
import { TOOTH46_CROWN_PRESETS } from "./Tooth46CrownPresets";
import { TOOTH46_PATHOLOGY_PRESETS } from "./Tooth46PathologyPresets";

export type { Tooth46PresetDef } from "./Tooth46BasePresets";

export const TOOTH46_PRESETS: readonly Tooth46PresetDef[] = [
	...TOOTH46_BASE_PRESETS,
	...TOOTH46_CARIES_PRESETS,
	...TOOTH46_CARIES_DEPTH_PRESETS,
	...TOOTH46_CROWN_PRESETS,
	...TOOTH46_PATHOLOGY_PRESETS,
	...TOOTH46_ADVANCED_PRESETS,
];
