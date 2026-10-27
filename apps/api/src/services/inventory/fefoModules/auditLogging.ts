/**
 * @file auditLogging.ts
 * Журнал складских транзакций (audit trail) в таблице inventory_transactions (Мандат 8b).
 */

import { inventoryTransactions } from "../../../db/schema/inventory.js";
import type { DbTransaction } from "./types.js";

export type InventoryTransactionInsert = typeof inventoryTransactions.$inferInsert;

export async function flushInventoryTransactions(
	tx: DbTransaction,
	transactions: InventoryTransactionInsert[],
): Promise<void> {
	if (transactions.length === 0) return;
	await tx.insert(inventoryTransactions).values(transactions);
}

export function buildReceiptTransaction(params: {
	readonly organizationId: string;
	readonly itemId: string;
	readonly batchId: string;
	readonly warehouseId?: string | null;
	readonly quantity: number;
	readonly unitCostRub?: string | null;
	readonly userId?: string | null;
	readonly notes?: string | null;
	readonly closedDeficit?: number;
}): InventoryTransactionInsert {
	const {
		organizationId,
		itemId,
		batchId,
		warehouseId,
		quantity,
		unitCostRub,
		userId,
		notes,
		closedDeficit = 0,
	} = params;

	const note =
		closedDeficit > 0
			? `${notes ? `${notes} • ` : ""}Поступление (${quantity} ед., закрыт технический дефицит ${closedDeficit} ед.)`
			: (notes ?? `Поступление партии (${quantity} ед.)`);

	return {
		organizationId,
		itemId,
		inventoryItemId: itemId,
		batchId,
		warehouseId: warehouseId ?? null,
		quantityChanged: String(quantity),
		unitCostRub: unitCostRub ?? null,
		transactionType: "receipt",
		userId: userId ?? null,
		notes: note,
	};
}
