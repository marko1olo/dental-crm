/**
 * confidenceScorer.ts — Confidence Scoring (0..100) & Result Formatter.
 * Mandate 8ap: Preserves full statutory match contract and clean domain aliases.
 * Strictly <= 120 lines.
 */

import type {
	NomenclatureMatchResult,
	PriceListConfidenceKind,
	StatutoryNomenclatureEntry,
} from "./matcherTypes.js";

/**
 * Calculates confidence level and kind for keyword matches.
 */
export function scoreKeywordConfidence(highestScore: number): {
	confidence: number;
	confidenceKind: PriceListConfidenceKind;
} {
	if (highestScore >= 50) {
		const confidence = Math.min(0.95, 0.75 + highestScore / 200);
		const confidenceKind: PriceListConfidenceKind =
			confidence >= 0.85 ? "high_keyword" : "medium_keyword";
		return { confidence, confidenceKind };
	}

	if (highestScore > 0) {
		return { confidence: 0.65, confidenceKind: "low_keyword" };
	}

	return { confidence: 0.40, confidenceKind: "fallback" };
}

/**
 * Builds standard NomenclatureMatchResult for exact code matches.
 */
export function buildExactCodeMatchResult(
	normalizedCode: string,
	title: string,
	entry?: StatutoryNomenclatureEntry,
): NomenclatureMatchResult {
	if (entry) {
		return {
			code804n: normalizedCode,
			statutoryTitle804n: entry.title,
			category: entry.category,
			specialty: entry.specialty,
			confidence: 0.98,
			confidenceKind: "exact_code",
			cleanedTitle: title || entry.title,
		};
	}

	return {
		code804n: normalizedCode,
		statutoryTitle804n: title || `Медицинская услуга по номенклатуре ${normalizedCode}`,
		category: "therapy",
		specialty: "therapist",
		confidence: 0.92,
		confidenceKind: "exact_code",
		cleanedTitle: title,
	};
}

/**
 * Builds standard fallback result when no keywords match.
 */
export function buildFallbackMatchResult(cleanedTitle: string): NomenclatureMatchResult {
	return {
		code804n: "A16.07.002",
		statutoryTitle804n: "Восстановление зуба пломбой (терапевтическая стоматология)",
		category: "therapy",
		specialty: "therapist",
		confidence: 0.40,
		confidenceKind: "fallback",
		cleanedTitle,
	};
}
