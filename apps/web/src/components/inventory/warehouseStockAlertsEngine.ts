import { getFefoTrafficLight } from "./fefoTrafficLight.js";
import type { InventoryItem } from "./useInventoryLogic.js";

export interface WarehouseStockAlertsBarProps {
	readonly items: readonly InventoryItem[];
	readonly onOpenWaybills?: (() => void) | undefined;
	readonly onOpenBatchTracking?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly className?: string | undefined;
	readonly referenceDate?: string | Date | undefined;
}

export interface WarehouseStockAlertMetrics {
	readonly lowStockCount: number;
	readonly overdraftCount: number;
	readonly expiredCount: number;
	readonly expiringSoonCount: number;
	readonly hasAlerts: boolean;
}

export function calculateWarehouseStockAlertMetrics(
	items: readonly InventoryItem[],
	referenceDate?: string | Date | undefined,
): WarehouseStockAlertMetrics {
	let lowStockCount = 0;
	let overdraftCount = 0;
	let expiredCount = 0;
	let expiringSoonCount = 0;

	for (const item of items) {
		const qty = Number(item.stockQuantity) || 0;
		const threshold = Number(item.criticalThreshold) || 5;

		if (qty < 0) {
			overdraftCount++;
		} else if (qty <= threshold) {
			lowStockCount++;
		}

		if (item.expirationDate) {
			const fefo = getFefoTrafficLight(item.expirationDate, referenceDate);
			if (fefo.status === "red") {
				expiredCount++;
			} else if (fefo.status === "yellow") {
				expiringSoonCount++;
			}
		}
	}

	return {
		lowStockCount,
		overdraftCount,
		expiredCount,
		expiringSoonCount,
		hasAlerts:
			lowStockCount > 0 ||
			overdraftCount > 0 ||
			expiredCount > 0 ||
			expiringSoonCount > 0,
	};
}
