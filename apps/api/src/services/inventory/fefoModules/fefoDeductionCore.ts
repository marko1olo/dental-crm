/**
 * @file fefoDeductionCore.ts
 * Основная логика списания FEFO, расчет дефицита и обновление баланса карточки (Мандат 8b).
 */

import { and, eq } from "drizzle-orm";
import { inventoryItems } from "../../../db/schema/inventory.js";
import { selectActiveBatchesForFefo, findNextActiveBatchInfo } from "../fefo/batchSelector.js";
import type { DbTransaction, DeductFefoParams, FefoDeductionResult } from "./types.js";
import { ensureInventoryItemForDeduction } from "./softOverdraftHandler.js";
import { flushInventoryTransactions, type InventoryTransactionInsert } from "./auditLogging.js";
import { deductFromActiveBatches } from "./fefoBatchDeductor.js";
import { resolveDeficitAndOverdraft } from "./fefoDeficitResolver.js";

export async function deductFefo(
	tx: DbTransaction,
	params: DeductFefoParams,
): Promise<FefoDeductionResult> {
	const {
		organizationId,
		inventoryItemId,
		requiredQty,
		warehouseId,
		visitId,
		userId,
		allowOverdraft = true,
		notes,
		transactionType = "treatment_consumable",
	} = params;

	if (requiredQty <= 0) {
		return {
			inventoryItemId,
			inventoryItemName: "",
			requiredQty: 0,
			deductedQty: 0,
			batchesUsed: [],
			isOverdraft: false,
			deficitQty: 0,
		};
	}

	const inv = await ensureInventoryItemForDeduction(tx, organizationId, inventoryItemId, allowOverdraft);
	const activeBatches = await selectActiveBatchesForFefo(tx, { organizationId, inventoryItemId, warehouseId });

	const { needed, batchesUsed, batchTransactions } = await deductFromActiveBatches(tx, {
		organizationId,
		itemId: inv.id,
		activeBatches,
		requiredQty,
		warehouseId,
		visitId,
		userId,
		transactionType,
		notes,
		defaultUnitCostRub: inv.unitCostRub,
	});

	const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
	const newStock = Number((currentStock - requiredQty).toFixed(4));

	const { additionalTransactions, isOverdraft, deficitQty, warning } = resolveDeficitAndOverdraft({
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
	});

	const transactionsToInsert: InventoryTransactionInsert[] = [...batchTransactions, ...additionalTransactions];
	const nextActiveBatch = await findNextActiveBatchInfo(tx, organizationId, inv.id);

	await tx
		.update(inventoryItems)
		.set({
			stockQuantity: String(newStock),
			currentQty: String(newStock),
			lotNumber: nextActiveBatch ? nextActiveBatch.batchNumber : (newStock <= 0 ? null : inv.lotNumber),
			expirationDate: nextActiveBatch ? nextActiveBatch.expirationDate : (newStock <= 0 ? null : inv.expirationDate),
			updatedAt: new Date(),
		})
		.where(and(eq(inventoryItems.id, inv.id), eq(inventoryItems.organizationId, organizationId)));

	await flushInventoryTransactions(tx, transactionsToInsert);

	return {
		inventoryItemId: inv.id,
		inventoryItemName: inv.name,
		requiredQty,
		deductedQty: requiredQty,
		batchesUsed,
		isOverdraft,
		deficitQty,
		warning,
	};
}
