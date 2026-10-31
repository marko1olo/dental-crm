/**
 * DENTE Dental CRM — State Hook for Price Diff Panes & Service Mapping
 * Unified SSOT Presentation & Calculation Module (Mandates 8b, 8zi, 8e, 8n)
 */

import { useMemo, useState } from "react";
import type {
	ExistingCatalogReference,
	IngestedMappingItem,
	PriceMappingDiffFilterTab,
} from "../types";

export type ExtendedDiffFilter =
	| PriceMappingDiffFilterTab
	| "changed"
	| "unchanged";

export interface ItemPriceDiffResult {
	readonly oldPriceRub: number;
	readonly oldPriceKopecks: number;
	readonly newPriceRub: number;
	readonly newPriceKopecks: number;
	readonly deltaRub: number;
	readonly deltaKopecks: number;
	readonly deltaPercent: number;
	readonly trend: "increase" | "decrease" | "same" | "new";
}

/**
 * Calculates exact price delta in integer kopecks and rubles.
 * Immune to IEEE 754 floating-point rounding errors.
 */
export function calculateItemPriceDiff(item: IngestedMappingItem): ItemPriceDiffResult {
	const newPriceRub = Math.max(0, item.priceRub ?? 0);
	const newPriceKopecks = item.priceKopecks ?? Math.round(newPriceRub * 100);

	const hasExisting =
		item.matchedExistingPriceRub !== undefined &&
		item.matchedExistingPriceRub !== null;
	const oldPriceRub = hasExisting ? Math.max(0, item.matchedExistingPriceRub as number) : 0;
	const oldPriceKopecks = Math.round(oldPriceRub * 100);

	if (!hasExisting || item.suggestedAction === "create_new") {
		return {
			oldPriceRub: 0,
			oldPriceKopecks: 0,
			newPriceRub,
			newPriceKopecks,
			deltaRub: newPriceRub,
			deltaKopecks: newPriceKopecks,
			deltaPercent: 100,
			trend: "new",
		};
	}

	const deltaRub = newPriceRub - oldPriceRub;
	const deltaKopecks = newPriceKopecks - oldPriceKopecks;
	const deltaPercent = oldPriceRub > 0 ? Math.round((deltaRub / oldPriceRub) * 100) : 0;

	let trend: "increase" | "decrease" | "same" | "new" = "same";
	if (deltaRub > 0) {
		trend = "increase";
	} else if (deltaRub < 0) {
		trend = "decrease";
	}

	return {
		oldPriceRub,
		oldPriceKopecks,
		newPriceRub,
		newPriceKopecks,
		deltaRub,
		deltaKopecks,
		deltaPercent,
		trend,
	};
}

export interface UsePriceDiffPanesStateParams {
	readonly items: readonly IngestedMappingItem[];
	readonly existingCatalog?: readonly ExistingCatalogReference[] | undefined;
}

export function usePriceDiffPanesState({
	items,
	existingCatalog = [],
}: UsePriceDiffPanesStateParams) {
	const [filterTab, setFilterTab] = useState<ExtendedDiffFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [activeMobileView, setActiveMobileView] = useState<"split" | "source" | "target">("split");

	// Precompute diff calculations map for O(1) row lookups
	const diffMap = useMemo(() => {
		const map = new Map<string, ItemPriceDiffResult>();
		for (const item of items) {
			map.set(item.id, calculateItemPriceDiff(item));
		}
		return map;
	}, [items]);

	// Extract unique categories for quick navigation chips
	const categories = useMemo(() => {
		const set = new Set<string>();
		for (const item of items) {
			if (item.category) set.add(item.category);
		}
		return Array.from(set).sort();
	}, [items]);

	// Comprehensive statistics with integer kopeck sums
	const stats = useMemo(() => {
		let total = items.length;
		let approvedCount = 0;
		let exactCount = 0;
		let newCount = 0;
		let updateCount = 0;
		let attentionCount = 0;
		let increasedCount = 0;
		let decreasedCount = 0;
		let unchangedCount = 0;
		let totalConfidence = 0;
		let totalDeltaKopecks = 0;

		for (const it of items) {
			if (it.isApproved) approvedCount++;
			if (it.confidenceKind === "exact_code") exactCount++;
			if (it.suggestedAction === "create_new") newCount++;
			if (it.suggestedAction === "update_existing" || it.suggestedAction === "link_existing") {
				updateCount++;
			}
			if (it.confidence < 0.7) attentionCount++;
			totalConfidence += it.confidence;

			const diff = diffMap.get(it.id);
			if (diff) {
				if (diff.trend === "increase") increasedCount++;
				else if (diff.trend === "decrease") decreasedCount++;
				else if (diff.trend === "same") unchangedCount++;
				totalDeltaKopecks += diff.deltaKopecks;
			}
		}

		const avgConfidence = total > 0 ? Math.round((totalConfidence / total) * 100) : 0;
		const totalDeltaRub = Math.round(totalDeltaKopecks / 100);

		return {
			total,
			approvedCount,
			exactCount,
			newCount,
			updateCount,
			attentionCount,
			increasedCount,
			decreasedCount,
			unchangedCount,
			avgConfidence,
			totalDeltaRub,
			totalDeltaKopecks,
		};
	}, [items, diffMap]);

	// Filtered list based on search, filter tab, and category
	const filteredItems = useMemo(() => {
		const cleanSearch = searchTerm.trim().toLowerCase();

		return items.filter((item) => {
			if (selectedCategory !== "all" && item.category !== selectedCategory) {
				return false;
			}

			const diff = diffMap.get(item.id);

			if (filterTab === "new" && item.suggestedAction !== "create_new") return false;
			if (
				filterTab === "update" &&
				item.suggestedAction !== "update_existing" &&
				item.suggestedAction !== "link_existing"
			) {
				return false;
			}
			if (filterTab === "attention" && item.confidence >= 0.7) return false;
			if (filterTab === "changed" && (!diff || (diff.trend !== "increase" && diff.trend !== "decrease"))) {
				return false;
			}
			if (filterTab === "unchanged" && diff?.trend !== "same") return false;

			if (cleanSearch) {
				const matchCode = item.code804n.toLowerCase().includes(cleanSearch);
				const matchTitle = item.cleanedTitle.toLowerCase().includes(cleanSearch);
				const matchRaw = item.rawLine.toLowerCase().includes(cleanSearch);
				const matchStatutory = item.statutoryTitle804n.toLowerCase().includes(cleanSearch);
				if (!matchCode && !matchTitle && !matchRaw && !matchStatutory) return false;
			}

			return true;
		});
	}, [items, filterTab, selectedCategory, searchTerm, diffMap]);

	return {
		filterTab,
		setFilterTab,
		searchTerm,
		setSearchTerm,
		selectedCategory,
		setSelectedCategory,
		categories,
		activeMobileView,
		setActiveMobileView,
		stats,
		filteredItems,
		diffMap,
		existingCatalog,
	};
}
