/**
 * @file surgeryComplexExtractionBomSeed.ts
 * Агрегатор техкарт сложных и ретинированных удалений зубов (Мандат 8b).
 */

import { SURGERY_ROOT_SEPARATION_BOM_SEED } from "./surgeryRootSeparationBomSeed.js";
import { SURGERY_RETAINED_TOOTH_BOM_SEED } from "./surgeryRetainedToothBomSeed.js";
import type { DefaultBomProcedureSeed } from "./types.js";

export const SURGERY_COMPLEX_EXTRACTION_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	SURGERY_ROOT_SEPARATION_BOM_SEED,
	SURGERY_RETAINED_TOOTH_BOM_SEED,
];
