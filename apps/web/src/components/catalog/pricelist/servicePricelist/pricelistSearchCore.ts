/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Pricelist Fast Search & Clinical Synonym Filtering
 */

import type { ServicePricelistItem } from "../servicePricelistPresets";
import { calculateServiceProfitability } from "./profitabilityCalculator";
import {
	getClinicalSynonyms,
	normalizeSearchText,
} from "./serviceCodesAndSynonyms";
import { getItemSearchIndex } from "./pricelistSearchIndex";
import type { SearchPricelistQuery } from "./types";

export function searchPricelistItems(
	items: readonly ServicePricelistItem[],
	query: SearchPricelistQuery | string,
): readonly ServicePricelistItem[] {
	const normalizedQuery: SearchPricelistQuery =
		typeof query === "string" ? { searchTerm: query } : (query ?? {});
	const rawSearch = normalizedQuery.searchTerm?.trim() ?? "";
	const normSearch = normalizeSearchText(rawSearch);
	const searchTokens =
		normSearch.length > 0
			? normSearch.split(" ").filter((t) => t.length > 0)
			: [];
	const searchCleanCode = rawSearch.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

	const categoryFilter =
		normalizedQuery.category && normalizedQuery.category !== "all"
			? normalizedQuery.category
			: null;
	const specialtyFilter =
		normalizedQuery.specialty && normalizedQuery.specialty !== "all"
			? normalizedQuery.specialty
			: null;
	const profitFilter =
		normalizedQuery.profitabilityLevel &&
		normalizedQuery.profitabilityLevel !== "all"
			? normalizedQuery.profitabilityLevel
			: null;
	const includeArchived = normalizedQuery.includeArchived ?? false;
	const minPriceFilter = normalizedQuery.minPriceRub;
	const maxPriceFilter = normalizedQuery.maxPriceRub;

	const preparedTokens: Array<{ token: string; synonyms: readonly string[] }> =
		[];
	for (let i = 0; i < searchTokens.length; i++) {
		const token = searchTokens[i];
		if (!token) continue;
		preparedTokens.push({
			token,
			synonyms: getClinicalSynonyms(token),
		});
	}

	return items.filter((item) => {
		if (!includeArchived && item.isArchived) return false;
		if (
			categoryFilter &&
			item.category !== categoryFilter &&
			searchTokens.length === 0 &&
			searchCleanCode.length === 0
		) {
			return false;
		}
		if (specialtyFilter && item.specialty !== specialtyFilter) return false;
		if (minPriceFilter !== undefined && item.basePriceRub < minPriceFilter) return false;
		if (maxPriceFilter !== undefined && item.basePriceRub > maxPriceFilter) return false;
		if (profitFilter) {
			const prof = calculateServiceProfitability(item);
			if (prof.level !== profitFilter) return false;
		}

		if (preparedTokens.length === 0) return true;

		const index = getItemSearchIndex(item);

		if (
			searchCleanCode.length > 0 &&
			index.cleanCode.includes(searchCleanCode)
		) {
			return true;
		}

		for (let i = 0; i < preparedTokens.length; i++) {
			const pt = preparedTokens[i];
			if (!pt) continue;
			if (index.searchableText.includes(pt.token)) continue;
			let foundSynonym = false;
			const synonyms = pt.synonyms;
			for (let s = 0; s < synonyms.length; s++) {
				const syn = synonyms[s];
				if (syn && index.searchableText.includes(syn)) {
					foundSynonym = true;
					break;
				}
			}
			if (!foundSynonym) return false;
		}

		return true;
	});
}

export function searchPricelist(
	items: readonly ServicePricelistItem[],
	searchTerm: string,
): readonly ServicePricelistItem[] {
	return searchPricelistItems(items, { searchTerm });
}
