/**
 * @file softOverdraftHandler.ts
 * Закон Soft Negative Stock (Мандаты 8e, 8n): мягкий овердрафт при нехватке остатка
 * и фоновое автосоздание позиций без блокировки клинического процесса врача.
 */

import { and, eq } from "drizzle-orm";
import { inventoryItems } from "../../../db/schema/inventory.js";
import type { DbTransaction } from "./types.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Обеспечивает наличие карточки номенклатуры при мягком списании (Мандат 8n).
 */
export async function ensureInventoryItemForDeduction(
	tx: DbTransaction,
	organizationId: string,
	inventoryItemId: string,
	allowOverdraft = true,
): Promise<typeof inventoryItems.$inferSelect> {
	let [inv] = await tx
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
		if (allowOverdraft) {
			const isUuid = UUID_REGEX.test(inventoryItemId);
			const [created] = await tx
				.insert(inventoryItems)
				.values({
					...(isUuid ? { id: inventoryItemId } : {}),
					organizationId,
					name: `Материал ${inventoryItemId}`,
					stockQuantity: "0",
					currentQty: "0",
					criticalThreshold: "0",
					unitCostRub: "0",
				})
				.returning();
			inv = created;
		} else {
			throw new Error(`Материал с ID ${inventoryItemId} не найден на складе клиники.`);
		}
	}

	if (!inv) {
		throw new Error(`Материал с ID ${inventoryItemId} не найден на складе клиники.`);
	}

	return inv;
}

/**
 * Рассчитывает закрытие накопленного технического дефицита при поступлении новой партии.
 */
export function resolveDeficitOnReceipt(currentStockQuantity: number, receivedQuantity: number) {
	const deficit = currentStockQuantity < 0 ? Math.abs(currentStockQuantity) : 0;
	const remainingInBatch = Math.max(0, Number((receivedQuantity - deficit).toFixed(3)));
	const isDepletedByDeficit = remainingInBatch <= 0;

	return {
		deficit,
		remainingInBatch,
		isDepletedByDeficit,
		newStock: Number((currentStockQuantity + receivedQuantity).toFixed(3)),
	};
}
