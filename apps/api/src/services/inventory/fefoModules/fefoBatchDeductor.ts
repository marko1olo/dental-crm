/**
 * @file fefoBatchDeductor.ts
 * Списание требуемого объема материала с активных партий stock_batches по алгоритму FEFO (Мандат 8b).
 */

import { eq } from "drizzle-orm";
import { stockBatches } from "../../../db/schema/inventory.js";
import type { DbTransaction, FefoBatchUsage } from "./types.js";
import type { InventoryTransactionInsert } from "./auditLogging.js";

export async function deductFromActiveBatches(
	tx: DbTransaction,
	params: {
		readonly organizationId: string;
		readonly itemId: string;
		readonly activeBatches: Array<typeof stockBatches.$inferSelect>;
		readonly requiredQty: number;
		readonly warehouseId?: string | null;
		readonly visitId?: string | null;
		readonly userId?: string | null;
		readonly transactionType: string;
		readonly notes?: string | null;
		readonly defaultUnitCostRub?: string | null;
	},
) {
	let needed = params.requiredQty;
	const batchesUsed: FefoBatchUsage[] = [];
	const batchTransactions: InventoryTransactionInsert[] = [];

	for (const batch of params.activeBatches) {
		if (needed <= 0) break;
		const remaining = Number(batch.remainingQty);
		if (remaining <= 0) continue;

		const take = Math.min(remaining, needed);
		const newRemaining = Number((remaining - take).toFixed(3));
		const isDepleted = newRemaining <= 0;

		await tx
			.update(stockBatches)
			.set({
				remainingQty: String(newRemaining),
				status: isDepleted ? "depleted" : "active",
				updatedAt: new Date(),
			})
			.where(eq(stockBatches.id, batch.id));

		batchesUsed.push({
			batchId: batch.id,
			batchNumber: batch.batchNumber,
			expirationDate: batch.expirationDate,
			quantityDeducted: take,
		});

		batchTransactions.push({
			organizationId: params.organizationId,
			visitId: params.visitId ?? null,
			itemId: params.itemId,
			inventoryItemId: params.itemId,
			batchId: batch.id,
			warehouseId: batch.warehouseId ?? params.warehouseId ?? null,
			quantityChanged: String(-take),
			unitCostRub: batch.purchasePricePerUnit ?? params.defaultUnitCostRub ?? null,
			transactionType: params.transactionType,
			isOverdraft: false,
			userId: params.userId ?? null,
			notes: params.notes ?? (params.visitId ? `Списание по визиту ${params.visitId} (партия ${batch.batchNumber})` : null),
		});

		needed = Number((needed - take).toFixed(4));
	}

	return { needed, batchesUsed, batchTransactions };
}
