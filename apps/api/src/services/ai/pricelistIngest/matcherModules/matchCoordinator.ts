/**
 * matchCoordinator.ts — Core Nomenclature Matching Coordination Engine.
 * Combines explicit code normalization, semantic keywords, Levenshtein distance, and caching.
 * Mandate 8b: Strictly <= 120 lines.
 */

import { extractStatutoryCode } from "./codeNormalizer.js";
import { findStatutoryEntryByCode, matchClinicalKeywords } from "./clinicalKeywordMatcher.js";
import {
	buildExactCodeMatchResult,
	buildFallbackMatchResult,
	scoreKeywordConfidence,
} from "./confidenceScorer.js";
import { getCachedMatch, setCachedMatch } from "./matcherCache.js";
import type { NomenclatureMatchResult } from "./matcherTypes.js";
import { ORDER_804N_STATUTORY_REGISTRY } from "./registry/index.js";

/**
 * Matches commercial price line and title to statutory Minzdrav nomenclature.
 */
export function matchOrder804nNomenclature(
	rawLine: string,
	cleanedTitle: string,
): NomenclatureMatchResult {
	const cached = getCachedMatch(rawLine, cleanedTitle);
	if (cached) return cached;

	// 1. Check for explicit statutory code in text
	const codeExtraction = extractStatutoryCode(rawLine, cleanedTitle);
	if (codeExtraction) {
		const entry = findStatutoryEntryByCode(codeExtraction.normalizedCode);
		const result = buildExactCodeMatchResult(
			codeExtraction.normalizedCode,
			codeExtraction.cleanedTitleWithoutCode,
			entry,
		);
		setCachedMatch(rawLine, cleanedTitle, result);
		return result;
	}

	// 2. High-precision keyword matching against statutory entries
	const { bestEntry, highestScore } = matchClinicalKeywords(cleanedTitle);

	if (bestEntry && highestScore > 0) {
		const { confidence, confidenceKind } = scoreKeywordConfidence(highestScore);
		const result: NomenclatureMatchResult = {
			code804n: bestEntry.code,
			statutoryTitle804n: bestEntry.title,
			category: bestEntry.category,
			specialty: bestEntry.specialty,
			confidence,
			confidenceKind,
			cleanedTitle,
		};
		setCachedMatch(rawLine, cleanedTitle, result);
		return result;
	}

	// 3. Fallback to general therapy
	const fallback = buildFallbackMatchResult(cleanedTitle);
	setCachedMatch(rawLine, cleanedTitle, fallback);
	return fallback;
}

/**
 * Clean domain alias without Order 804n in identifier (Mandate 8ap).
 */
export const matchServiceNomenclature = matchOrder804nNomenclature;
export { ORDER_804N_STATUTORY_REGISTRY };
