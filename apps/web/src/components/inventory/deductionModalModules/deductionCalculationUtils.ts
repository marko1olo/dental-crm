import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import type {
	ConsumablesDeductionModalItem,
	DeductionTotals,
} from "./deductionModalTypes.js";

export function resolveStockForMaterial(
	inventoryItemId: string,
	currentStockMap: Record<string, number>,
): number {
	if (currentStockMap[inventoryItemId] !== undefined) {
		return currentStockMap[inventoryItemId]!;
	}
	const matchedKey = Object.keys(currentStockMap).find((k) => {
		if (inventoryItemId.includes("composite") && (k.includes("filtek") || k.includes("composite"))) return true;
		if (inventoryItemId.includes("adhesive") && (k.includes("optibond") || k.includes("adhesive"))) return true;
		if (inventoryItemId.includes("gloves") && k.includes("gloves")) return true;
		return false;
	});
	if (matchedKey && currentStockMap[matchedKey] !== undefined) {
		return currentStockMap[matchedKey]!;
	}
	return isDemoShowcaseMode() ? 12 : 0;
}

export function computeDeductionTotals(
	deductionItems: readonly ConsumablesDeductionModalItem[],
): DeductionTotals {
	let totalCostRub = 0;
	let overdraftCount = 0;
	let activeItemsCount = 0;
	let carpulesCount = 0;
	let sharpsCount = 0;

	for (const it of deductionItems) {
		if (it.deductedQty > 0) {
			activeItemsCount++;
			totalCostRub += it.deductedQty * it.unitCostRub;
			if (it.isOverdraft) overdraftCount++;

			const nameLower = it.itemName.toLowerCase();
			if (nameLower.includes("карпул") || it.unit === "карпула" || nameLower.includes("артикаин")) {
				carpulesCount += Math.max(1, Math.round(it.deductedQty));
			}
			if (nameLower.includes("игла") || nameLower.includes("скальпель") || nameLower.includes("лезвие")) {
				sharpsCount += Math.max(1, Math.round(it.deductedQty));
			}
		}
	}

	return {
		totalCostRub: Math.round(totalCostRub * 100) / 100,
		overdraftCount,
		hasOverdraft: overdraftCount > 0,
		overdraftItemsCount: overdraftCount,
		activeItemsCount,
		carpulesCount,
		sharpsCount,
	};
}
