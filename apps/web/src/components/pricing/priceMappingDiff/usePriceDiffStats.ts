import { useMemo } from "react";
import type {
	IngestedMappingItem,
	PriceDiffStats,
	PriceMappingDiffFilterTab,
} from "./itemTypes";

export function usePriceDiffStats(
	items: readonly IngestedMappingItem[],
	filterTab: PriceMappingDiffFilterTab,
	searchTerm: string,
) {
	const stats: PriceDiffStats = useMemo(() => {
		const total = items.length;
		const approvedCount = items.filter((i) => i.isApproved).length;
		const exactCount = items.filter(
			(i) => i.confidenceKind === "exact_code",
		).length;
		const newCount = items.filter(
			(i) => i.suggestedAction === "create_new",
		).length;
		const updateCount = items.filter(
			(i) => i.suggestedAction === "update_existing",
		).length;
		const attentionCount = items.filter((i) => i.confidence < 0.7).length;
		const totalConfidence = items.reduce((acc, it) => acc + it.confidence, 0);
		const avgConfidence =
			total > 0 ? Math.round((totalConfidence / total) * 100) : 0;

		return {
			total,
			approvedCount,
			exactCount,
			newCount,
			updateCount,
			attentionCount,
			avgConfidence,
		};
	}, [items]);

	const filteredItems = useMemo(() => {
		const term = searchTerm.trim().toLowerCase();
		return items.filter((item) => {
			if (filterTab === "new" && item.suggestedAction !== "create_new")
				return false;
			if (
				filterTab === "update" &&
				item.suggestedAction !== "update_existing" &&
				item.suggestedAction !== "link_existing"
			)
				return false;
			if (filterTab === "attention" && item.confidence >= 0.7) return false;

			if (term) {
				const matchesCode = item.code804n.toLowerCase().includes(term);
				const matchesTitle = item.cleanedTitle.toLowerCase().includes(term);
				const matchesRaw = item.rawLine.toLowerCase().includes(term);
				if (!matchesCode && !matchesTitle && !matchesRaw) return false;
			}
			return true;
		});
	}, [items, filterTab, searchTerm]);

	const formatPrice = (rub: number) => {
		return new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: rub % 1 !== 0 ? 2 : 0,
		}).format(rub);
	};

	return {
		stats,
		filteredItems,
		formatPrice,
	};
}
