/**
 * consumableFefoAllocator.ts — Layer 1: FEFO (First Expired, First Out) batch selection,
 * write-off cost calculation in integer kopecks, and Mandate 8e soft-overdraft response builders.
 */

import { InsufficientStockError } from "../../services/treatmentConsumablesService.js";
import type {
	FefoAllocatedBatchSlice,
	FefoAllocationSummary,
	FefoBatchCandidate,
	SoftOverdraftContext,
	SoftOverdraftFallbackResponse,
} from "./types.js";

/**
 * Converts a ruble amount (number or numeric string) into integer kopecks without IEEE-754 drift.
 */
export function rubToKopecks(rub: number | string | null | undefined): number {
	if (rub === null || rub === undefined || rub === "") return 0;
	const parsed = typeof rub === "number" ? rub : Number(String(rub).trim().replace(",", "."));
	if (!Number.isFinite(parsed) || parsed < 0) return 0;
	return Math.round(parsed * 100);
}

/**
 * Formats integer kopecks back into a canonical ruble decimal string ("123.45").
 */
export function kopecksToRubString(kopecks: number): string {
	if (!Number.isFinite(kopecks)) return "0.00";
	const safeKopecks = Math.round(kopecks);
	return (safeKopecks / 100).toFixed(2);
}

/**
 * Calculates the write-off cost in integer kopecks for a given quantity and unit cost in kopecks.
 */
export function calculateWriteOffCostKopecks(
	quantity: number,
	unitCostKopecks: number,
): number {
	if (!Number.isFinite(quantity) || quantity <= 0) return 0;
	if (!Number.isFinite(unitCostKopecks) || unitCostKopecks <= 0) return 0;
	return Math.round(quantity * unitCostKopecks);
}

/**
 * Compares two FEFO batch candidates by earliest expirationDate ASC, then createdAt ASC, then batchId ASC.
 * Batches without an expiration date are placed after dated batches.
 */
export function compareFefoBatches(a: FefoBatchCandidate, b: FefoBatchCandidate): number {
	const expA = a.expirationDate ? String(a.expirationDate).trim() : null;
	const expB = b.expirationDate ? String(b.expirationDate).trim() : null;

	if (expA && expB && expA !== expB) {
		return expA.localeCompare(expB);
	}
	if (expA && !expB) return -1;
	if (!expA && expB) return 1;

	const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
	const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
	if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
		return timeA - timeB;
	}

	return a.batchId.localeCompare(b.batchId);
}

/**
 * Pure FEFO (First Expired, First Out) batch allocator and kopeck cost calculator.
 * Selects batches with earliest expiration dates first, computes exact write-off cost in kopecks,
 * and evaluates unbatched fallback or soft-overdraft deficit (Mandate 8e).
 */
