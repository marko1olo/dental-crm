/**
 * @file orthoMechanicsBomSeeds.ts
 * Агрегатор техкарт механики ортодонтии (дуги, эластики, сепарация) (Мандат 8b).
 */

import { ORTHO_ARCHWIRE_BOM_SEEDS } from "./orthoArchwireBomSeed.js";
import { ORTHO_ELASTICS_SEPARATION_BOM_SEEDS } from "./orthoElasticsSeparationBomSeed.js";
import type { DefaultBomProcedureSeed } from "./types.js";

export const ORTHO_MECHANICS_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	...ORTHO_ARCHWIRE_BOM_SEEDS,
	...ORTHO_ELASTICS_SEPARATION_BOM_SEEDS,
];
