/**
 * inventoryItemMatcher.ts — Matches and auto-creates uncataloged inventory items on-the-fly.
 */

import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import { inventoryItems } from "../../../db/schema.js";
import type { DbExecutor } from "../types.js";
import { isPureUuid } from "./stockDeductionTypes.js";

export interface AggregatedRawMaterial {
	key: string;
	quantity: number;
	unit: string;
	name?: string | undefined;
	defaultCostRub?: number | undefined;
	isMdlpRequired?: boolean | undefined;
}

export async function matchAndCreateInventoryItems(
	tx: DbExecutor,
	organizationId: string,
	aggregated: Map<string, AggregatedRawMaterial>,
): Promise<Map<string, typeof inventoryItems.$inferSelect>> {
	const keys = Array.from(aggregated.keys());
	const uuidKeys = keys.filter(isPureUuid);
	const nonUuidKeys = keys.filter((k) => !isPureUuid(k));

	const findConditions: Array<SQL<unknown>> = [];
	if (uuidKeys.length > 0) findConditions.push(inArray(inventoryItems.id, uuidKeys));
	if (nonUuidKeys.length > 0) {
		findConditions.push(
			inArray(inventoryItems.sku, nonUuidKeys),
			inArray(inventoryItems.barcode, nonUuidKeys),
			inArray(inventoryItems.name, nonUuidKeys),
		);
	}

	const existingRows = findConditions.length > 0
		? await tx.select().from(inventoryItems).where(
				and(eq(inventoryItems.organizationId, organizationId), or(...findConditions)),
			)
		: [];

	let allClinicItemsCache: (typeof inventoryItems.$inferSelect)[] | null = null;
	const keyToItemMap = new Map<string, typeof inventoryItems.$inferSelect>();

	for (const [key, entry] of aggregated.entries()) {
		const isUuid = isPureUuid(key);
		let matched = existingRows.find(
			(row) =>
				(isUuid && row.id === key) ||
				row.sku === key ||
				row.barcode === key ||
				row.name === key ||
				(entry.name && row.name.toLowerCase() === entry.name.toLowerCase()),
		);

		if (!matched && !isUuid) {
			if (!allClinicItemsCache) {
				allClinicItemsCache = await tx.select().from(inventoryItems).where(eq(inventoryItems.organizationId, organizationId));
			}
			const clinicItems = allClinicItemsCache ?? [];
			const lowerKey = String(key).toLowerCase();
			const lowerName = entry.name ? String(entry.name).toLowerCase() : "";
			matched = clinicItems.find((row) => {
				const rowLower = (row.name || "").toLowerCase();
				return (
					rowLower === lowerKey ||
					(lowerName.length > 0 && rowLower === lowerName) ||
					(lowerKey.includes("артикаин") && rowLower.includes("артикаин")) ||
					(lowerKey.includes("filtek") && rowLower.includes("filtek")) ||
					(lowerKey.includes("игла") && rowLower.includes("игла"))
				);
			});
		}

		if (matched) keyToItemMap.set(key, matched);
	}

	for (const [key, entry] of aggregated.entries()) {
		if (keyToItemMap.has(key)) continue;
		const isUuid = isPureUuid(key);
		const fallbackName = entry.name || (isUuid ? `Материал ${key}` : key);
		const defaultCost = entry.defaultCostRub != null ? String(entry.defaultCostRub) : "0";

		const [created] = await tx
			.insert(inventoryItems)
			.values({
				...(isUuid ? { id: key } : {}),
				organizationId,
				sku: isUuid ? null : key,
				name: fallbackName,
				unit: entry.unit || "шт",
				stockQuantity: "0",
				currentQty: "0",
				criticalThreshold: "0",
				unitCostRub: defaultCost,
			})
			.returning();

		if (created) keyToItemMap.set(key, created);
	}

	return keyToItemMap;
}
