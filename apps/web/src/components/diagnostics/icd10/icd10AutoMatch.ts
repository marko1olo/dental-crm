import type { DentalIcd10Item } from "../icd10DentalCatalog";
import type { Icd10SearchResult } from "./icd10Types";
import { parseQuery } from "./icd10QueryParser";
import { search } from "./icd10SearchEngine";

export interface Icd10AutoMatchResult {
	primaryMatch: DentalIcd10Item | null;
	detectedToothNumber: number | null;
	allMatches: Icd10SearchResult[];
	confidence: number;
}

/**
 * Автоматический анализ дневниковых записей врача или жалоб пациента для рекомендации диагноза МКБ-10.
 */
export function autoMatchFromClinicalText(clinicalText: string): Icd10AutoMatchResult {
	if (!clinicalText || !clinicalText.trim()) {
		return {
			primaryMatch: null,
			detectedToothNumber: null,
			allMatches: [],
			confidence: 0,
		};
	}

	const parsed = parseQuery(clinicalText);
	const searchResults = search(parsed.cleanedQuery, {
		selectedToothNumber: parsed.extractedToothNumber,
		limit: 10,
	});

	const top = searchResults[0];
	if (!top) {
		return {
			primaryMatch: null,
			detectedToothNumber: parsed.extractedToothNumber,
			allMatches: [],
			confidence: 0,
		};
	}

	const baseConfidence = top.score / 600;
	const confidence = Math.min(0.99, Math.max(0.2, Number(baseConfidence.toFixed(2))));

	return {
		primaryMatch: top.item,
		detectedToothNumber: parsed.extractedToothNumber,
		allMatches: searchResults,
		confidence,
	};
}
