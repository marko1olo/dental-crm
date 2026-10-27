/**
 * @file orthoBomSeeds.ts
 * Агрегатор техкарт ортодонтии (брекеты и механика дуг) (Мандат 8b).
 */

import { ORTHO_BRACKETS_BOM_SEEDS } from "./orthoBracketsBomSeeds.js";
import { ORTHO_MECHANICS_BOM_SEEDS } from "./orthoMechanicsBomSeeds.js";
import type { DefaultBomProcedureSeed } from "./types.js";

export const ORTHO_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	...ORTHO_BRACKETS_BOM_SEEDS,
	...ORTHO_MECHANICS_BOM_SEEDS,
];
