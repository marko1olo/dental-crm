/**
 * reorderSuggestionService.ts — Database service for predictive inventory reorder suggestions.
 *
 * Implements DentalPin predictive reorder model:
 * - Aggregates 90-day historical consumption from inventory_transactions.
 * - Computes daily usage, lead time demand, reorder point, and suggested order quantity.
 * - Kopeck-exact valuation of purchase orders.
 */

import {
	REORDER_COVER_DAYS,
	REORDER_LOOKBACK_DAYS,
	type ReorderItemInput,
	type ReorderSuggestionsResponse,
	computeReorderSuggestions,
} from "@dental/shared";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { inventoryItems, inventoryTransactions } from "../db/schema.js";

export class ReorderSuggestionService {
	/**
	 * Computes predictive reorder suggestions for an organization's inventory.
	 */
	static async getSuggestions(
		organizationId: string,
		options: {
			onlyNeedingReorder?: boolean;
			lookbackDays?: number;
			coverDays?: number;
		} = {},
	): Promise<ReorderSuggestionsResponse> {
		const lookbackDays = options.lookbackDays ?? REORDER_LOOKBACK_DAYS;
		const coverDays = options.coverDays ?? REORDER_COVER_DAYS;
		const cutoffDate = new Date(Date.now() - lookbackDays * 86_400_000);

		// 1. Fetch active inventory items
		const items = await db
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.organizationId, organizationId));

		if (items.length === 0) {
			return {
				summary: {
					totalItemsEvaluated: 0,
					itemsNeedingReorder: 0,
					totalSuggestedQuantity: 0,
					totalEstimatedCostKopecks: 0,
					totalEstimatedCostRub: 0,
				},
				suggestions: [],
			};
		}

		// 2. Fetch 90-day historical consumption
		// Sum negative movements (consumption / auto-deductions)
		const consumptionRows = await db
			.select({
				itemId: sql<string>`coalesce(${inventoryTransactions.inventoryItemId}, ${inventoryTransactions.itemId})`,
				totalConsumed: sql<string>`sum(abs(cast(coalesce(${inventoryTransactions.qty}, ${inventoryTransactions.quantityChanged}, 0) as numeric)))`,
			})
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, organizationId),
					gte(inventoryTransactions.createdAt, cutoffDate),
					sql`(cast(coalesce(${inventoryTransactions.qty}, ${inventoryTransactions.quantityChanged}, 0) as numeric) < 0 or ${inventoryTransactions.transactionType} in ('auto_deduct', 'consumption', 'writeoff', 'manual_writeoff'))`,
				),
			)
			.groupBy(
				sql`coalesce(${inventoryTransactions.inventoryItemId}, ${inventoryTransactions.itemId})`,
			);

		const consumptionMap = new Map<string, number>();
		for (const row of consumptionRows) {
			if (row.itemId) {
				consumptionMap.set(row.itemId, Number(row.totalConsumed) || 0);
			}
		}

		// 3. Build reorder inputs
		const inputs: ReorderItemInput[] = items.map((item) => {
			const stockQty = Number(item.stockQuantity ?? item.currentQty ?? 0);
			const minQty = Number(item.minQty ?? item.criticalThreshold ?? 0);
			const usage90d = consumptionMap.get(item.id) ?? 0;
			const unitCostRub = Number(item.unitCostRub ?? item.pricePerUnit ?? 0);

			return {
				inventoryItemId: item.id,
				itemName: item.name,
				category: item.category ?? "material",
				unit: item.unit ?? "шт",
				stockQuantity: stockQty,
				minQuantity: minQty,
				usage90d,
				onOrder: 0, // open POs if supported
				leadTimeDays: 5, // default 5 days lead time
				supplierId: null,
				supplierName: null,
				unitPriceRub: unitCostRub,
			};
		});

		// 4. Compute suggestions via pure engine
		return computeReorderSuggestions(inputs, {
			lookbackDays,
			coverDays,
			...(options.onlyNeedingReorder !== undefined
				? { onlyNeedingReorder: options.onlyNeedingReorder }
				: {}),
		});
	}
}
