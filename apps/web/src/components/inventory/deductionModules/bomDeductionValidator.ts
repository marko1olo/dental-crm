/**
 * bomDeductionValidator.ts — Inventory Stock & Overdraft Validation Module.
 *
 * Implements:
 * 1. Mandate 8e: Doctor Autonomy — Zero blocking modals or disabled buttons due to zero stock.
 * 2. Soft Overdraft recognition: deficit quantities trigger replenishment alerts without interrupting care.
 * 3. Exact deterministic kopeck reconciliations linked with materialsAutoDeductionSsot.ts.
 */

import {
	calculateProcedureDeductionSummary,
	type DeductionSummaryResult,
	formatInventoryQuantityWithUnitRu,
} from "@dental/shared";

export interface OverdraftItemAlert {
	readonly itemName: string;
	readonly inventoryItemId: string;
	readonly deficitQty: number;
}

export interface OverdraftAlertPayload {
	readonly visitId: string;
	readonly visitNumber?: string | undefined;
	readonly message: string;
	readonly chairId?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly items: readonly OverdraftItemAlert[];
}

export interface DeductionValidationSummary {
	readonly hasOverdraft: boolean;
	readonly overdraftItems: readonly OverdraftItemAlert[];
	readonly overdraftNotice: string;
	readonly toastMessage: string;
	readonly toastType: "success" | "warning";
	readonly ssotSummary?: DeductionSummaryResult | undefined;
}

/**
 * Validates stock balances against requested deduction quantities and
 * generates clinical feedback (Mandate 8e / 8n).
 */
export function validateDeductionBalances(
	deductedItems: ReadonlyArray<{
		readonly inventoryItemId: string;
		readonly itemName: string;
		readonly deductedQty: number;
		readonly remainingQty: number;
		readonly isOverdraft: boolean;
		readonly unitCostPriceKopecks: number;
		readonly unit?: string | undefined;
		readonly currentStock?: number | undefined;
	}>,
	meta: {
		readonly visitId: string;
		readonly visitNumber?: string | undefined;
		readonly totalCostPriceRub?: string | undefined;
	},
): DeductionValidationSummary {
	const overdraftItems: OverdraftItemAlert[] = [];

	for (const item of deductedItems) {
		if (item.isOverdraft || item.remainingQty < 0) {
			const deficit = Math.abs(item.remainingQty);
			overdraftItems.push({
				itemName: item.itemName,
				inventoryItemId: item.inventoryItemId,
				deficitQty: Number(deficit.toFixed(4)),
			});
		}
	}

	const hasOverdraft = overdraftItems.length > 0;
	const visitRef = meta.visitNumber || meta.visitId;
	const overdraftNotice = `Требуется оприходование: материал списан в овердрафт по визиту №${visitRef}`;

	let toastMessage = "";
	let toastType: "success" | "warning" = "success";

	if (hasOverdraft) {
		toastType = "warning";
		toastMessage = `Мягкий овердрафт. ${overdraftNotice} (${overdraftItems.length} поз., накладная в пути). Приём сохранён.`;
	} else {
		toastType = "success";
		toastMessage = `Автосписание расходников: ${deductedItems.length} поз. по нормам процедур списано со склада (${meta.totalCostPriceRub || "0 ₽"}).`;
	}

	// Calculate deterministic SSOT reconciliation summary
	const ssotSummary = calculateProcedureDeductionSummary(
		deductedItems.map((i) => ({
			inventoryItemId: i.inventoryItemId,
			nameRu: i.itemName,
			standardQuantity: i.deductedQty,
			deductedQuantity: i.deductedQty,
			currentStock: i.currentStock ?? Math.max(0, i.remainingQty + i.deductedQty),
			unitCostKopecks: i.unitCostPriceKopecks,
			...(i.unit ? { unit: i.unit } : {}),
		})),
	);

	return {
		hasOverdraft,
		overdraftItems,
		overdraftNotice,
		toastMessage,
		toastType,
		ssotSummary,
	};
}
