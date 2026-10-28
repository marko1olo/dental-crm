/**
 * @file batchReceiving.ts
 * Оприходование партий медикаментов и расходников, закрытие технического дефицита (Мандат 8b).
 */

import { and, eq } from "drizzle-orm";
import { inventoryItems, stockBatches } from "../../../db/schema/inventory.js";
import type { DbTransaction, ReceiveBatchInput } from "./types.js";
import { validateAndNormalizeBatch } from "./batchValidationAndLabeling.js";
import { resolveDeficitOnReceipt } from "./softOverdraftHandler.js";
import { buildReceiptTransaction, flushInventoryTransactions } from "./auditLogging.js";

export async function receiveBatch(
	tx: DbTransaction,
	input: ReceiveBatchInput,
): Promise<typeof stockBatches.$inferSelect> {
	const {
		organizationId,
		inventoryItemId,
		warehouseId,
		quantity,
		purchasePricePerUnit,
		userId,
		notes,
	} = input;

	if (quantity <= 0) {
		throw new Error("Количество приходуемой партии должно быть положительным числом.");
	}

	const batchMeta = validateAndNormalizeBatch({
		rawBatchNumber: input.batchNumber,
		rawExpirationDate: input.expirationDate,
		rawManufactureDate: input.manufactureDate ?? null,
		rawBarcode: input.barcode ?? null,
	});

	const [inv] = await tx
		.select()
		.from(inventoryItems)
		.where(
			and(
				eq(inventoryItems.id, inventoryItemId),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.for("update");

	if (!inv) {
		throw new Error(`Материал с ID ${inventoryItemId} не найден.`);
	}

	const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
	const { deficit, remainingInBatch, isDepletedByDeficit, newStock } =
		resolveDeficitOnReceipt(currentStock, quantity);

	const [createdBatch] = await tx
		.insert(stockBatches)
		.values({
			organizationId,
			warehouseId: warehouseId ?? null,
			inventoryItemId,
			batchNumber: batchMeta.batchNumber,
			expirationDate: batchMeta.expirationDate,
			manufactureDate: batchMeta.manufactureDate ?? null,
			initialQty: String(quantity),
			remainingQty: String(remainingInBatch),
			purchasePricePerUnit:
				purchasePricePerUnit != null ? String(purchasePricePerUnit) : null,
			status: isDepletedByDeficit ? "depleted" : "active",
			barcode: batchMeta.barcode,
		})
		.returning();

	if (!createdBatch) {
		throw new Error("Не удалось сохранить партию в базе данных.");
	}

	const shouldUpdateCardDate =
		!inv.expirationDate || batchMeta.expirationDate < inv.expirationDate;

	await tx
		.update(inventoryItems)
		.set({
			stockQuantity: String(newStock),
			currentQty: String(newStock),
			lotNumber: shouldUpdateCardDate ? batchMeta.batchNumber : inv.lotNumber,
			expirationDate: shouldUpdateCardDate ? batchMeta.expirationDate : inv.expirationDate,
			unitCostRub:
				purchasePricePerUnit != null ? String(purchasePricePerUnit) : inv.unitCostRub,
			updatedAt: new Date(),
		})
		.where(eq(inventoryItems.id, inv.id));

	const receiptTx = buildReceiptTransaction({
		organizationId,
		itemId: inv.id,
		batchId: createdBatch.id,
		warehouseId: warehouseId ?? null,
		quantity,
		unitCostRub: purchasePricePerUnit != null ? String(purchasePricePerUnit) : inv.unitCostRub,
		userId: userId ?? null,
		notes: notes ?? null,
		closedDeficit: deficit,
	});

	await flushInventoryTransactions(tx, [receiptTx]);
	return createdBatch;
}
