import { useEffect, useState } from "react";
import {
	getWarehouseItemCatalogPreset,
	WAREHOUSE_CATALOG_PRESETS,
} from "./warehouseTransferPresets.js";
import type {
	WarehouseTransferDocument,
	WarehouseTransferLineItem,
} from "./warehouseTransferEngine.js";

export function useWarehouseTransferItemsState(
	isOpen: boolean,
	initialDocument?: WarehouseTransferDocument | undefined,
) {
	const [items, setItems] = useState<WarehouseTransferLineItem[]>([]);
	const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<string>(
		WAREHOUSE_CATALOG_PRESETS[0]?.id || "mat_ultracain_forte",
	);
	const [addQuantity, setAddQuantity] = useState<number>(5);

	useEffect(() => {
		if (isOpen) {
			if (initialDocument && initialDocument.items.length > 0) {
				setItems([...initialDocument.items]);
			} else {
				setItems([
					{
						itemId: "mat_ultracain_forte", sku: "AN-ULTRA-01", nameRu: "Ультракаин Д-С Форте (100 карпул/уп)",
						unitRu: "упак", okeiCode: "778", batchNumber: "LOT-2026A44", expiryDate: "2027-12-31",
						requestedQuantity: 10, dispatchedQuantity: 10, receivedQuantity: 10,
						unitCostKopecks: 650000, discrepancyType: "none",
					},
					{
						itemId: "mat_impl_osstem_40_10", sku: "IMP-OSST-4010", nameRu: "Дентальный имплантат Osstem TS III SA Ø4.0 x 10 мм",
						unitRu: "шт", okeiCode: "796", batchNumber: "LOT-OS-5541", expiryDate: "2029-06-30",
						requestedQuantity: 5, dispatchedQuantity: 5, receivedQuantity: 5,
						unitCostKopecks: 1250000, discrepancyType: "none",
					},
					{
						itemId: "mat_filtek_ultimate_a2", sku: "COMP-FILT-A2", nameRu: "Композит Filtek Ultimate шприц 4г (Enamel A2)",
						unitRu: "шт", okeiCode: "796", batchNumber: "LOT-FLT-772", expiryDate: "2027-05-15",
						requestedQuantity: 4, dispatchedQuantity: 4, receivedQuantity: 4,
						unitCostKopecks: 420000, discrepancyType: "none",
					},
				]);
			}
		}
	}, [isOpen, initialDocument]);

	const handleAddItem = () => {
		const preset = getWarehouseItemCatalogPreset(selectedCatalogItemId);
		if (!preset) return;
		const existingIndex = items.findIndex((i) => i.itemId === preset.id);
		if (existingIndex >= 0) {
			const updated = [...items];
			const current = updated[existingIndex]!;
			updated[existingIndex] = {
				...current,
				requestedQuantity: current.requestedQuantity + addQuantity,
				dispatchedQuantity: current.dispatchedQuantity + addQuantity,
				receivedQuantity: current.receivedQuantity + addQuantity,
			};
			setItems(updated);
			return;
		}
		setItems((prev) => [
			...prev,
			{
				itemId: preset.id, sku: preset.sku, nameRu: preset.nameRu, unitRu: preset.unitRu, okeiCode: preset.okeiCode,
				batchNumber: preset.defaultBatchNumber, expiryDate: "2027-12-31", requestedQuantity: addQuantity,
				dispatchedQuantity: addQuantity, receivedQuantity: addQuantity, unitCostKopecks: preset.unitCostKopecks,
				discrepancyType: "none",
			},
		]);
		setAddQuantity(1);
	};

	const handleRemoveItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));
	const handleUpdateItem = (index: number, patch: Partial<WarehouseTransferLineItem>) => {
		setItems((prev) => {
			const updated = [...prev];
			const current = updated[index];
			if (current) updated[index] = { ...current, ...patch };
			return updated;
		});
	};

	return {
		items,
		selectedCatalogItemId,
		setSelectedCatalogItemId,
		addQuantity,
		setAddQuantity,
		handleAddItem,
		handleRemoveItem,
		handleUpdateItem,
	};
}
