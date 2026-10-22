import type {
	FefoBatchAllocation,
	FefoDeductionResolutionResult,
} from "./fefoTypes.js";
import { getFefoTrafficLight } from "./fefoTrafficLightCore.js";
import { validateBatchForClinicalUse } from "./fefoBatchValidation.js";

export function sortBatchesByFefo<
	T extends {
		readonly expiryDate?: string | null | undefined;
		readonly expirationDate?: string | null | undefined;
	},
>(batches: readonly T[], referenceDate: string | Date = new Date()): T[] {
	return [...batches].sort((a, b) => {
		const expA = a.expiryDate || a.expirationDate;
		const expB = b.expiryDate || b.expirationDate;
		const tA = getFefoTrafficLight(expA, referenceDate);
		const tB = getFefoTrafficLight(expB, referenceDate);

		if (tA.daysLeft > 0 && tB.daysLeft > 0) {
			return tA.daysLeft - tB.daysLeft;
		}
		if (tA.daysLeft > 0 && tB.daysLeft <= 0) return -1;
		if (tA.daysLeft <= 0 && tB.daysLeft > 0) return 1;

		return tA.daysLeft - tB.daysLeft;
	});
}

export function resolveFefoDeductionBatches<
	T extends {
		readonly id?: string | undefined;
		readonly expiryDate?: string | null | undefined;
		readonly expirationDate?: string | null | undefined;
		readonly batchNumber?: string | null | undefined;
		readonly lotNumber?: string | null | undefined;
		readonly stockQuantity?: number | undefined;
	},
>(
	batches: readonly T[],
	requiredQuantity: number,
	referenceDate: string | Date = new Date(),
): FefoDeductionResolutionResult<T> {
	const sorted = sortBatchesByFefo(batches, referenceDate);
	const allocatedBatches: Array<FefoBatchAllocation<T>> = [];
	const blockedExpiredBatches: Array<{ batch: T; alertMessage: string }> = [];

	let remainingNeeded = Math.max(0, requiredQuantity);
	let allocatedTotal = 0;

	for (const b of sorted) {
		const validation = validateBatchForClinicalUse(b, referenceDate);
		if (!validation.isAllowed) {
			blockedExpiredBatches.push({
				batch: b,
				alertMessage: validation.alertMessage!,
			});
			continue;
		}

		if (remainingNeeded <= 0) break;

		const availableQty = Math.max(0, Number(b.stockQuantity) || 0);
		if (availableQty <= 0) continue;

		const deductQty = Math.min(availableQty, remainingNeeded);
		allocatedBatches.push({
			batch: b,
			allocatedQuantity: deductQty,
		});
		allocatedTotal += deductQty;
		remainingNeeded -= deductQty;
	}

	return {
		allocatedBatches,
		allocatedTotalQuantity: allocatedTotal,
		remainingDeficit: remainingNeeded,
		blockedExpiredBatches,
		hasOverdraft: remainingNeeded > 0,
	};
}
