/**
 * bomBatchMatcher.ts — FEFO/FIFO Batch Matching & Expiry Quarantine Engine.
 *
 * Implements:
 * 1. Strict chair/cabinet isolation: never deducts lots from a different operating suite.
 * 2. FEFO (First-Expired, First-Out) priority with FIFO fallback.
 * 3. Quarantine of expired batches: blocks usage and triggers statutory alert (Mandate 8e, 8n).
 */

import { validateBatchForClinicalUse } from "../fefoTrafficLight.js";

export interface BatchCandidate {
	readonly id?: string | undefined;
	readonly itemId: string;
	readonly batchNumber: string;
	readonly expiryDate: string;
	readonly stockQuantity: number;
	readonly chairId?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly locationId?: string | undefined;
}

export interface BatchResolutionResult {
	readonly validStockMap: Record<string, number>;
	readonly quarantinedBatchesCount: number;
}

export interface MatchBatchAllocation {
	readonly batchNumber: string;
	readonly expiryDate: string;
	readonly allocatedQuantity: number;
}

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
		// Strict isolation: skip batches belonging to a different chair or cabinet
		if (options.chairId && b.chairId && b.chairId !== options.chairId) continue;
		if (options.cabinetId && b.cabinetId && b.cabinetId !== options.cabinetId) continue;

		const existing = batchesByItem.get(b.itemId) || [];
		existing.push(b);
		batchesByItem.set(b.itemId, existing);
	}

	for (const [itemId, candidateBatches] of batchesByItem.entries()) {
		// Sort candidates by expiry date ascending (FEFO)
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
