/**
 * @file endoBomSeeds.ts
 * Агрегатор техкарт эндодонтии (1-канальные и 3-канальные зубы) (Мандат 8b).
 */

import { ENDO_SINGLE_CANAL_BOM_SEEDS } from "./endoSingleCanalBomSeeds.js";
import { ENDO_MULTI_CANAL_BOM_SEEDS } from "./endoMultiCanalBomSeeds.js";
import type { DefaultBomProcedureSeed } from "./types.js";

export const ENDO_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	...ENDO_SINGLE_CANAL_BOM_SEEDS,
	...ENDO_MULTI_CANAL_BOM_SEEDS,
];
