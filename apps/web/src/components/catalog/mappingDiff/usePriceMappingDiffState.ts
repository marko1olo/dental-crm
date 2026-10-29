/**
 * DENTE Dental CRM — State Coordinator & Hooks for Price List Mapping Diff
 * Unified SSOT Hook Module (Mandates 8b, 8zi)
 */

import { useId, useMemo, useRef, useState } from "react";
import type {
	ExistingCatalogReference,
	IngestedMappingItem,
	PriceDiffStats,
	PriceListMappingDiffViewProps,
	PriceMappingDiffFilterTab,
} from "./types";

/* --- Batch Item Helpers --- */

export function applyDeltaToItem(
	items: readonly IngestedMappingItem[],
	rowId: string,
	deltaRub: number,
): readonly IngestedMappingItem[] {
	return items.map((it) => {
		if (it.id !== rowId) return it;
		const nextPrice = Math.max(0, it.priceRub + deltaRub);
		return {
			...it,
			priceRub: nextPrice,
			priceKopecks: Math.round(nextPrice * 100),
		};
	});
}

export function applyPriceToItem(
	items: readonly IngestedMappingItem[],
	rowId: string,
	parsedRub: number,
): readonly IngestedMappingItem[] {
	return items.map((it) => {
		if (it.id !== rowId) return it;
		return {
			...it,
			priceRub: parsedRub,
			priceKopecks: Math.round(parsedRub * 100),
		};
	});
}

export function applyMarkupToItems(
	items: readonly IngestedMappingItem[],
	percent: number,
): readonly IngestedMappingItem[] {
	const hasApproved = items.some((i) => i.isApproved);
	return items.map((it) => {
		if (hasApproved && !it.isApproved) return it;
		const nextPrice = Math.max(0, Math.round(it.priceRub * (1 + percent / 100)));
		return {
			...it,
			priceRub: nextPrice,
			priceKopecks: Math.round(nextPrice * 100),
		};
	});
}

export function applyRoundingToItems(
	items: readonly IngestedMappingItem[],
	roundTo: number = 100,
): readonly IngestedMappingItem[] {
	const hasApproved = items.some((i) => i.isApproved);
	return items.map((it) => {
		if (hasApproved && !it.isApproved) return it;
		const nextPrice = Math.max(0, Math.round(it.priceRub / roundTo) * roundTo);
		return {
			...it,
			priceRub: nextPrice,
			priceKopecks: Math.round(nextPrice * 100),
		};
	});
}

export function applyZeroToItems(
	items: readonly IngestedMappingItem[],
): readonly IngestedMappingItem[] {
	const hasApproved = items.some((i) => i.isApproved);
	return items.map((it) => {
		if (hasApproved && !it.isApproved) return it;
		return {
			...it,
			priceRub: 0,
			priceKopecks: 0,
		};
	});
}

/* --- Synchronized Scroll Hook --- */

export function useSynchronizedScroll() {
	const leftBodyRef = useRef<HTMLDivElement>(null);
	const rightBodyRef = useRef<HTMLDivElement>(null);
	const isSyncingScrollRef = useRef(false);

	const handleLeftScroll = () => {
		if (isSyncingScrollRef.current) return;
		isSyncingScrollRef.current = true;
		if (leftBodyRef.current && rightBodyRef.current) {
			const left = leftBodyRef.current;
			const right = rightBodyRef.current;
			const maxLeft = left.scrollHeight - left.clientHeight;
			const maxRight = right.scrollHeight - right.clientHeight;
			if (maxLeft > 0 && maxRight > 0) {
				const ratio = left.scrollTop / maxLeft;
				right.scrollTop = Math.round(ratio * maxRight);
			} else {
				right.scrollTop = left.scrollTop;
			}
		}
		requestAnimationFrame(() => {
			isSyncingScrollRef.current = false;
		});
	};

	const handleRightScroll = () => {
		if (isSyncingScrollRef.current) return;
		isSyncingScrollRef.current = true;
		if (leftBodyRef.current && rightBodyRef.current) {
			const left = leftBodyRef.current;
			const right = rightBodyRef.current;
			const maxLeft = left.scrollHeight - left.clientHeight;
			const maxRight = right.scrollHeight - right.clientHeight;
			if (maxLeft > 0 && maxRight > 0) {
				const ratio = right.scrollTop / maxRight;
				left.scrollTop = Math.round(ratio * maxLeft);
			} else {
				left.scrollTop = right.scrollTop;
			}
		}
		requestAnimationFrame(() => {
			isSyncingScrollRef.current = false;
		});
	};

	return {
		leftBodyRef,
		rightBodyRef,
		handleLeftScroll,
		handleRightScroll,
	};
}

/* --- Master Coordinator Hook --- */

