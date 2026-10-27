/**
 * extractionSimpleAndComplexNorms.ts — Клинические нормы удаления зубов (Мандаты 8e, 8b).
 */
import type { SurgicalOperationNorm } from "@dental/shared";
import { EXTRACTION_SIMPLE_NORM } from "./extractionSimpleNorms";
import { EXTRACTION_COMPLEX_NORM } from "./extractionComplexNorms";

export { EXTRACTION_SIMPLE_NORM } from "./extractionSimpleNorms";
export { EXTRACTION_COMPLEX_NORM } from "./extractionComplexNorms";

export const EXTRACTION_SIMPLE_AND_COMPLEX_NORMS: readonly SurgicalOperationNorm[] = [
	EXTRACTION_SIMPLE_NORM,
	EXTRACTION_COMPLEX_NORM,
];
