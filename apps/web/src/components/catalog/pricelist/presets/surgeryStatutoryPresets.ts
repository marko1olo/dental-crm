/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Section 3: ХИРУРГИЯ И ИМПЛАНТАЦИЯ (A16.07)
 */

import type { ServicePricelistItem } from "./types";
import { SURGERY_STATUTORY_PRESETS_PART1 } from "./surgeryStatutoryPart1";
import { SURGERY_STATUTORY_PRESETS_PART2 } from "./surgeryStatutoryPart2";

export * from "./surgeryStatutoryPart1";
export * from "./surgeryStatutoryPart2";

export const SURGERY_STATUTORY_PRESETS: readonly ServicePricelistItem[] = [
	...SURGERY_STATUTORY_PRESETS_PART1,
	...SURGERY_STATUTORY_PRESETS_PART2,
];
