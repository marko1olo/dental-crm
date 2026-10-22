import { multiplyKopecks, parseKopecks, sumKopecks } from "@dental/shared";
import React, { useMemo, useState } from "react";
import type { InventoryItem } from "./inventoryDataMappers.js";

export interface UseInventoryFilteringParams {
	readonly items: InventoryItem[];
	readonly showModal: boolean;
	readonly adjustingItem: InventoryItem | null;
	readonly confirmDialogOpen: boolean;
	readonly setFormData: React.Dispatch<
		React.SetStateAction<{
			name: string;
			threshold: string;
			unitCostRub: string;
			sku: string;
			barcode: string;
			lotNumber: string;
			expirationDate: string;
		}>
	>;
	readonly setEditingItem: (item: InventoryItem | null) => void;
	readonly setShowModal: (show: boolean) => void;
}

export function useInventoryFiltering({
	items,
}: UseInventoryFilteringParams) {
	const [searchQuery, setSearchQuery] = useState("");
	const [scannedBarcode] = useState<string>("");
	const [isScannerActive, setIsScannerActive] = useState(false);

	const filteredItems = useMemo(() => {
		if (!searchQuery.trim()) return items;
		const q = searchQuery.toLowerCase();
		return items.filter(
			(i) =>
				i.name.toLowerCase().includes(q) ||
				i.sku?.toLowerCase().includes(q) ||
				i.barcode?.toLowerCase().includes(q),
		);
	}, [items, searchQuery]);

	const criticalItemsCount = useMemo(() => {
		return items.filter((i) => i.stockQuantity <= i.criticalThreshold).length;
	}, [items]);

	const totalValue = useMemo(() => {
		const totalKopecks = sumKopecks(
			items.map((item) => {
				const unitCostKopecks = parseKopecks(item.unitCostRub || "0");
				const quantity = Math.max(
					0,
					Math.round(Number(item.stockQuantity) || 0),
				);
				return multiplyKopecks(unitCostKopecks, quantity);
			}),
		);
		return totalKopecks / 100;
	}, [items]);

	return {
		searchQuery,
		setSearchQuery,
		scannedBarcode,
		isScannerActive,
		setIsScannerActive,
		filteredItems,
		criticalItemsCount,
		lowStockCount: criticalItemsCount,
		totalValue,
		totalItems: items.length,
	};
}
