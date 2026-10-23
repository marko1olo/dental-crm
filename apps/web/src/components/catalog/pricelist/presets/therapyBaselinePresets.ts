/**
 * DENTE Dental CRM — Therapy Baseline Services Facade
 * Mandate 8b Architecture: 100% Modular Decomposition (< 120 lines per file)
 */

import { THERAPY_BASELINE_PART1 } from "./therapyBaselinePart1";
import { THERAPY_BASELINE_PART2 } from "./therapyBaselinePart2";
import type { ServicePricelistItem } from "./types";

export const THERAPY_BASELINE_SERVICES: readonly ServicePricelistItem[] = [
	...THERAPY_BASELINE_PART1,
	...THERAPY_BASELINE_PART2,
];
