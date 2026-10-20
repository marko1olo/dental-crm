import { useEffect, useMemo, useState } from "react";
import { sliceDomList } from "../../../utils/domVirtualizationHelper";
import { getOptimizedTiming } from "../../../utils/lowSpecHddOptimizer";
import {
	type PricelistSortDirection,
	type PricelistSortField,
	searchPricelistItems,
	sortPricelistItems,
} from "./servicePricelistEngine";
import type {
	DoctorSpecialty,
	Order804nCategory,
	PriceTierKind,
	ServicePricelistItem,
} from "./servicePricelistPresets";

export function usePricelistFilterAndSlice(
	items: readonly ServicePricelistItem[],
	selectedCategory: Order804nCategory | "all",
	selectedSpecialty: DoctorSpecialty | "all",
	searchTerm: string,
	activeTier: PriceTierKind,
	sortField: PricelistSortField,
	sortDirection: PricelistSortDirection,
) {
	const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
	const [displayLimit, setDisplayLimit] = useState(40);

	useEffect(() => {
		if (!searchTerm) {
			setDebouncedSearch("");
			return;
		}
		const timing = getOptimizedTiming();
		const timer = setTimeout(
			() => setDebouncedSearch(searchTerm),
			timing.searchDebounceMs,
		);
		return () => clearTimeout(timer);
	}, [searchTerm]);

	useEffect(() => {
		setDisplayLimit(40);
	}, [
		debouncedSearch,
		selectedCategory,
		selectedSpecialty,
		activeTier,
		sortField,
		sortDirection,
	]);

	const filteredItems = useMemo(() => {
		const searchResults = searchPricelistItems(items, {
			searchTerm: debouncedSearch,
			category: selectedCategory,
			specialty: selectedSpecialty,
			includeArchived: false,
		});
		return sortPricelistItems(
			searchResults,
			sortField,
			sortDirection,
			activeTier,
		);
	}, [
		items,
		debouncedSearch,
		selectedCategory,
		selectedSpecialty,
		sortField,
		sortDirection,
		activeTier,
	]);

	const pricelistSlice = useMemo(() => {
		return sliceDomList(filteredItems, displayLimit, 0);
	}, [filteredItems, displayLimit]);

	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = { all: items.length };
		for (const item of items) {
			counts[item.category] = (counts[item.category] || 0) + 1;
		}
		return counts;
	}, [items]);

	return {
		filteredItems,
		pricelistSlice,
		categoryCounts,
		handleShowMore: () => setDisplayLimit((prev) => prev + 40),
	};
}
