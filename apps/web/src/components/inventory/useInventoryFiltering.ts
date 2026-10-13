import { multiplyKopecks, parseKopecks, sumKopecks } from "@dental/shared";
import React, { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast.js";
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
	showModal,
	adjustingItem,
	confirmDialogOpen,
	setFormData,
	setEditingItem,
	setShowModal,
}: UseInventoryFilteringParams) {
	const [searchQuery, setSearchQuery] = useState("");
	const [scannedBarcode, setScannedBarcode] = useState<string>("");
	const [isScannerActive, setIsScannerActive] = useState(false);

	/*
	 * --- Слушатель сканера штрихкодов (эмуляция «клавиатурного» сканера) ---
	 */
	useEffect(() => {
		let barcodeBuffer = "";
		let lastKeyTime = 0;

		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

			const currentTime = Date.now();
			if (currentTime - lastKeyTime > 100) {
				barcodeBuffer = "";
			}
			lastKeyTime = currentTime;

			if (e.key === "Enter") {
				if (barcodeBuffer.length > 3) {
					setScannedBarcode(barcodeBuffer);
					setIsScannerActive(true);
					showToast(`Отсканирован код: ${barcodeBuffer}`, "success");

					if (showModal) {
						setFormData((prev) => ({ ...prev, barcode: barcodeBuffer }));
						barcodeBuffer = "";
						return;
					}

					if (adjustingItem || confirmDialogOpen) {
						barcodeBuffer = "";
						return;
					}

					const found = items.find(
						(i) => i.barcode === barcodeBuffer || i.sku === barcodeBuffer,
					);
					if (found) {
						showToast(`Найден товар: ${found.name}`, "info");
						setSearchQuery(barcodeBuffer);
					} else {
						showToast("Неизвестный товар. Добавьте его в базу.", "warning");
						setFormData({
							name: "",
							threshold: "",
							unitCostRub: "",
							sku: "",
							barcode: barcodeBuffer,
							lotNumber: "",
							expirationDate: "",
						});
						setEditingItem(null);
						setShowModal(true);
					}
				}
				barcodeBuffer = "";
			} else if (e.key.length === 1) {
				barcodeBuffer += e.key;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [items, showModal, adjustingItem, confirmDialogOpen, setFormData, setEditingItem, setShowModal]);

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
