/**
 * @file surgeryImplantBomSeeds.ts
 * Агрегатор техкарт синус-лифтинга и дентальной имплантации (Мандат 8b).
 */

import { SURGERY_SINUS_GRAFT_BOM_SEEDS } from "./surgerySinusGraftBomSeed.js";
import { SURGERY_IMPLANTATION_BOM_SEED } from "./surgeryImplantationBomSeed.js";
import type { DefaultBomProcedureSeed } from "./types.js";

export const SURGERY_IMPLANT_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	...SURGERY_SINUS_GRAFT_BOM_SEEDS,
	SURGERY_IMPLANTATION_BOM_SEED,
];
