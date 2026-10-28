/**
 * clinicalKeywordMatcher.ts — Semantic Keyword Matching against Statutory Clinical Entries.
 * Scores primary keywords (+50) and secondary keywords (+15).
 * Strictly <= 120 lines.
 */

import type { KeywordScoringMatch } from "./matcherTypes.js";
import { ORDER_804N_STATUTORY_REGISTRY } from "./registry/index.js";
import type { StatutoryNomenclatureEntry } from "../types.js";

/**
 * Evaluates semantic match of a commercial procedure title against statutory entries.
 */
export function matchClinicalKeywords(
	cleanedTitle: string,
	registry: readonly StatutoryNomenclatureEntry[] = ORDER_804N_STATUTORY_REGISTRY,
): KeywordScoringMatch {
	let bestEntry: StatutoryNomenclatureEntry | null = null;
	let highestScore = 0;
	let matchedKeywordCount = 0;

	for (const entry of registry) {
		let score = 0;
		let keywordHits = 0;

		// Primary keywords give major weight (+50)
		for (const pkw of entry.primaryKeywords) {
			if (pkw.test(cleanedTitle)) {
				score += 50;
				keywordHits++;
			}
		}

		// Secondary keywords give minor weight (+15)
		for (const skw of entry.secondaryKeywords) {
			if (skw.test(cleanedTitle)) {
				score += 15;
				keywordHits++;
			}
		}

		if (score > highestScore) {
			highestScore = score;
			bestEntry = entry;
			matchedKeywordCount = keywordHits;
		}
	}

	return {
		bestEntry,
		highestScore,
		matchedKeywordCount,
	};
}

/**
 * Finds statutory entry by exact code match or prefix match.
 */
export function findStatutoryEntryByCode(
	normalizedCode: string,
	registry: readonly StatutoryNomenclatureEntry[] = ORDER_804N_STATUTORY_REGISTRY,
): StatutoryNomenclatureEntry | undefined {
	return registry.find(
		(e) => e.code === normalizedCode || normalizedCode.startsWith(e.code),
	);
}
