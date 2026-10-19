import type { Tooth46PresetDef } from "./Tooth46BasePresets";
import { PATHOLOGY_PART1 } from "./Tooth46PathologyPresetsPart1";
import { PATHOLOGY_PART2 } from "./Tooth46PathologyPresetsPart2";

export const TOOTH46_PATHOLOGY_PRESETS: readonly Tooth46PresetDef[] = [
	...PATHOLOGY_PART1,
	...PATHOLOGY_PART2,
];
