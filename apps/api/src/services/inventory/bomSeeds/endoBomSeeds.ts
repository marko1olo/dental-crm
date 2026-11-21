/**
 * @file endoBomSeeds.ts
 * Агрегатор техкарт эндодонтии (1-, 2-, 3- и 4-канальные зубы, Минздрав 804н) (Мандат 8b).
 */

import { ENDO_SINGLE_CANAL_BOM_SEEDS } from "./endoSingleCanalBomSeeds.js";
import { ENDO_MULTI_CANAL_BOM_SEEDS } from "./endoMultiCanalBomSeeds.js";
import { ENDO_TWO_CANAL_PREP_BOM_SEED } from "./endoTwoCanalPrepBomSeed.js";
import { ENDO_TWO_CANAL_OBTURATING_BOM_SEED } from "./endoTwoCanalObturationBomSeed.js";
import { ENDO_FOUR_CANAL_PREP_BOM_SEED } from "./endoFourCanalPrepBomSeed.js";
import { ENDO_FOUR_CANAL_OBTURATING_BOM_SEED } from "./endoFourCanalObturationBomSeed.js";
import type { DefaultBomProcedureSeed } from "./types.js";

export const ENDO_TWO_CANAL_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	ENDO_TWO_CANAL_PREP_BOM_SEED,
	ENDO_TWO_CANAL_OBTURATING_BOM_SEED,
];

export const ENDO_FOUR_CANAL_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	ENDO_FOUR_CANAL_PREP_BOM_SEED,
	ENDO_FOUR_CANAL_OBTURATING_BOM_SEED,
];

export const ENDO_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	...ENDO_SINGLE_CANAL_BOM_SEEDS,
	...ENDO_TWO_CANAL_BOM_SEEDS,
	...ENDO_MULTI_CANAL_BOM_SEEDS,
	...ENDO_FOUR_CANAL_BOM_SEEDS,
];
