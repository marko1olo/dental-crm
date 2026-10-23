/**
 * DENTE Dental CRM — Therapy & Hygiene Presets Facade
 * Mandate 8b Architecture: 100% Modular Decomposition (< 120 lines per file)
 */

import { THERAPY_CARIES_PRESETS } from "./therapyCariesPresets";
import { THERAPY_ENDO_PRESETS } from "./therapyEndoPresets";
import type { ServicePricelistItem } from "./types";

export {
	HYGIENE_STATUTORY_PRESETS,
	HYGIENE_BASELINE_SERVICES,
} from "./hygienePresets";
export { THERAPY_BASELINE_SERVICES } from "./therapyBaselinePresets";

/**
 * Section 2: ТЕРАПИЯ И ЭНДОДОНТИЯ (A16.07)
 */
export const THERAPY_STATUTORY_PRESETS: readonly ServicePricelistItem[] = [
	...THERAPY_CARIES_PRESETS,
	...THERAPY_ENDO_PRESETS,
];
