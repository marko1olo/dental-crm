import type { ClinicalVisitItem } from "./types";
import { DEFAULT_CLINICAL_VISITS_PART1 } from "./defaultClinicalVisitsPart1";
import { DEFAULT_CLINICAL_VISITS_PART2 } from "./defaultClinicalVisitsPart2";

export const DEFAULT_CLINICAL_VISITS: ClinicalVisitItem[] = [
	...DEFAULT_CLINICAL_VISITS_PART1,
	...DEFAULT_CLINICAL_VISITS_PART2,
];
