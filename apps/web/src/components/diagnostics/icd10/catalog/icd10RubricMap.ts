import type { DentalIcd10RubricMeta } from "../../icd10Types";
import { DENTAL_ICD10_RUBRIC_MAP_PART1 } from "./icd10RubricMapPart1";
import { DENTAL_ICD10_RUBRIC_MAP_PART2 } from "./icd10RubricMapPart2";

export const DENTAL_ICD10_RUBRIC_MAP: Readonly<Record<string, DentalIcd10RubricMeta>> = {
	...DENTAL_ICD10_RUBRIC_MAP_PART1,
	...DENTAL_ICD10_RUBRIC_MAP_PART2,
};
