import React, { useEffect } from "react";
import { showToast } from "../GlobalToast.js";
import type { InventoryItem } from "./inventoryDataMappers.js";

export interface UseBarcodeScannerListenerParams {
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
	readonly setScannedBarcode: (code: string) => void;
	readonly setIsScannerActive: (active: boolean) => void;
	readonly setSearchQuery: (q: string) => void;
}

export function useBarcodeScannerListener({
	items,
	showModal,
	adjustingItem,
	confirmDialogOpen,
	setFormData,
	setEditingItem,
	setShowModal,
	setScannedBarcode,
	setIsScannerActive,
	setSearchQuery,
}: UseBarcodeScannerListenerParams) {
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
	}, [items, showModal, adjustingItem, confirmDialogOpen, setFormData, setEditingItem, setShowModal, setScannedBarcode, setIsScannerActive, setSearchQuery]);
}
