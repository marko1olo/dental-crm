/**
 * @file surgeryBomSeeds.ts
 * Агрегатор техкарт хирургии и имплантации (Мандат 8b).
 */

import { SURGERY_EXTRACTION_BOM_SEEDS } from "./surgeryExtractionBomSeeds.js";
import { SURGERY_IMPLANT_BOM_SEEDS } from "./surgeryImplantBomSeeds.js";
import type { DefaultBomProcedureSeed } from "./types.js";

export const SURGERY_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	...SURGERY_EXTRACTION_BOM_SEEDS,
	...SURGERY_IMPLANT_BOM_SEEDS,
];
