import type { InventoryItem } from "../inventoryDataMappers.js";
import type { DeductionStockStatus } from "./inventoryMathTypes.js";
import { formatQuantityWithUnitRu } from "./inventoryMathUnits.js";

/**
 * Оценка статуса складского остатка при планируемом списании
 */
export function evaluateStockStatus(
	stockQuantity: number,
	quantityToDeduct: number,
	criticalThreshold: number = 0,
	unit: string = "шт.",
): DeductionStockStatus {
	const current = Number.isFinite(stockQuantity) ? stockQuantity : 0;
	const deduct = Number.isFinite(quantityToDeduct) ? quantityToDeduct : 0;
	const threshold = Number.isFinite(criticalThreshold) ? criticalThreshold : 0;

	const remainingStock = Number((current - deduct).toFixed(4));

	if (current <= 0 || remainingStock < 0) {
		const deficit = Math.abs(remainingStock);
		return {
			severity: "critical",
			remainingStock,
			deficit,
			message: `Дефицит на складе! В наличии: ${formatQuantityWithUnitRu(current, unit)}, требуется: ${formatQuantityWithUnitRu(deduct, unit)}, нехватка: ${formatQuantityWithUnitRu(deficit, unit)}`,
		};
	}

	if (remainingStock <= threshold) {
		return {
			severity: "warning",
			remainingStock,
			deficit: 0,
			message: `Низкий остаток! После списания останется ${formatQuantityWithUnitRu(remainingStock, unit)} (порог: ${formatQuantityWithUnitRu(threshold, unit)})`,
		};
	}

	return {
		severity: "ok",
		remainingStock,
		deficit: 0,
		message: `В наличии: ${formatQuantityWithUnitRu(current, unit)} (после списания: ${formatQuantityWithUnitRu(remainingStock, unit)})`,
	};
}

/**
 * Сопоставление наименования материала с реальной складской позицией
 */
export function matchMaterialToWarehouse(
	materialName: string,
	warehouseItems: readonly InventoryItem[],
): InventoryItem | undefined {
	if (!materialName || !warehouseItems || warehouseItems.length === 0) {
		return undefined;
	}

	const cleanTarget = materialName.toLowerCase().trim();

	const exact = warehouseItems.find(
		(w) => w.name.toLowerCase().trim() === cleanTarget,
	);
	if (exact) return exact;

	const targetTokens = cleanTarget
		.replace(/[()[\]/\\,.-]/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 2);

	let bestMatch: InventoryItem | undefined;
	let maxTokenMatches = 0;

	for (const item of warehouseItems) {
		const itemNameLower = item.name.toLowerCase();
		let matches = 0;
		for (const token of targetTokens) {
			if (itemNameLower.includes(token)) {
				matches++;
			}
		}
		if (matches > maxTokenMatches && matches >= Math.min(2, targetTokens.length)) {
			maxTokenMatches = matches;
			bestMatch = item;
		}
	}

	return bestMatch;
}
