/**
 * @file batchSelector.ts
 * Строгая сортировка партий First-Expired-First-Out, селекторы остатков и активных серий в СУБД.
 */

import { and, asc, eq, gt, sql } from "drizzle-orm";
import { stockBatches } from "../../../db/schema/inventory.js";
import type { DbTransaction } from "./types.js";

/**
 * Чистая утилита сортировки партий по сроку годности (FEFO: ранний срок первым).
 * При совпадении срока годности (tie-breaker) используется дата поступления/создания (FIFO).
 * Партии без срока годности отправляются в конец списка.
 */
export function sortBatchesByFefo<
	T extends {
		expirationDate?: string | null;
		createdAt?: string | Date | null;
		receivedAt?: string | Date | null;
	},
>(batches: T[]): T[] {
	return [...batches].sort((a, b) => {
		if (!a.expirationDate && !b.expirationDate) {
			const aTime = a.receivedAt
				? new Date(a.receivedAt).getTime()
				: a.createdAt
					? new Date(a.createdAt).getTime()
					: 0;
			const bTime = b.receivedAt
				? new Date(b.receivedAt).getTime()
				: b.createdAt
					? new Date(b.createdAt).getTime()
					: 0;
			return aTime - bTime;
		}
		if (!a.expirationDate) return 1;
		if (!b.expirationDate) return -1;
		const expDiff =
			new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
		if (expDiff !== 0) return expDiff;

		// Tie-breaker: раннее поступление/создание списывается первым
		const aTime = a.receivedAt
			? new Date(a.receivedAt).getTime()
			: a.createdAt
				? new Date(a.createdAt).getTime()
				: 0;
		const bTime = b.receivedAt
			? new Date(b.receivedAt).getTime()
			: b.createdAt
				? new Date(b.createdAt).getTime()
				: 0;
		return aTime - bTime;
	});
}

/**
 * Получение активных партий данного материала, отсортированных по сроку годности (FEFO) с блокировкой FOR UPDATE.
 */
export async function selectActiveBatchesForFefo(
	tx: DbTransaction,
	params: {
		organizationId: string;
		inventoryItemId: string;
		warehouseId?: string | null | undefined;
	},
): Promise<Array<typeof stockBatches.$inferSelect>> {
	const batchConditions = [
		eq(stockBatches.organizationId, params.organizationId),
		eq(stockBatches.inventoryItemId, params.inventoryItemId),
		eq(stockBatches.status, "active"),
	];

	if (params.warehouseId) {
		batchConditions.push(eq(stockBatches.warehouseId, params.warehouseId));
	}

	return tx
		.select()
		.from(stockBatches)
		.where(and(...batchConditions))
		.orderBy(asc(stockBatches.expirationDate), asc(stockBatches.createdAt))
		.for("update");
}

/**
 * Поиск следующей активной партии с ненулевым остатком для обновления метаданных в карточке номенклатуры.
 */
export async function findNextActiveBatchInfo(
	tx: DbTransaction,
	organizationId: string,
	inventoryItemId: string,
): Promise<{ expirationDate: string | null; batchNumber: string } | null> {
	const [nextActiveBatch] = await tx
		.select({
			expirationDate: stockBatches.expirationDate,
			batchNumber: stockBatches.batchNumber,
		})
		.from(stockBatches)
		.where(
			and(
				eq(stockBatches.organizationId, organizationId),
				eq(stockBatches.inventoryItemId, inventoryItemId),
				eq(stockBatches.status, "active"),
				gt(sql`CAST(${stockBatches.remainingQty} AS numeric)`, 0),
			),
		)
		.orderBy(asc(stockBatches.expirationDate), asc(stockBatches.createdAt))
		.limit(1);

	return nextActiveBatch ?? null;
}
