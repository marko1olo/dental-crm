/**
 * stockDeductionDbOperations.ts — Layer 2: Facade for DB operations & deadlock-free item locking.
 * Decomposed in accordance with Mandate 8b (<= 120 lines).
 */

import { isDeductibleQuantity } from "@dental/shared";
import type { DbExecutor } from "../types.js";
import {
	type RawRequiredMaterial,
	type ResolvedItemEntry,
} from "./stockDeductionTypes.js";
import {
	acquireToothDeductionLock,
	acquireVisitDeductionLock,
} from "./stockDeductionLocks.js";
import {
	checkIdempotentToothDeduction,
	checkIdempotentVisitDeduction,
} from "./stockDeductionIdempotency.js";
import { fetchAndCompleteTreatmentItemsForVisit } from "./treatmentItemReconciler.js";
import {
	type AggregatedRawMaterial,
	matchAndCreateInventoryItems,
} from "./inventoryItemMatcher.js";
import { lockAndAggregateInventoryItems } from "./inventoryItemLocker.js";

export {
	acquireToothDeductionLock,
	acquireVisitDeductionLock,
	checkIdempotentToothDeduction,
	checkIdempotentVisitDeduction,
	fetchAndCompleteTreatmentItemsForVisit,
};

export async function resolveAndLockInventoryItems(
	tx: DbExecutor,
	organizationId: string,
	rawMaterials: RawRequiredMaterial[],
): Promise<ResolvedItemEntry[]> {
	if (rawMaterials.length === 0) return [];

	const aggregated = new Map<string, AggregatedRawMaterial>();
	for (const m of rawMaterials) {
		if (!m.key || !isDeductibleQuantity(m.quantity)) continue;
		const existing = aggregated.get(m.key);
		if (existing) {
			existing.quantity += m.quantity;
		} else {
			aggregated.set(m.key, { ...m });
		}
	}

	if (aggregated.size === 0) return [];

	const keyToItemMap = await matchAndCreateInventoryItems(tx, organizationId, aggregated);
	return lockAndAggregateInventoryItems(tx, organizationId, aggregated, keyToItemMap);
}