export function allocateFefoBatches(params: {
	inventoryItemId: string;
	requiredQty: number;
	batches: FefoBatchCandidate[];
	totalCardStockQty?: number | string | null | undefined;
	fallbackUnitCostRub?: number | string | null | undefined;
	fallbackUnitCostKopecks?: number | null | undefined;
}): FefoAllocationSummary {
	const {
		inventoryItemId,
		requiredQty,
		batches,
		totalCardStockQty,
		fallbackUnitCostRub,
		fallbackUnitCostKopecks,
	} = params;

	const defaultUnitCostKopecks =
		fallbackUnitCostKopecks != null && Number.isFinite(fallbackUnitCostKopecks)
			? Math.max(0, Math.round(fallbackUnitCostKopecks))
			: rubToKopecks(fallbackUnitCostRub);

	if (!Number.isFinite(requiredQty) || requiredQty <= 0) {
		return {
			inventoryItemId,
			requiredQty: 0,
			allocatedFromBatchesQty: 0,
			unbatchedFallbackQty: 0,
			deficitQty: 0,
			isOverdraft: false,
			totalCostKopecks: 0,
			totalCostRub: "0.00",
			slices: [],
		};
	}

	const sortedBatches = [...batches].sort(compareFefoBatches);
	let needed = Number(requiredQty.toFixed(4));
	let allocatedFromBatchesQty = 0;
	let totalCostKopecks = 0;
	const slices: FefoAllocatedBatchSlice[] = [];

	for (const batch of sortedBatches) {
		if (needed <= 0) break;
		const remaining = Number(batch.remainingQty);
		if (!Number.isFinite(remaining) || remaining <= 0) continue;

		const take = Number(Math.min(remaining, needed).toFixed(4));
		if (take <= 0) continue;

		const remainingAfter = Number(Math.max(0, remaining - take).toFixed(3));
		const batchUnitCostKopecks =
			batch.unitCostKopecks != null && Number.isFinite(batch.unitCostKopecks)
				? Math.max(0, Math.round(batch.unitCostKopecks))
				: batch.unitCostRub != null
					? rubToKopecks(batch.unitCostRub)
					: defaultUnitCostKopecks;

		const sliceCostKopecks = calculateWriteOffCostKopecks(take, batchUnitCostKopecks);

		slices.push({
			batchId: batch.batchId,
			batchNumber: batch.batchNumber,
			expirationDate: batch.expirationDate ?? null,
			quantityDeducted: take,
			remainingAfter,
			depleted: remainingAfter <= 0,
			unitCostKopecks: batchUnitCostKopecks,
			totalSliceCostKopecks: sliceCostKopecks,
			warehouseId: batch.warehouseId ?? null,
		});

		allocatedFromBatchesQty = Number((allocatedFromBatchesQty + take).toFixed(4));
		totalCostKopecks += sliceCostKopecks;
		needed = Number((needed - take).toFixed(4));
	}

	let unbatchedFallbackQty = 0;
	let deficitQty = 0;

	if (needed > 0) {
		const cardStock =
			totalCardStockQty != null && Number.isFinite(Number(totalCardStockQty))
				? Number(totalCardStockQty)
				: allocatedFromBatchesQty;
		const availableUnbatched = Math.max(0, Number((cardStock - allocatedFromBatchesQty).toFixed(4)));
		unbatchedFallbackQty = Number(Math.min(needed, availableUnbatched).toFixed(4));
		deficitQty = Number(Math.max(0, needed - unbatchedFallbackQty).toFixed(4));

		// Cost of unbatched + overdraft units is valued at the item's fallback unit cost in kopecks
		totalCostKopecks += calculateWriteOffCostKopecks(
			unbatchedFallbackQty + deficitQty,
			defaultUnitCostKopecks,
		);
	}

	return {
		inventoryItemId,
		requiredQty,
		allocatedFromBatchesQty,
		unbatchedFallbackQty,
		deficitQty,
		isOverdraft: deficitQty > 0,
		totalCostKopecks,
		totalCostRub: kopecksToRubString(totalCostKopecks),
		slices,
	};
}

/**
 * Checks if a caught error represents an InsufficientStockError from the warehouse layer.
 */
export function isInsufficientStockError(err: unknown): boolean {
	if (!err) return false;
	const anyErr = err as Record<string, unknown>;
	return (
		err instanceof InsufficientStockError ||
		anyErr.error === "InsufficientStock" ||
		anyErr.name === "InsufficientStockError" ||
		anyErr.code === "InsufficientStock"
	);
}

/**
 * Builds the non-blocking HTTP 200 soft-overdraft payload (Mandate 8e: Doctor Autonomy).
 * Preserves 1:1 exact messages for visit, tooth_treatment, and emergency_writeoff contexts.
 */
export function buildSoftOverdraftResponse(
	err: unknown,
	context: SoftOverdraftContext,
): SoftOverdraftFallbackResponse {
	const itemErr = (err ?? {}) as Record<string, unknown>;
	const invItemId = typeof itemErr.inventoryItemId === "string" ? itemErr.inventoryItemId : "unknown";
	const invItemName = typeof itemErr.inventoryItemName === "string" ? itemErr.inventoryItemName : "Материал";
	const avail = Number(itemErr.availableStock ?? 0);
	const req = Number(itemErr.requiredStock ?? 1);

	let warning: string;
	let itemWarningMessage: string;

	if (context === "visit") {
		warning = `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}). Приём проведён без блокировки.`;
		itemWarningMessage = `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}).`;
	} else if (context === "tooth_treatment") {
		warning = `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}). Процедура проведена без блокировки.`;
		itemWarningMessage = `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}).`;
	} else {
		warning = `Мягкий овердрафт склада: дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}). Операция проведена без блокировки.`;
		itemWarningMessage = `Мягкий овердрафт склада: дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}).`;
	}

	return {
		success: true,
		isOverdraft: true,
		warning,
		inventoryItemId: invItemId,
		inventoryItemName: invItemName,
		availableStock: avail,
		requiredStock: req,
		deductions: [],
		warnings: [
			{
				type: "out_of_stock",
				itemId: invItemId,
				itemName: invItemName,
				message: itemWarningMessage,
				currentStock: avail - req,
				criticalThreshold: 0,
			},
		],
	};
}
