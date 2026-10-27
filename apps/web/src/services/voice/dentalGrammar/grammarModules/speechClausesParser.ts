/**
 * speechClausesParser.ts — Сегментация речевого потока на фразы и извлечение обновлений зубов
 */

import type { ToothUpdateVoiceItem } from "../types";
import { extractFdiTeethNumbers } from "../toothNumberParser";
import { extractToothSurfaces } from "../surfaceExtractor";
import { matchDiagnosisRule } from "../pathologyClassifier";

export function splitSpeechClauses(text: string): string[] {
	if (!text) return [];
	return text
		.split(/(?:[.;\n]+|\b(?:затем|далее|после этого)\b)/i)
		.map((s) => s.trim())
		.filter((s) => s.length > 1);
}

export function extractTeethUpdatesFromSpeech(
	transcript: string,
	allTeeth: number[],
): { teethUpdates: ToothUpdateVoiceItem[]; seenTeeth: Set<number> } {
	const clauses = splitSpeechClauses(transcript);
	const teethUpdates: ToothUpdateVoiceItem[] = [];
	const seenTeeth = new Set<number>();

	for (const clause of clauses) {
		const clauseTeeth = extractFdiTeethNumbers(clause);
		const diagRule = matchDiagnosisRule(clause);
		const surfaces = extractToothSurfaces(clause);

		if (clauseTeeth.length > 0 && diagRule) {
			for (const toothNum of clauseTeeth) {
				if (!seenTeeth.has(toothNum)) {
					seenTeeth.add(toothNum);
					teethUpdates.push({
						toothNumber: toothNum,
						state: diagRule.toothChartState,
						icd10Code: diagRule.code,
						icd10Title: diagRule.title,
						clinicalStatus: diagRule.status,
						surfaces: surfaces.length > 0 ? surfaces : undefined,
					});
				}
			}
		}
	}

	if (teethUpdates.length === 0 && allTeeth.length > 0) {
		const overallDiag = matchDiagnosisRule(transcript);
		const overallSurfaces = extractToothSurfaces(transcript);
		if (overallDiag) {
			for (const toothNum of allTeeth) {
				if (!seenTeeth.has(toothNum)) {
					seenTeeth.add(toothNum);
					teethUpdates.push({
						toothNumber: toothNum,
						state: overallDiag.toothChartState,
						icd10Code: overallDiag.code,
						icd10Title: overallDiag.title,
						clinicalStatus: overallDiag.status,
						surfaces: overallSurfaces.length > 0 ? overallSurfaces : undefined,
					});
				}
			}
		}
	}

	return { teethUpdates, seenTeeth };
}
