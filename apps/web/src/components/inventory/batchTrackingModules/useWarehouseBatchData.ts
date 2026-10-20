import { useEffect, useMemo, useState } from "react";
import { getFefoTrafficLight } from "../fefoTrafficLight.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { BatchFilter, EnrichedBatch } from "./batchTrackingTypes.js";

export function useWarehouseBatchData(
	items: readonly InventoryItem[],
	selectedItem?: InventoryItem | null | undefined,
) {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilter, setActiveFilter] = useState<BatchFilter>("all");
	const [selectedTargetItem, setSelectedTargetItem] =
		useState<InventoryItem | null>(selectedItem || null);

	useEffect(() => {
		if (selectedItem) {
			setSelectedTargetItem(selectedItem);
		} else if (items.length > 0 && !selectedTargetItem) {
			setSelectedTargetItem(items[0] ?? null);
		}
	}, [selectedItem, items, selectedTargetItem]);

	const enrichedBatches = useMemo<EnrichedBatch[]>(() => {
		return items.map((item) => {
			const expDate = item.expirationDate || "2028-12-31";
			const fefoInfo = getFefoTrafficLight(expDate);
			return {
				item,
				lotNumber: item.lotNumber || `ПАРТИЯ-${item.id.slice(0, 6)}`,
				expirationDate: expDate,
				daysLeft: fefoInfo.daysLeft,
				fefoStatus: fefoInfo.status,
				fefoBadge: fefoInfo.badgeText,
				quantity: Number(item.stockQuantity) || 0,
			};
		});
	}, [items]);

	const filteredBatches = useMemo(() => {
		let list = enrichedBatches;
		if (selectedTargetItem) {
			list = list.filter((b) => b.item.id === selectedTargetItem.id);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter(
				(b) =>
					b.item.name.toLowerCase().includes(q) ||
					b.lotNumber.toLowerCase().includes(q) ||
					Boolean(b.item.sku?.toLowerCase().includes(q)),
			);
		}
		if (activeFilter === "expired") {
			list = list.filter((b) => b.fefoStatus === "red");
		} else if (activeFilter === "warning_soon") {
			list = list.filter((b) => b.fefoStatus === "yellow");
		} else if (activeFilter === "good") {
			list = list.filter((b) => b.fefoStatus === "green");
		}
		return [...list].sort((a, b) => a.daysLeft - b.daysLeft);
	}, [enrichedBatches, selectedTargetItem, searchQuery, activeFilter]);

	const stats = useMemo(() => {
		let expired = 0;
		let warning = 0;
		let good = 0;
		for (const b of enrichedBatches) {
			if (b.fefoStatus === "red") expired++;
			else if (b.fefoStatus === "yellow") warning++;
			else good++;
		}
		return { total: enrichedBatches.length, expired, warning, good };
	}, [enrichedBatches]);

	return {
		searchQuery,
		setSearchQuery,
		activeFilter,
		setActiveFilter,
		selectedTargetItem,
		setSelectedTargetItem,
		filteredBatches,
		stats,
	};
}
