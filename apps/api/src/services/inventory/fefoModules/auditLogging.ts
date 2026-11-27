/**
 * @file auditLogging.ts
 * Журнал складских транзакций (audit trail) в таблице inventory_transactions (Мандат 8b).
 */

import { resolveCostKopecks } from "@dental/shared";
import { inventoryTransactions } from "../../../db/schema/inventory.js";
import type { DbTransaction } from "./types.js";

export type InventoryTransactionInsert = typeof inventoryTransactions.$inferInsert;

export async function flushInventoryTransactions(
	tx: DbTransaction,
	transactions: InventoryTransactionInsert[],
): Promise<string[]> {
	if (transactions.length === 0) return [];
	const inserted = await tx
		.insert(inventoryTransactions)
		.values(transactions)
		.returning({ id: inventoryTransactions.id });
	return inserted.map((row) => row.id);
}

export function buildReceiptTransaction(params: {
	readonly organizationId: string;
	readonly itemId: string;
	readonly batchId: string;
	readonly warehouseId?: string | null;
	readonly quantity: number;
	readonly unitCostRub?: string | null;
	readonly unitCostKopecks?: bigint | null | undefined;
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
		unitCostKopecks,
		userId,
		notes,
		closedDeficit = 0,
	} = params;

	const note =
		closedDeficit > 0
			? `${notes ? `${notes} • ` : ""}Поступление (${quantity} ед., закрыт технический дефицит ${closedDeficit} ед.)`
			: (notes ?? `Поступление партии (${quantity} ед.)`);

	const resolvedCostKopecks = resolveCostKopecks(unitCostKopecks, unitCostRub);

	return {
		organizationId,
		itemId,
		inventoryItemId: itemId,
		batchId,
		warehouseId: warehouseId ?? null,
		qty: String(quantity),
		quantityChanged: String(quantity),
		unitCostRub: unitCostRub ?? null,
		unitCostKopecks: resolvedCostKopecks,
		transactionType: "receipt",
		userId: userId ?? null,
		notes: note,
	};
}
