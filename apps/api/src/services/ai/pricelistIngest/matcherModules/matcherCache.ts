/**
 * matcherCache.ts — In-Memory LRU Cache for Price List Nomenclature Matches.
 * Optimizes repeated matching of high-volume price lists (1000+ rows).
 * Strictly <= 120 lines.
 */

import type { NomenclatureMatchResult } from "./matcherTypes.js";

const MAX_CACHE_SIZE = 5000;
const matcherCache = new Map<string, NomenclatureMatchResult>();

function buildCacheKey(rawLine: string, cleanedTitle: string): string {
	return `${rawLine.trim()}:::${cleanedTitle.trim()}`;
}

/**
 * Retrieves cached match result if present.
 */
export function getCachedMatch(
	rawLine: string,
	cleanedTitle: string,
): NomenclatureMatchResult | undefined {
	const key = buildCacheKey(rawLine, cleanedTitle);
	return matcherCache.get(key);
}

/**
 * Stores match result in cache, maintaining max capacity.
 */
export function setCachedMatch(
	rawLine: string,
	cleanedTitle: string,
	result: NomenclatureMatchResult,
): void {
	if (matcherCache.size >= MAX_CACHE_SIZE) {
		const firstKey = matcherCache.keys().next().value;
		if (firstKey !== undefined) {
			matcherCache.delete(firstKey);
		}
	}
	const key = buildCacheKey(rawLine, cleanedTitle);
	matcherCache.set(key, result);
}

/**
 * Clears matcher cache (e.g. for testing).
 */
export function clearMatcherCache(): void {
	matcherCache.clear();
}
