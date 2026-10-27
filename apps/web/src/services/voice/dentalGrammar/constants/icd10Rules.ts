/**
 * icd10Rules.ts — Сводный реестр правил МКБ-10
 */

import type { DiagnosisRule } from "../types";
import { DENTAL_ICD10_PATHOLOGY_RULES } from "./icd10RulesPathology";
import { DENTAL_ICD10_RESTORATION_RULES } from "./icd10RulesRestoration";

export const DENTAL_ICD10_RULES: readonly DiagnosisRule[] = [
	...DENTAL_ICD10_PATHOLOGY_RULES,
	...DENTAL_ICD10_RESTORATION_RULES,
];
