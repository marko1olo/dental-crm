import { useMemo } from "react";
import type { DocumentCatalogCategory, DocumentCatalogItem } from "./types";

export function useCatalogFilter(
	catalogItems: DocumentCatalogItem[],
	searchQuery: string,
	activeCategory: DocumentCatalogCategory,
) {
	const filteredItems = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return catalogItems.filter((i) => {
			if (activeCategory !== "all" && i.category !== activeCategory) {
				return false;
			}
			if (!q) return true;
			return (
				i.titleRu.toLowerCase().includes(q) ||
				i.descriptionRu.toLowerCase().includes(q) ||
				i.badgeRu.toLowerCase().includes(q)
			);
		});
	}, [catalogItems, activeCategory, searchQuery]);

	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = {
			all: catalogItems.length,
			intake: 0,
			clinical: 0,
			finance_tax: 0,
			refusal: 0,
			pediatric: 0,
		};
		for (const i of catalogItems) {
			counts[i.category] = (counts[i.category] || 0) + 1;
		}
		return counts;
	}, [catalogItems]);

	return { filteredItems, categoryCounts };
}
