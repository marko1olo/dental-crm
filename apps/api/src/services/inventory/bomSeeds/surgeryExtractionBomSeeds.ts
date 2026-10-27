/**
 * @file surgeryExtractionBomSeeds.ts
 * Агрегатор техкарт хирургических удалений зубов (Мандат 8b).
 */

import { SURGERY_SIMPLE_EXTRACTION_BOM_SEED } from "./surgerySimpleExtractionBomSeed.js";
import { SURGERY_COMPLEX_EXTRACTION_BOM_SEEDS } from "./surgeryComplexExtractionBomSeed.js";
import type { DefaultBomProcedureSeed } from "./types.js";

export const SURGERY_EXTRACTION_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	SURGERY_SIMPLE_EXTRACTION_BOM_SEED,
	...SURGERY_COMPLEX_EXTRACTION_BOM_SEEDS,
];
