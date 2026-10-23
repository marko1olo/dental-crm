/**
 * DENTE Dental CRM — Clinic Packages Presets Facade
 * Mandate 8b Architecture: 100% Modular Decomposition (< 120 lines per file)
 */

import { PACKAGE_COMPLEX_PRESETS } from "./packageComplexPresets";
import { PACKAGE_GIFT_KAPA_PRESETS } from "./packageGiftKapaPresets";
import type { ServicePricelistItem } from "./types";

export const PACKAGE_STATUTORY_PRESETS: readonly ServicePricelistItem[] = [
	...PACKAGE_GIFT_KAPA_PRESETS,
	...PACKAGE_COMPLEX_PRESETS,
];