export function usePriceMappingDiff({
	items,
	onItemsChange,
	onAcceptAll,
	onApply,
	existingCatalog = [],
}: PriceListMappingDiffViewProps) {
	const [filterTab, setFilterTab] = useState<PriceMappingDiffFilterTab>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [activeLinkRowId, setActiveLinkRowId] = useState<string | null>(null);
	const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
	const [editingRowPriceId, setEditingRowPriceId] = useState<string | null>(null);
	const [editingRowPriceBuffer, setEditingRowPriceBuffer] = useState<string>("");
	const searchInputId = useId();

	const scrollState = useSynchronizedScroll();

	const stats: PriceDiffStats = useMemo(() => {
		const total = items.length;
		const approvedCount = items.filter((i) => i.isApproved).length;
		const exactCount = items.filter((i) => i.confidenceKind === "exact_code").length;
		const newCount = items.filter((i) => i.suggestedAction === "create_new").length;
		const updateCount = items.filter((i) => i.suggestedAction === "update_existing").length;
		const attentionCount = items.filter((i) => i.confidence < 0.7).length;
		const totalConfidence = items.reduce((acc, it) => acc + it.confidence, 0);
		const avgConfidence = total > 0 ? Math.round((totalConfidence / total) * 100) : 0;

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
			if (filterTab === "new" && item.suggestedAction !== "create_new") return false;
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

	const handleToggleApproveRow = (rowId: string) => {
		if (!onItemsChange) return;
		onItemsChange(
			items.map((it) => (it.id === rowId ? { ...it, isApproved: !it.isApproved } : it)),
		);
	};

	const handleSetCreateNew = (rowId: string) => {
		if (!onItemsChange) return;
		onItemsChange(
			items.map((it) =>
				it.id === rowId
					? {
							...it,
							suggestedAction: "create_new" as const,
							matchedExistingServiceId: null,
							isApproved: true,
						}
					: it,
			),
		);
		setActiveLinkRowId(null);
	};

	const handleSetLinkExisting = (
		rowId: string,
		targetServiceId: string,
		catalog: readonly ExistingCatalogReference[] = existingCatalog,
	) => {
		if (!onItemsChange) return;
		const targetService = catalog.find((s) => s.id === targetServiceId);
		onItemsChange(
			items.map((it) =>
				it.id === rowId
					? {
							...it,
							suggestedAction: "link_existing" as const,
							matchedExistingServiceId: targetServiceId,
							matchedExistingTitle: targetService?.title ?? it.matchedExistingTitle,
							matchedExistingPriceRub: targetService?.basePriceRub ?? it.matchedExistingPriceRub,
							isApproved: true,
						}
					: it,
			),
		);
		setActiveLinkRowId(null);
	};

	const handleModifyRowDelta = (rowId: string, deltaRub: number) => {
		if (onItemsChange) onItemsChange(applyDeltaToItem(items, rowId, deltaRub));
	};

	const handleSetRowZeroPrice = (rowId: string) => {
		if (onItemsChange) onItemsChange(applyPriceToItem(items, rowId, 0));
	};

	const handleStartEditPrice = (id: string, initialVal: number) => {
		setEditingRowPriceId(id);
		setEditingRowPriceBuffer(String(initialVal));
	};

	const handleCancelEditPrice = () => {
		setEditingRowPriceId(null);
	};

	const handleCommitRowPrice = (rowId: string, rawVal: string) => {
		if (!onItemsChange) {
			setEditingRowPriceId(null);
			return;
		}
		const cleanDigits = rawVal.replace(/\s+/g, "").replace(/[^\d]/g, "");
		const parsed = parseInt(cleanDigits, 10);
		if (!Number.isNaN(parsed) && parsed >= 0) {
			onItemsChange(applyPriceToItem(items, rowId, parsed));
		}
		setEditingRowPriceId(null);
	};

	const handleBatchMarkup = (percent: number) => {
		if (onItemsChange) onItemsChange(applyMarkupToItems(items, percent));
	};

	const handleBatchRounding = (roundTo: number = 100) => {
		if (onItemsChange) onItemsChange(applyRoundingToItems(items, roundTo));
	};

	const handleBatchSetZero = () => {
		if (onItemsChange) onItemsChange(applyZeroToItems(items));
	};

	const handleAcceptAllClick = () => {
		if (onAcceptAll) {
			onAcceptAll();
		} else if (onItemsChange) {
			onItemsChange(items.map((it) => ({ ...it, isApproved: true })));
		}
	};

	const handleDeselectAll = () => {
		if (onItemsChange) {
			onItemsChange(items.map((it) => ({ ...it, isApproved: false })));
		}
	};

	const handleApply = () => {
		const approved = items.filter((i) => i.isApproved);
		if (approved.length === 0) {
			if (items.length > 0) {
				const allApproved = items.map((it) => ({ ...it, isApproved: true }));
				if (onItemsChange) onItemsChange(allApproved);
				if (onApply) onApply(allApproved);
			}
			return;
		}
		if (onApply) onApply(approved);
	};

	return {
		filterTab,
		setFilterTab,
		searchTerm,
		setSearchTerm,
		searchInputId,
		stats,
		filteredItems,
		formatPrice,
		activeLinkRowId,
		setActiveLinkRowId,
		hoveredRowId,
		setHoveredRowId,
		editingRowPriceId,
		editingRowPriceBuffer,
		setEditingRowPriceBuffer,
		handleToggleApproveRow,
		handleSetCreateNew,
		handleSetLinkExisting,
		handleModifyRowDelta,
		handleSetRowZeroPrice,
		handleStartEditPrice,
		handleCancelEditPrice,
		handleCommitRowPrice,
		handleBatchMarkup,
		handleBatchRounding,
		handleBatchSetZero,
		handleAcceptAllClick,
		handleDeselectAll,
		handleApply,
		...scrollState,
	};
}
