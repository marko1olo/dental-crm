/**
 * diagnosisExtractor.ts — Агрегатор каталога диагнозов и извлечение из речи.
 */

import type { DiagnosisDefinition } from "../types";
import { THERAPY_DIAGNOSES } from "./therapyDictionary";
import { SURGERY_DIAGNOSES } from "./surgeryDictionary";
import { PROSTHETICS_DIAGNOSES } from "./prostheticsDictionary";
import { PERIO_DIAGNOSES } from "./perioDictionary";

export const CLINICAL_DIAGNOSES_CATALOG: DiagnosisDefinition[] = [
	...THERAPY_DIAGNOSES,
	...SURGERY_DIAGNOSES,
	...PROSTHETICS_DIAGNOSES,
	...PERIO_DIAGNOSES,
];

export function extractClinicalDiagnoses(
	text: string,
): DiagnosisDefinition | null {
	if (!text) return null;
	const norm = text.toLowerCase().replace(/ё/g, "е");

	for (const item of CLINICAL_DIAGNOSES_CATALOG) {
		for (const pattern of item.patterns) {
			const normPattern = pattern.replace(/ё/g, "е");
			if (norm.includes(normPattern)) {
				return item;
			}
		}
	}
	return null;
}
