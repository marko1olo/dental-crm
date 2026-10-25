/**
 * extractionNorms.ts — Реестр хирургических норм удаления зубов (Мандат 8e).
 */

import type { SurgicalOperationNorm } from "@dental/shared";
import { EXTRACTION_SIMPLE_AND_COMPLEX_NORMS } from "./extractionSimpleAndComplexNorms";
import { EXTRACTION_ATYPICAL_NORMS } from "./extractionAtypicalNorms";

export const EXTRACTION_NORMS: readonly SurgicalOperationNorm[] = [
	...EXTRACTION_SIMPLE_AND_COMPLEX_NORMS,
	...EXTRACTION_ATYPICAL_NORMS,
];
