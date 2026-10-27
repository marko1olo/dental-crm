/**
 * useDocumentGridState.ts
 * Filtering and state management for DocumentsTemplateGrid.
 * Mandate 8b: Single responsibility, strict line limit.
 */

import { useMemo } from "react";
import { CANONICAL_TEMPLATES } from "./canonicalTemplatesData";
import type {
	DocumentCategoryTab,
	DocumentTemplateItem,
} from "./documentTemplateTypes";

export interface UseDocumentGridStateParams {
	readonly activeCategoryTab: DocumentCategoryTab;
	readonly searchQuery: string;
	readonly documentLabels?: Record<string, string> | undefined;
}

export interface UseDocumentGridStateResult {
	readonly filteredTemplates: DocumentTemplateItem[];
}

export function useDocumentGridState({
	activeCategoryTab,
	searchQuery,
	documentLabels,
}: UseDocumentGridStateParams): UseDocumentGridStateResult {
	const filteredTemplates = useMemo(() => {
		let list = [...CANONICAL_TEMPLATES];

		if (activeCategoryTab && activeCategoryTab !== "all") {
			list = list.filter((item) => item.category === activeCategoryTab);
		}

		const q = (searchQuery ?? "").trim().toLowerCase();
		if (q) {
			list = list.filter(
				(item) =>
					item.titleRu.toLowerCase().includes(q) ||
					item.descriptionRu.toLowerCase().includes(q) ||
					item.badgeRu.toLowerCase().includes(q) ||
					item.kind.toLowerCase().includes(q) ||
					(documentLabels?.[item.kind] ?? "").toLowerCase().includes(q),
			);
		}

		return list;
	}, [activeCategoryTab, searchQuery, documentLabels]);

	return { filteredTemplates };
}
