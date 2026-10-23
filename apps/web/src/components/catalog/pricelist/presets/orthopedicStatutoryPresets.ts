/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Section 4: ОРТОПЕДИЯ И ПРОТЕЗИРОВАНИЕ (A16.07)
 */

import type { ServicePricelistItem } from "./types";
import { ORTHOPEDIC_STATUTORY_PRESETS_PART1 } from "./orthopedicStatutoryPresetsPart1";
import { ORTHOPEDIC_STATUTORY_PRESETS_PART2 } from "./orthopedicStatutoryPresetsPart2";

export * from "./orthopedicStatutoryPresetsPart1";
export * from "./orthopedicStatutoryPresetsPart2";

export const ORTHOPEDIC_STATUTORY_PRESETS: readonly ServicePricelistItem[] = [
	...ORTHOPEDIC_STATUTORY_PRESETS_PART1,
	...ORTHOPEDIC_STATUTORY_PRESETS_PART2,
];
