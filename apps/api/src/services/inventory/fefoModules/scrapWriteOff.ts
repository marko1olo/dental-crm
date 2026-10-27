/**
 * @file scrapWriteOff.ts
 * Списание просроченных или бракованных материалов по акту утилизации ТОРГ-16 (Мандат 8b).
 */

import { and, eq } from "drizzle-orm";
import {
	inventoryItems,
	inventoryTransactions,
	stockBatches,
} from "../../../db/schema/inventory.js";
import type { DbTransaction, WriteOffResult, WriteOffScrapInput } from "./types.js";

export async function writeOffExpiredOrScrap(
	tx: DbTransaction,
	input: WriteOffScrapInput,
): Promise<WriteOffResult> {
	const {
		organizationId,
		inventoryItemId,
		batchId,
		quantity,
		reason,
		actNumber,
		notes,
		userId,
	} = input;

	if (quantity <= 0) {
		throw new Error("Количество списываемого материала должно быть больше 0.");
	}

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

	let batchFound: typeof stockBatches.$inferSelect | undefined;

	if (batchId) {
		const [b] = await tx
			.select()
			.from(stockBatches)
			.where(
				and(
					eq(stockBatches.id, batchId),
					eq(stockBatches.organizationId, organizationId),
				),
			)
			.for("update");
		batchFound = b;
	}

	if (batchFound) {
		const rem = Number(batchFound.remainingQty);
		const newRem = Math.max(0, Number((rem - quantity).toFixed(3)));
		await tx
			.update(stockBatches)
			.set({
				remainingQty: String(newRem),
				status: newRem <= 0 ? "expired" : "active",
				updatedAt: new Date(),
			})
			.where(eq(stockBatches.id, batchFound.id));
	}

	const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
	const newStock = Number((currentStock - quantity).toFixed(3));

	await tx
		.update(inventoryItems)
		.set({
			stockQuantity: String(newStock),
			currentQty: String(newStock),
			updatedAt: new Date(),
		})
		.where(eq(inventoryItems.id, inv.id));

	await tx.insert(inventoryTransactions).values({
		organizationId,
		itemId: inv.id,
		inventoryItemId: inv.id,
		batchId: batchId ?? null,
		quantityChanged: String(-quantity),
		unitCostRub: batchFound?.purchasePricePerUnit ?? inv.unitCostRub,
		transactionType: reason === "expired" ? "write_off_expired" : "write_off_scrap",
		userId: userId ?? null,
		notes: `Акт утилизации/брака №${actNumber} (${reason}). ${notes ?? ""}`.trim(),
	});

	return { success: true, writtenOffQty: quantity };
}
