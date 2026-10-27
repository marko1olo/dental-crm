/**
 * @file endoMultiCanalBomSeeds.ts
 * Агрегатор техкарт эндодонтии 3-канальных зубов (Мандат 8b).
 */

import { ENDO_MULTI_CANAL_PREP_BOM_SEED } from "./endoMultiCanalPrepBomSeed.js";
import { ENDO_MULTI_CANAL_OBTURATING_BOM_SEED } from "./endoMultiCanalObturationBomSeed.js";
import type { DefaultBomProcedureSeed } from "./types.js";

export const ENDO_MULTI_CANAL_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	ENDO_MULTI_CANAL_PREP_BOM_SEED,
	ENDO_MULTI_CANAL_OBTURATING_BOM_SEED,
];
