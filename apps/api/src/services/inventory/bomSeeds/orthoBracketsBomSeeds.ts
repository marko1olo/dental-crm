/**
 * @file orthoBracketsBomSeeds.ts
 * Агрегатор техкарт расходных материалов для брекет-систем (Мандат 8b).
 */

import { ORTHO_FULL_ARCH_BRACKETS_BOM_SEEDS } from "./orthoFullArchBracketsBomSeed.js";
import { ORTHO_SINGLE_BRACKET_BOM_SEEDS } from "./orthoSingleBracketBomSeed.js";
import type { DefaultBomProcedureSeed } from "./types.js";

export const ORTHO_BRACKETS_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	...ORTHO_FULL_ARCH_BRACKETS_BOM_SEEDS,
	...ORTHO_SINGLE_BRACKET_BOM_SEEDS,
];
