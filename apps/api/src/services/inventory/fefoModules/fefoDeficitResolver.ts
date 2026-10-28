/**
 * @file fefoDeficitResolver.ts
 * Расчет дефицита и подготовка транзакций овердрафта при нехватке партий FEFO (Мандат 8b).
 */

import { InsufficientStockError } from "../materialDeduction.js";
import type { InventoryTransactionInsert } from "./auditLogging.js";

export function resolveDeficitAndOverdraft(params: {
	readonly inv: { id: string; name: string; unit?: string | null; unitCostRub?: string | null };
	readonly needed: number;
	readonly currentStock: number;
	readonly requiredQty: number;
	readonly allowOverdraft: boolean;
	readonly organizationId: string;
	readonly visitId?: string | null;
	readonly warehouseId?: string | null;
	readonly transactionType: string;
	readonly userId?: string | null;
	readonly notes?: string | null;
}) {
	const {
		inv,
		needed,
		currentStock,
		requiredQty,
		allowOverdraft,
		organizationId,
		visitId,
		warehouseId,
		transactionType,
		userId,
		notes,
	} = params;

	const additionalTransactions: InventoryTransactionInsert[] = [];
	let isOverdraft = false;
	let deficitQty = 0;
	let warning: string | undefined;

	if (needed > 0) {
		const alreadyDeducted = requiredQty - needed;
		const availableUnbatched = Math.max(0, currentStock - alreadyDeducted);
		const unbatchedDeduct = Math.min(needed, availableUnbatched);
		const trueDeficit = Number((needed - unbatchedDeduct).toFixed(4));

		if (unbatchedDeduct > 0) {
			additionalTransactions.push({
				organizationId,
				visitId: visitId ?? null,
				itemId: inv.id,
				inventoryItemId: inv.id,
				batchId: null,
				warehouseId: warehouseId ?? null,
				quantityChanged: String(-unbatchedDeduct),
				unitCostRub: inv.unitCostRub ?? null,
				transactionType,
				isOverdraft: false,
				userId: userId ?? null,
				notes: notes ?? (visitId ? `Списание по визиту ${visitId} (остаток номенклатуры)` : null),
			});
		}

		if (trueDeficit > 0) {
			deficitQty = trueDeficit;
			// Мандат 8n & Soft Negative Stock: жесткий отказ ликвидирован,
			// операция завершается успешно с мягким овердрафтом (код 200 OK)
			// и неблокирующим статусом «Требуется пополнение».
			isOverdraft = true;
			warning = `Внимание: допущен технический перерасход по материалу «${inv.name}» (дефицит ${deficitQty} ${inv.unit ?? "ед."}). Требуется пополнение склада.`;

			additionalTransactions.push({
				organizationId,
				visitId: visitId ?? null,
				itemId: inv.id,
				inventoryItemId: inv.id,
				batchId: null,
				warehouseId: warehouseId ?? null,
				quantityChanged: String(-deficitQty),
				unitCostRub: inv.unitCostRub ?? null,
				transactionType: "emergency_overdraft",
				isOverdraft: true,
				userId: userId ?? null,
				notes: notes ? `${notes} (дефицит ${deficitQty} ед.)` : `Технический перерасход при оказании помощи (дефицит ${deficitQty} ед.)`,
			});
		}
	}

	return { additionalTransactions, isOverdraft, deficitQty, warning };
}
