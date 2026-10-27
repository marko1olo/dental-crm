/**
 * @file registry.ts
 * Реестр эталонных технологических карт (BOM) расхода стоматологических материалов по 804н.
 */

import { THERAPY_BOM_SEEDS } from "./therapyBomSeeds.js";
import { ENDO_BOM_SEEDS } from "./endoBomSeeds.js";
import { SURGERY_BOM_SEEDS } from "./surgeryBomSeeds.js";
import { PROSTHETICS_BOM_SEEDS } from "./prostheticsBomSeeds.js";
import { ORTHO_BOM_SEEDS } from "./orthoBomSeeds.js";
import type { DefaultBomProcedureSeed } from "./types.js";

export const DEFAULT_804N_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	...THERAPY_BOM_SEEDS,
	...ENDO_BOM_SEEDS,
	...SURGERY_BOM_SEEDS,
	...PROSTHETICS_BOM_SEEDS,
	...ORTHO_BOM_SEEDS,
];
