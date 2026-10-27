/**
 * @file therapyBomSeeds.ts
 * Агрегатор техкарт терапевтической стоматологии и гигиены (Мандат 8b).
 */

import { THERAPY_RESTORATION_BOM_SEED } from "./therapyRestorationBomSeed.js";
import { THERAPY_HYGIENE_BOM_SEED } from "./therapyHygieneBomSeed.js";
import type { DefaultBomProcedureSeed } from "./types.js";

export const THERAPY_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	THERAPY_RESTORATION_BOM_SEED,
	THERAPY_HYGIENE_BOM_SEED,
];
