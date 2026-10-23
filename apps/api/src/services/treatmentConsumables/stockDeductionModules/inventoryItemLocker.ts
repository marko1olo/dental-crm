/**
 * inventoryItemLocker.ts — Locks inventory items in sorted UUID order and prepares ResolvedItemEntry.
 */

import { and, eq, inArray } from "drizzle-orm";
import { inventoryItems } from "../../../db/schema.js";
import type { DbExecutor } from "../types.js";
import type { AggregatedRawMaterial } from "./inventoryItemMatcher.js";
import type { ResolvedItemEntry } from "./stockDeductionTypes.js";

export async function lockAndAggregateInventoryItems(
	tx: DbExecutor,
	organizationId: string,
	aggregated: Map<string, AggregatedRawMaterial>,
	keyToItemMap: Map<string, typeof inventoryItems.$inferSelect>,
): Promise<ResolvedItemEntry[]> {
	const distinctResolvedUuids = Array.from(
		new Set(Array.from(keyToItemMap.values()).map((it) => it.id)),
	).sort();

	if (distinctResolvedUuids.length === 0) return [];

	const lockedRows = await tx
		.select()
		.from(inventoryItems)
		.where(
			and(
				eq(inventoryItems.organizationId, organizationId),
				inArray(inventoryItems.id, distinctResolvedUuids),
			),
		)
		.for("update");

	const lockedById = new Map(lockedRows.map((row) => [row.id, row]));
	const byFinalItemId = new Map<string, {
		item: typeof inventoryItems.$inferSelect;
		requiredQty: number;
		ruleUnit: string;
		isMdlpRequired?: boolean | undefined;
	}>();

	for (const [key, entry] of aggregated.entries()) {
		const rawItem = keyToItemMap.get(key);
		if (!rawItem) continue;
		const lockedItem = lockedById.get(rawItem.id);
		if (!lockedItem) continue;

		const existing = byFinalItemId.get(lockedItem.id);
		if (existing) {
			existing.requiredQty += entry.quantity;
		} else {
			byFinalItemId.set(lockedItem.id, {
				item: lockedItem,
				requiredQty: entry.quantity,
				ruleUnit: entry.unit,
				isMdlpRequired: entry.isMdlpRequired,
			});
		}
	}

	return Array.from(byFinalItemId.values());
}
