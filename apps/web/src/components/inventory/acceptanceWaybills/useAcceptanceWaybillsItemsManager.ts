import React, { useCallback } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	type AcceptanceWaybillDocument,
	type AcceptanceWaybillItem,
	type DentalMaterialTemplate,
	calculateWaybillTotals,
	createWaybillItem,
	sortWaybillItemsByFefo,
} from "../acceptanceWaybillsEngine.js";

export function useAcceptanceWaybillsItemsManager(
	setWaybill: React.Dispatch<React.SetStateAction<AcceptanceWaybillDocument>>,
) {
	const handleAddFromTemplate = useCallback((template: DentalMaterialTemplate) => {
		const expDate = new Date();
		expDate.setMonth(expDate.getMonth() + (template.shelfLifeMonths || 12));
		const expStr = expDate.toISOString().split("T")[0]!;
		const newItem = createWaybillItem({
			name: template.name,
			unit: template.unit,
			quantity: 1,
			unitPriceKopecks: template.defaultUnitPriceKopecks,
			vatRate: template.vatRate,
			category: template.category,
			batchNumber: `${template.defaultBatchPrefix}-${Date.now().toString().slice(-4)}`,
			expirationDate: expStr,
			sku: template.sku,
			barcode: template.barcode,
		});
		setWaybill((prev) => {
			const nextItems = [...prev.items, newItem];
			return {
				...prev,
				items: nextItems,
				totals: calculateWaybillTotals(nextItems),
			};
		});
		showToast(`Добавлена позиция: ${template.name}`, "info");
	}, [setWaybill]);

	const handleAddEmptyItem = useCallback(() => {
		const expDate = new Date();
		expDate.setFullYear(expDate.getFullYear() + 2);
		const empty = createWaybillItem({
			name: "Новый материал",
			unit: "уп",
			quantity: 1,
			unitPriceKopecks: 10000,
			vatRate: 0,
			category: "disposables",
			batchNumber: `LOT-${Date.now().toString().slice(-4)}`,
			expirationDate: expDate.toISOString().split("T")[0]!,
		});
		setWaybill((prev) => {
			const nextItems = [...prev.items, empty];
			return {
				...prev,
				items: nextItems,
				totals: calculateWaybillTotals(nextItems),
			};
		});
	}, [setWaybill]);

	const handleUpdateItem = useCallback((index: number, patch: Partial<AcceptanceWaybillItem>) => {
		setWaybill((prev) => {
			const nextItems = prev.items.map((it, idx) => {
				if (idx !== index) return it;
				const updated = { ...it, ...patch };
				const lineTotal = updated.quantity * updated.unitPriceKopecks;
				const vatTotal = Math.round((lineTotal * updated.vatRate) / 100);
				return {
					...updated,
					lineTotalKopecks: lineTotal,
					vatKopecks: vatTotal,
				};
			});
			return {
				...prev,
				items: nextItems,
				totals: calculateWaybillTotals(nextItems),
			};
		});
	}, [setWaybill]);

	const handleRemoveItem = useCallback((index: number) => {
		setWaybill((prev) => {
			const nextItems = prev.items.filter((_, idx) => idx !== index);
			return {
				...prev,
				items: nextItems,
				totals: calculateWaybillTotals(nextItems),
			};
		});
	}, [setWaybill]);

	const handleSortFefo = useCallback(() => {
		setWaybill((prev) => {
			const sorted = sortWaybillItemsByFefo(prev.items);
			return {
				...prev,
				items: sorted,
			};
		});
		showToast("Позиции отсортированы по правилу FEFO (сначала сгорающие)", "info");
	}, [setWaybill]);

	return {
		handleAddFromTemplate,
		handleAddEmptyItem,
		handleUpdateItem,
		handleRemoveItem,
		handleSortFefo,
	};
}
