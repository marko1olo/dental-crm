import type { StockDeductionSummaryItem } from "./types.js";

export function collectSterilizationAncillaryDeductions(
	warehouseItems: readonly { id: string; name: string; stockQuantity: number }[],
	deductions: StockDeductionSummaryItem[],
	overdraftItems: StockDeductionSummaryItem[],
) {
	// Индикатор 5 класса (1 шт)
	const indItem = warehouseItems.find(
		(it) => it.id === "chemical_indicator_class_5" || it.name.includes("Индикатор 5 класса"),
	);
	const indStock = indItem ? indItem.stockQuantity : 0;
	const indAfter = indStock - 1;
	const indDeduction: StockDeductionSummaryItem = {
		id: indItem?.id || "chemical_indicator_class_5",
		name: indItem?.name || "Химический индикатор пара 5 класса",
		quantity: 1,
		currentStock: indStock,
		afterStock: indAfter,
		isOverdraft: indAfter < 0,
	};
	deductions.push(indDeduction);
	if (indAfter < 0) overdraftItems.push(indDeduction);

	// Перчатки смотровые (2 пары)
	const glovesItem = warehouseItems.find(
		(it) => it.id === "nitrile_gloves_pair" || it.name.toLowerCase().includes("перчатк"),
	);
	const glovesStock = glovesItem ? glovesItem.stockQuantity : 0;
	const glovesAfter = glovesStock - 2;
	const glovesDeduction: StockDeductionSummaryItem = {
		id: glovesItem?.id || "nitrile_gloves_pair",
		name: glovesItem?.name || "Перчатки нитриловые смотровые (2 пары)",
		quantity: 2,
		currentStock: glovesStock,
		afterStock: glovesAfter,
		isOverdraft: glovesAfter < 0,
	};
	deductions.push(glovesDeduction);
	if (glovesAfter < 0) overdraftItems.push(glovesDeduction);

	// Салфетка дезинфицирующая (1 шт)
	const wipeItem = warehouseItems.find(
		(it) => it.id === "antiseptic_alcohol_wipe" || it.name.toLowerCase().includes("салфетк"),
	);
	const wipeStock = wipeItem ? wipeItem.stockQuantity : 0;
	const wipeAfter = wipeStock - 1;
	const wipeDeduction: StockDeductionSummaryItem = {
		id: wipeItem?.id || "antiseptic_alcohol_wipe",
		name: wipeItem?.name || "Салфетка дезинфицирующая для поверхностей",
		quantity: 1,
		currentStock: wipeStock,
		afterStock: wipeAfter,
		isOverdraft: wipeAfter < 0,
	};
	deductions.push(wipeDeduction);
	if (wipeAfter < 0) overdraftItems.push(wipeDeduction);
}
