import {
	ORDER_804N_STATUTORY_REGISTRY,
	type StatutoryNomenclatureEntry,
} from "./order804nRegistry.js";
import type {
	MatchConfidenceKind,
	NomenclatureMatchResult,
} from "./matcherTypesAndUtils.js";

/**
 * Tier 2: Semantic lexical scoring with clinical stems, synonyms, and category boosting.
 */
export function scoreLexicalNomenclature(
	cleanedTitle: string,
	categoryHint: string,
	specialtyHint: string,
): NomenclatureMatchResult | null {
	let bestEntry: StatutoryNomenclatureEntry | null = null;
	let highestScore = 0;
	let bestMatchedKeywords: string[] = [];

	const lowerCleaned = cleanedTitle.toLowerCase();

	for (const entry of ORDER_804N_STATUTORY_REGISTRY) {
		let score = 0;
		const matched: string[] = [];

		for (const pkw of entry.primaryKeywords) {
			if (pkw.test(lowerCleaned)) {
				score += 50;
				matched.push(pkw.source);
			}
		}

		for (const skw of entry.secondaryKeywords) {
			if (skw.test(lowerCleaned)) {
				score += 15;
				matched.push(skw.source);
			}
		}

		if (score > 0) {
			if (categoryHint && entry.category === categoryHint) {
				score += 20;
			}
			if (specialtyHint && specialtyHint !== "universal" && entry.specialty === specialtyHint) {
				score += 15;
			}
		}

		if (score > highestScore) {
			highestScore = score;
			bestEntry = entry;
			bestMatchedKeywords = matched;
		}
	}

	if (bestEntry && highestScore >= 50) {
		const rawConf = 0.75 + highestScore / 250;
		const confidence = Math.min(0.96, Math.round(rawConf * 100) / 100);
		const confidenceKind: MatchConfidenceKind =
			confidence >= 0.85 ? "high_keyword" : "medium_keyword";

		return {
			code804n: bestEntry.code,
			statutoryTitle804n: bestEntry.title,
			category: bestEntry.category,
			specialty: bestEntry.specialty,
			confidence,
			confidenceKind,
			cleanedTitle,
			matchedKeywords: bestMatchedKeywords,
		};
	}

	if (bestEntry && highestScore > 0) {
		const rawConf = 0.55 + highestScore / 200;
		const confidence = Math.min(0.74, Math.round(rawConf * 100) / 100);

		return {
			code804n: bestEntry.code,
			statutoryTitle804n: bestEntry.title,
			category: bestEntry.category,
			specialty: bestEntry.specialty,
			confidence,
			confidenceKind: "low_keyword",
			cleanedTitle,
			matchedKeywords: bestMatchedKeywords,
		};
	}

	return null;
}
