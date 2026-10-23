/**
 * DENTE Dental CRM — Endodontics Presets Facade
 * Mandate 8b Architecture: 100% Modular Decomposition (< 120 lines per file)
 */

import { THERAPY_ENDO_PREP_PRESETS } from "./therapyEndoPrepPresets";
import { THERAPY_ENDO_RETREAT_PRESETS } from "./therapyEndoRetreatPresets";
import type { ServicePricelistItem } from "./types";

export const THERAPY_ENDO_PRESETS: readonly ServicePricelistItem[] = [
	...THERAPY_ENDO_PREP_PRESETS,
	...THERAPY_ENDO_RETREAT_PRESETS,
];
