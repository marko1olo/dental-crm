/**
 * bomBatchAllocation.ts — Allocates requested material quantity across unexpired FEFO batches.
 */

import { validateBatchForClinicalUse } from "../fefoTrafficLight.js";
import type {
	BatchCandidate,
	MatchBatchAllocation,
} from "./bomBatchMatcherTypes.js";

/**
 * Allocates requested material quantity across unexpired FEFO batches.
 */
export function allocateBatchesFefo(
	itemId: string,
	requiredQty: number,
	batches: readonly BatchCandidate[] | undefined,
	options: {
		chairId?: string | undefined;
		cabinetId?: string | undefined;
		visitDate?: string | undefined;
	} = {},
): readonly MatchBatchAllocation[] {
	if (!batches || batches.length === 0 || requiredQty <= 0) return [];

	const matching = batches
		.filter((b) => b.itemId === itemId)
		.filter((b) => !options.chairId || !b.chairId || b.chairId === options.chairId)
		.filter((b) => !options.cabinetId || !b.cabinetId || b.cabinetId === options.cabinetId)
		.filter((b) => validateBatchForClinicalUse(b, options.visitDate).isAllowed)
		.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

	let remainingToAllocate = requiredQty;
	const allocations: MatchBatchAllocation[] = [];

	for (const b of matching) {
		if (remainingToAllocate <= 0) break;
		const available = Math.max(0, b.stockQuantity);
		if (available <= 0) continue;

		const take = Math.min(available, remainingToAllocate);
		allocations.push({
			batchNumber: b.batchNumber,
			expiryDate: b.expiryDate,
			allocatedQuantity: Number(take.toFixed(4)),
		});
		remainingToAllocate -= take;
	}

	return allocations;
}
