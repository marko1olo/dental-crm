/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/autoclavePresetsDefinitions.ts
 *
 * Сводный реестр пресетов автоклавов и сухожаров.
 * Мандат 8b: строго <= 120 строк.
 */

import {
	SANPIN_DRY_HEAT_160_150_PRESET,
	SANPIN_DRY_HEAT_180_60_PRESET,
} from "./autoclaveDryHeatPresets.js";
import {
	SANPIN_AUTOCLAVE_DELICATE_121_PRESET,
	SANPIN_AUTOCLAVE_PRION_134_PRESET,
	SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET,
	SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET,
	SANPIN_AUTOCLAVE_VACUUM_TEST_PRESET,
} from "./autoclaveSteamPresets.js";
import type { SterilizationCyclePreset } from "./types.js";

export * from "./autoclaveDryHeatPresets.js";
export * from "./autoclaveSteamPresets.js";

export const SANPIN_AUTOCLAVE_CLASS_B_PRESET =
	SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET;

export const AUTOCLAVE_CYCLE_PRESETS: readonly SterilizationCyclePreset[] = [
	{ id: "universal_134", ...SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET },
	{ id: "standard_132_20", ...SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET },
	{ id: "prion_134_20", ...SANPIN_AUTOCLAVE_PRION_134_PRESET },
	{ id: "delicate_121_20", ...SANPIN_AUTOCLAVE_DELICATE_121_PRESET },
	{ id: "dry_heat_180_60", ...SANPIN_DRY_HEAT_180_60_PRESET },
	{ id: "dry_heat_160_150", ...SANPIN_DRY_HEAT_160_150_PRESET },
	{ id: "bowie_dick_vacuum", ...SANPIN_AUTOCLAVE_VACUUM_TEST_PRESET },
];
