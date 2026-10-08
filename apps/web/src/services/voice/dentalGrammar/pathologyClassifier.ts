/**
 * pathologyClassifier.ts — Layer 2: Классификация патологий МКБ-10 и клинических статусов
 */

import type { DiagnosisRule } from "./types";
import { DENTAL_ICD10_RULES } from "./constants";

export function matchDiagnosisRule(text: string): DiagnosisRule | null {
	if (!text) return null;
	const norm = text.toLowerCase().replace(/ё/g, "е");

	for (const rule of DENTAL_ICD10_RULES) {
		for (const pattern of rule.patterns) {
			const normPattern = pattern.replace(/ё/g, "е");
			if (norm.includes(normPattern)) {
				return rule;
			}
		}
	}
	return null;
}
