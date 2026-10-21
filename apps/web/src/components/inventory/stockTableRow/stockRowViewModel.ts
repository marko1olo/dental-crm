import type { InventoryItem } from "../inventoryDataMappers.js";
import {
	getCategoryBadge,
	getExpiryTrafficLight,
	getWarehouseFefoTrafficLight,
	type FefoTrafficLightInfo,
} from "../inventoryExpiryUtils.js";

export function computeStockRowViewModel(item: InventoryItem) {
	const stock = Number(item.stockQuantity ?? 0);
	const isLowStock = stock <= (item.criticalThreshold ?? 5);
	const isOverdraft = stock <= 0;
	const unitCostRaw = Number(item.unitCostRub);
	const unitCost = Number.isFinite(unitCostRaw) ? unitCostRaw : null;
	const lineValue = unitCost !== null && Number.isFinite(stock) ? stock * unitCost : null;
	const catInfo = getCategoryBadge(item.category);

	const now = new Date();
	const expiryTraffic = getExpiryTrafficLight(item.expirationDate, now);
	const fefoInfo: FefoTrafficLightInfo | null = item.expirationDate
		? getWarehouseFefoTrafficLight(item.expirationDate, now)
		: null;

	return {
		stock,
		isLowStock,
		isOverdraft,
		unitCost,
		lineValue,
		catInfo,
		expiryTraffic,
		fefoInfo,
	};
}
