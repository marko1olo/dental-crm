/**
 * inventoryReports.ts — Layer 2: Inventory alerts summary, expiration categorization, and stock valuation.
 */

import {
	type InventoryAlertItem,
	type InventoryAlertSummary,
	type InventoryAlertsResponse,
	categorizeInventoryExpiry,
} from "@dental/shared";
import { eq } from "drizzle-orm";
import { inventoryItems } from "../../db/schema.js";
import type { DbExecutor } from "./types.js";

/**
 * Get inventory alerts summary: low stock and expiring/expired items.
 */
export async function getInventoryAlerts(
	executor: DbExecutor,
	organizationId: string,
	params: { expiringWithinDays?: number | undefined } = {},
): Promise<InventoryAlertsResponse> {
	const items = await executor
		.select()
		.from(inventoryItems)
		.where(eq(inventoryItems.organizationId, organizationId))
		.orderBy(inventoryItems.name);

	const now = new Date();
	const daysAhead = params.expiringWithinDays ?? 30;

	const lowStockItems: InventoryAlertItem[] = [];
	const outOfStockItems: InventoryAlertItem[] = [];
	const expiredItems: InventoryAlertItem[] = [];
	const expiringSoonItems: InventoryAlertItem[] = [];

	let totalValuationRub = 0;

	for (const item of items) {
		const stock = Number(item.stockQuantity ?? item.currentQty ?? 0);
		const threshold = Number(item.criticalThreshold ?? item.minQty ?? 0);
		const cost = Number(item.unitCostRub ?? item.pricePerUnit ?? 0);

		if (Number.isFinite(stock) && Number.isFinite(cost)) {
			totalValuationRub += Math.max(0, stock) * Math.max(0, cost);
		}

		const alertItem: InventoryAlertItem = {
			id: item.id,
			name: item.name,
			category: item.category,
			unit: item.unit,
			stockQuantity: stock,
			criticalThreshold: threshold,
			unitCostRub: cost,
			sku: item.sku,
			barcode: item.barcode,
			lotNumber: item.lotNumber,
			expirationDate: item.expirationDate,
			daysUntilExpiration: null,
		};

		if (stock <= 0) {
			outOfStockItems.push(alertItem);
		} else if (threshold > 0 && stock <= threshold) {
			lowStockItems.push(alertItem);
		}

		if (item.expirationDate) {
			const expiry = categorizeInventoryExpiry(item.expirationDate, now);
			alertItem.daysUntilExpiration = expiry.daysRemaining;

			if (expiry.status === "expired") {
				expiredItems.push(alertItem);
			} else if (expiry.status === "expiring_soon") {
				expiringSoonItems.push(alertItem);
			}
		}
	}

	const summary: InventoryAlertSummary = {
		totalItems: items.length,
		totalValuationRub: Number(totalValuationRub.toFixed(2)),
		lowStockCount: lowStockItems.length,
		outOfStockCount: outOfStockItems.length,
		expiredCount: expiredItems.length,
		expiringSoonCount: expiringSoonItems.length,
	};

	return {
		summary,
		lowStockItems,
		outOfStockItems,
		expiredItems,
		expiringSoonItems,
	};
}
