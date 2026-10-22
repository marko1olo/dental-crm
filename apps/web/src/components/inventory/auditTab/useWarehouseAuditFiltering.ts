import { useMemo, useState } from "react";
import {
	type WarehouseAuditItemLine,
	sortAuditItemsByFefo,
} from "../warehouseInventoryEngine.js";

export type InventoryCategoryFilter =
	| "all"
	| "anesthetics"
	| "filling"
	| "sterilization"
	| "disposables";

export function useWarehouseAuditFiltering(items: readonly WarehouseAuditItemLine[]) {
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [filterTab, setFilterTab] = useState<"all" | "discrepancies" | "expired" | "risk">("all");
	const [categoryFilter, setCategoryFilter] = useState<InventoryCategoryFilter>("all");
	const [sortOrder, setSortOrder] = useState<"default" | "fefo" | "discrepancy" | "name">("default");

	const categoryCounts = useMemo(() => {
		const counts = { all: items.length, anesthetics: 0, filling: 0, sterilization: 0, disposables: 0 };
		for (const it of items) {
			const cat = it.category.toLowerCase();
			if (cat.includes("анест")) counts.anesthetics++;
			else if (cat.includes("терап") || cat.includes("пломб") || cat.includes("композ")) counts.filling++;
			else if (cat.includes("стерил") || cat.includes("дезинф")) counts.sterilization++;
			else counts.disposables++;
		}
		return counts;
	}, [items]);

	const filteredItems = useMemo(() => {
		let result = [...items];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			result = result.filter(
				(it) => it.nameRu.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q) || it.batchNumber.toLowerCase().includes(q),
			);
		}
		if (filterTab === "discrepancies") result = result.filter((it) => it.discrepancyType !== "match");
		else if (filterTab === "expired") result = result.filter((it) => it.fefoStatus === "expired");
		else if (filterTab === "risk") result = result.filter((it) => it.fefoStatus === "warning_30" || it.fefoStatus === "warning_60");

		if (categoryFilter !== "all") {
			result = result.filter((it) => {
				const cat = it.category.toLowerCase();
				if (categoryFilter === "anesthetics") return cat.includes("анест");
				if (categoryFilter === "filling") return cat.includes("терап") || cat.includes("пломб") || cat.includes("композ");
				if (categoryFilter === "sterilization") return cat.includes("стерил") || cat.includes("дезинф");
				return !cat.includes("анест") && !cat.includes("терап") && !cat.includes("пломб") && !cat.includes("стерил");
			});
		}

		if (sortOrder === "fefo") result = sortAuditItemsByFefo(result);
		else if (sortOrder === "discrepancy") result.sort((a, b) => Math.abs(b.discrepancyCostKopecks) - Math.abs(a.discrepancyCostKopecks));
		else if (sortOrder === "name") result.sort((a, b) => a.nameRu.localeCompare(b.nameRu, "ru"));

		return result;
	}, [items, searchQuery, filterTab, categoryFilter, sortOrder]);

	return {
		searchQuery,
		setSearchQuery,
		filterTab,
		setFilterTab,
		categoryFilter,
		setCategoryFilter,
		sortOrder,
		setSortOrder,
		categoryCounts,
		filteredItems,
	};
}
