import type { ExpressLabPreset } from "./expressPresetTypes";
import { EXTENDED_PRESETS_CROWNS } from "./extendedPresetsCrowns";
import { EXTENDED_PRESETS_MISC } from "./extendedPresetsMisc";

export const EXTENDED_EXPRESS_LAB_PRESETS: readonly ExpressLabPreset[] = [
	...EXTENDED_PRESETS_CROWNS,
	...EXTENDED_PRESETS_MISC,
];
