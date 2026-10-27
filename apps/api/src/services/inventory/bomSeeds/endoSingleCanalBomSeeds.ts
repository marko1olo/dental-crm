/**
 * @file endoSingleCanalBomSeeds.ts
 * Агрегатор техкарт эндодонтии 1-канальных зубов (Мандат 8b).
 */

import { ENDO_SINGLE_CANAL_PREP_BOM_SEED } from "./endoSingleCanalPrepBomSeed.js";
import { ENDO_SINGLE_CANAL_OBTURATING_BOM_SEED } from "./endoSingleCanalObturationBomSeed.js";
import type { DefaultBomProcedureSeed } from "./types.js";

export const ENDO_SINGLE_CANAL_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	ENDO_SINGLE_CANAL_PREP_BOM_SEED,
	ENDO_SINGLE_CANAL_OBTURATING_BOM_SEED,
];
