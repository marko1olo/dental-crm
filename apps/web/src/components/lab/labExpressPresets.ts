export {
	type ExpressLabPreset,
	ONE_CLICK_LAB_DEFAULTS,
} from "./expressPresetsModules/expressPresetTypes";

export {
	type LabScheduleSlotInfo,
	buildLabAppointmentDraft,
} from "./expressPresetsModules/labAppointmentDraftHelper";

export {
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	EXPRESS_PRESET_PFM_DUCERAM,
} from "./expressPresetsModules/canonicalCrownPresets";

export {
	EXPRESS_PRESET_IMPLANT_SCREW_RETAINED,
	EXPRESS_PRESET_BRUXISM_SPLINT,
	EXPRESS_PRESET_CUSTOM_ABUTMENT,
	EXPRESS_PRESET_REMOVABLE_ACRY_FREE,
	EXPRESS_PRESET_REMOVABLE_NYLON,
} from "./expressPresetsModules/canonicalImplantSplintPresets";

import type { ExpressLabPreset } from "./expressPresetsModules/expressPresetTypes";
import {
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	EXPRESS_PRESET_PFM_DUCERAM,
} from "./expressPresetsModules/canonicalCrownPresets";
import {
	EXPRESS_PRESET_IMPLANT_SCREW_RETAINED,
	EXPRESS_PRESET_BRUXISM_SPLINT,
	EXPRESS_PRESET_CUSTOM_ABUTMENT,
	EXPRESS_PRESET_REMOVABLE_ACRY_FREE,
} from "./expressPresetsModules/canonicalImplantSplintPresets";
import { EXTENDED_EXPRESS_LAB_PRESETS } from "./expressPresetsModules/extendedExpressPresets";

export const CANONICAL_EXPRESS_LAB_PRESETS: readonly ExpressLabPreset[] = [
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_IMPLANT_SCREW_RETAINED,
	EXPRESS_PRESET_BRUXISM_SPLINT,
	EXPRESS_PRESET_CUSTOM_ABUTMENT,
	EXPRESS_PRESET_REMOVABLE_ACRY_FREE,
] as const;

export const EXPRESS_LAB_PRESETS: ExpressLabPreset[] = [
	...CANONICAL_EXPRESS_LAB_PRESETS,
	...EXTENDED_EXPRESS_LAB_PRESETS,
];
