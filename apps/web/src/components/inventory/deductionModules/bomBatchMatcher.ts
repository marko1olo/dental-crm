/**
 * bomBatchMatcher.ts — FEFO/FIFO Batch Matching & Expiry Quarantine Engine.
 */

import { validateBatchForClinicalUse } from "../fefoTrafficLight.js";
import type {
	BatchCandidate,
	BatchResolutionResult,
} from "./bomBatchMatcherTypes.js";
import { allocateBatchesFefo } from "./bomBatchAllocation.js";

export type {
	BatchCandidate,
	BatchResolutionResult,
	MatchBatchAllocation,
} from "./bomBatchMatcherTypes.js";

export { allocateBatchesFefo };

/**
 * Filters candidate batches by room/chair, quarantines expired lots,
 * and compiles an effective unexpired stock map for clinical consumption.
 */
export function resolveFefoStockMap(
	batches: readonly BatchCandidate[] | undefined,
	options: {
		chairId?: string | undefined;
		cabinetId?: string | undefined;
		visitDate?: string | undefined;
		onExpiredBatchBlocked?: ((warning: {
			readonly batchNumber: string;
			readonly expiryDate: string;
			readonly alertMessage: string;
			readonly itemName: string;
		}) => void) | undefined;
	} = {},
): BatchResolutionResult {
	const validStockMap: Record<string, number> = {};
	let quarantinedBatchesCount = 0;

	if (!batches || batches.length === 0) {
		return { validStockMap, quarantinedBatchesCount };
	}

	const batchesByItem = new Map<string, BatchCandidate[]>();
	for (const b of batches) {
		if (options.chairId && b.chairId && b.chairId !== options.chairId) continue;
		if (options.cabinetId && b.cabinetId && b.cabinetId !== options.cabinetId) continue;

		const existing = batchesByItem.get(b.itemId) || [];
		existing.push(b);
		batchesByItem.set(b.itemId, existing);
	}

	for (const [itemId, candidateBatches] of batchesByItem.entries()) {
		const sorted = [...candidateBatches].sort((a, b) =>
			a.expiryDate.localeCompare(b.expiryDate),
		);

		let validUnexpiredStock = 0;
		for (const batch of sorted) {
			const validation = validateBatchForClinicalUse(batch, options.visitDate);
			if (!validation.isAllowed) {
				quarantinedBatchesCount++;
				if (options.onExpiredBatchBlocked) {
					options.onExpiredBatchBlocked({
						batchNumber: batch.batchNumber,
						expiryDate: batch.expiryDate,
						alertMessage: validation.alertMessage || "Срок годности партии истек",
						itemName: itemId,
					});
				}
			} else {
				validUnexpiredStock += Math.max(0, batch.stockQuantity);
			}
		}

		validStockMap[itemId] = validUnexpiredStock;
	}

	return { validStockMap, quarantinedBatchesCount };
}
