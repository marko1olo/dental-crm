/**
 * packages/shared/src/pricelist/order804n/order804nSearchEngine.ts
 * Layer 2: Ranking Search & Statistical Breakdown for Statutory 804n Services.
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Pure Layer 2 domain logic without DOM or network dependencies.
 */

import type { ServiceCategory } from "../../schemas/aiAndEgiszSchemas.js";
import { ORDER_804N_STATUTORY_REGISTRY, normalize804nCode } from "./order804nCodeValidation.js";
import { tokenizeAndStem } from "./order804nStemmer.js";
import type {
	Order804nCategorySummary,
	Order804nSearchOptions,
	Order804nSearchResult,
} from "./types.js";

/**
 * High-performance search & ranking over Order 804n registry with code, keyword and fuzzy matching.
 */
export function search804nRegistry(
	query: string,
	options?: Order804nSearchOptions,
): readonly Order804nSearchResult[] {
	const rawQuery = (query || "").trim();
	if (!rawQuery && !options?.codeHint) return [];

	const normalizedCodeQuery = normalize804nCode(options?.codeHint || rawQuery);
	const results: Order804nSearchResult[] = [];

	const catFilters = options?.categoryFilter
		? Array.isArray(options.categoryFilter)
			? options.categoryFilter
			: [options.categoryFilter]
		: undefined;

	const specFilters = options?.specialtyFilter
		? Array.isArray(options.specialtyFilter)
			? options.specialtyFilter
			: [options.specialtyFilter]
		: undefined;

	const queryStems = tokenizeAndStem(rawQuery);
	const maxResults = options?.maxResults ?? 20;
	const threshold = options?.threshold ?? 0.2;

	for (const entry of ORDER_804N_STATUTORY_REGISTRY) {
		if (catFilters && !catFilters.includes(entry.category)) continue;
		if (specFilters && !specFilters.includes(entry.specialty) && entry.specialty !== "universal") {
			continue;
		}

		if (normalizedCodeQuery && entry.code === normalizedCodeQuery) {
			results.push({ entry, score: 1.0, matchType: "exact_code", matchedTerm: entry.code });
			continue;
		}

		if (normalizedCodeQuery && normalizedCodeQuery.startsWith(entry.code)) {
			results.push({ entry, score: 0.95, matchType: "prefix_code", matchedTerm: entry.code });
			continue;
		}

		let score = 0;
		let matchType: Order804nSearchResult["matchType"] = "fuzzy";
		let matchedTerm: string | undefined;

		for (const reg of entry.primaryKeywords) {
			if (reg.test(rawQuery)) {
				score += 0.55;
				matchType = "primary_keyword";
				matchedTerm = reg.source;
				break;
			}
		}

		for (const reg of entry.secondaryKeywords) {
			if (reg.test(rawQuery)) {
				score += 0.25;
				if (!matchedTerm) {
					matchType = "secondary_keyword";
					matchedTerm = reg.source;
				}
				break;
			}
		}

		if (queryStems.length > 0) {
			const titleStems = tokenizeAndStem(entry.title);
			let stemMatches = 0;
			for (const qs of queryStems) {
				if (titleStems.some((ts) => ts.includes(qs) || qs.includes(ts))) {
					stemMatches++;
				}
			}
			score += (stemMatches / queryStems.length) * 0.4;
		}

		if (score >= threshold) {
			results.push({ entry, score: Math.min(score, 0.99), matchType, matchedTerm });
		}
	}

	results.sort((a, b) => b.score - a.score);
	return results.slice(0, maxResults);
}

/**
 * Computes breakdown summaries per service category across Order 804n registry.
 */
export function get804nCategorySummaries(): readonly Order804nCategorySummary[] {
	const catMap = new Map<ServiceCategory, { count: number; sum: number }>();
	for (const entry of ORDER_804N_STATUTORY_REGISTRY) {
		const curr = catMap.get(entry.category) || { count: 0, sum: 0 };
		curr.count++;
		curr.sum += entry.defaultPriceRub;
		catMap.set(entry.category, curr);
	}

	const summaries: Order804nCategorySummary[] = [];
	for (const [category, stats] of catMap.entries()) {
		summaries.push({
			category,
			count: stats.count,
			totalAveragePriceRub: Math.round(stats.sum / stats.count),
		});
	}
	return summaries.sort((a, b) => b.count - a.count);
}
