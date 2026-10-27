import { formatKopecksRu } from "../../utils/money.js";
import { roundQuantity } from "./consumableLinkManager.js";
import type { ConsumableDeductedItem, PlannedServiceConsumable } from "./consumableTypes.js";

export interface ProcessStockDeductionOptions {
	readonly allowOverdraft?: boolean | undefined;
	readonly overdraftMessagePrefix?: string | undefined;
	readonly overdraftMessageSuffix?: string | undefined;
}

export interface ProcessStockDeductionResult {
	readonly deductedItems: ConsumableDeductedItem[];
	readonly softOverdrafts: string[];
	readonly totalCostPriceKopecks: number;
	readonly hasOverdraft: boolean;
	readonly runningStocks: Record<string, number>;
}

export function processConsumablesStockDeduction(
	plannedConsumables: readonly PlannedServiceConsumable[],
	currentStockMap: Record<string, number> | Map<string, number> = {},
	options: ProcessStockDeductionOptions = {},
): ProcessStockDeductionResult {
	const allowOverdraft = options.allowOverdraft !== false;
	const prefix = options.overdraftMessagePrefix ?? "Складской овердрафт";

	const stockTracker = new Map<string, number>();
	if (currentStockMap instanceof Map) {
		for (const [k, v] of currentStockMap.entries()) stockTracker.set(k, v);
	} else if (currentStockMap) {
		for (const [itemId, qty] of Object.entries(currentStockMap)) stockTracker.set(itemId, qty);
	}

	const deductedItems: ConsumableDeductedItem[] = [];
	const softOverdrafts: string[] = [];
	let totalCostPriceKopecks = 0;
	let hasOverdraft = false;

	for (const planned of plannedConsumables) {
		const currentStock =
			stockTracker.get(planned.inventoryItemId) ??
			stockTracker.get(planned.itemName.toLowerCase().trim()) ?? 0;

		const remainingQty = roundQuantity(currentStock - planned.requiredQuantity, 4);
		stockTracker.set(planned.inventoryItemId, remainingQty);

		const isOverdraftItem = remainingQty < 0;
		let overdraftWarning: string | undefined;

		if (isOverdraftItem) {
			hasOverdraft = true;
			const suffix = options.overdraftMessageSuffix ?? (prefix.includes("8n")
				? "Накладная в пути. Лечение не блокируется."
				: "Операция не блокируется.");
			const warningMsg = `${prefix} позиции «${planned.itemName}» (ID: ${planned.inventoryItemId}): списано ${planned.requiredQuantity} ${planned.unit}, остаток ${remainingQty} ${planned.unit}. Остаток 0, требуется пополнение. ${suffix}`;

			if (!allowOverdraft) {
				throw new Error(
					`Складской дефицит: недостаточно остатка позиции «${planned.itemName}» (доступно: ${currentStock}, требуется: ${planned.requiredQuantity} ${planned.unit})`,
				);
			}

			overdraftWarning = warningMsg;
			softOverdrafts.push(warningMsg);
		}

		totalCostPriceKopecks += planned.totalCostPriceKopecks;

		deductedItems.push({
			inventoryItemId: planned.inventoryItemId, itemName: planned.itemName,
			category: planned.category, unit: planned.unit, service804nCode: planned.service804nCode,
			toothNumber: planned.toothNumber, deductedQty: planned.requiredQuantity, remainingQty,
			unitCostPriceKopecks: planned.unitCostPriceKopecks, totalCostPriceKopecks: planned.totalCostPriceKopecks,
			totalCostPriceRub: formatKopecksRu(planned.totalCostPriceKopecks), isOverdraft: isOverdraftItem,
			overdraftWarning,
		});
	}

	const runningStocks: Record<string, number> = {};
	for (const [k, v] of stockTracker.entries()) runningStocks[k] = v;

	return { deductedItems, softOverdrafts, totalCostPriceKopecks, hasOverdraft, runningStocks };
}
