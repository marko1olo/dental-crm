/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Pricelist Search Index & Cache
 */

import {
	CATEGORY_LABELS,
	SPECIALTY_LABELS,
	type ServicePricelistItem,
} from "../servicePricelistPresets";
import { normalizeSearchText } from "./serviceCodesAndSynonyms";

export interface ItemSearchIndex {
	readonly searchableText: string;
	readonly cleanCode: string;
}

const itemSearchIndexCache = new WeakMap<
	ServicePricelistItem,
	ItemSearchIndex
>();

export function getItemSearchIndex(item: ServicePricelistItem): ItemSearchIndex {
	let cached = itemSearchIndexCache.get(item);
	if (!cached) {
		const rawCode = item.statutoryCode || item.code804n;
		const statTitle = item.statutoryTitle || item.statutoryTitle804n;
		const cleanCode = rawCode.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
		const catLabel = CATEGORY_LABELS[item.category] ?? "";
		const specLabel = SPECIALTY_LABELS[item.specialty] ?? "";
		const tagsStr = item.tags.length > 0 ? item.tags.join(" ") : "";
		const icdStr =
			item.icd10Indications.length > 0 ? item.icd10Indications.join(" ") : "";
		const searchableText = normalizeSearchText(
			`${rawCode} ${item.commercialTitle} ${statTitle} ${tagsStr} ${icdStr} ${catLabel} ${specLabel}`,
		);
		cached = { searchableText, cleanCode };
		itemSearchIndexCache.set(item, cached);
	}
	return cached;
}
