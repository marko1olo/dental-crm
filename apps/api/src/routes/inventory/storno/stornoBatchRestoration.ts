/**
 * stornoBatchRestoration.ts — Deadlock-free locking and FEFO batch restoration
 * for storno operations (Mandates 8b, 8e, 8n, 8v).
 */

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { kopecksToNumericString, resolveCostKopecks, toExactKopecks } from "@dental/shared";
import type { TenantDb } from "../../../db/rls.js";
import {
	inventoryItems,
	inventoryTransactions,
	stockBatches,
} from "../../../db/schema.js";
import { getDefaultExpirationDate } from "../../../services/inventory/fefoStockService.js";
import {
	buildStornoJournalNote,
	type StornoMaterialTarget,
} from "./stornoAuditAndJournal.js";

export interface RestoredStornoItem {
	inventoryItemId: string;
	name: string;
	quantityRestored: number;
	previousStock: number;
	newStock: number;
	overdraftCleared: boolean;
}

interface PreferredBatchAllocation {
	batchId: string;
	qty: number;
}

export const STORNO_DEDUCTION_TX_TYPES = [
	"auto_deduct",
	"emergency_overdraft",
	"treatment_consumable",
	"usage",
	"write_off",
	"manual_writeoff",
	"shift_batch_deduction",
];

export async function findOrCreateStornoTargetItem(
	tx: TenantDb,
	organizationId: string,
	m: StornoMaterialTarget,
	prelockedMap: Map<string, typeof inventoryItems.$inferSelect>,
): Promise<typeof inventoryItems.$inferSelect | undefined> {
	let targetItem = m.inventoryItemId ? prelockedMap.get(m.inventoryItemId) : undefined;

	if (!targetItem && m.inventoryItemId) {
		const [found] = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, m.inventoryItemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.for("update");
		targetItem = found;
		if (targetItem) prelockedMap.set(targetItem.id, targetItem);
	}

	if (!targetItem && m.name?.trim()) {
		const searchName = m.name.trim();
		const [foundByName] = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.organizationId, organizationId),
					sql`lower(${inventoryItems.name}) = lower(${searchName})`,
				),
			)
			.limit(1)
			.for("update");
		targetItem = foundByName;

		if (!targetItem) {
			const [partial] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, organizationId),
						sql`lower(${inventoryItems.name}) LIKE lower(${`%${searchName}%`}) OR lower(${searchName}) LIKE ('%' || lower(${inventoryItems.name}) || '%')`,
					),
				)
				.limit(1)
				.for("update");
			targetItem = partial;
		}
	}

	if (!targetItem) {
		const [created] = await tx
			.insert(inventoryItems)
			.values({
				organizationId,
				name: m.name?.trim() || "Сторнированный материал",
				stockQuantity: "0",
				currentQty: "0",
				criticalThreshold: "0",
				unitCostRub: "0",
				unitCostKopecks: 0n,
				pricePerUnitKopecks: 0n,
			})
			.returning();
		targetItem = created;
		if (targetItem) prelockedMap.set(targetItem.id, targetItem);
	}

	return targetItem;
}

export async function restoreStockAndBatchesForMaterial(
	tx: TenantDb,
	params: {
		organizationId: string;
		targetItem: typeof inventoryItems.$inferSelect;
		material: StornoMaterialTarget;
		safeVisitId: string | null;
		effectiveUserId: string | null;
		reason?: string | undefined;
		notes?: string | undefined;
		idempotencyKey?: string | undefined;
		preferredBatchesByItem: Map<string, Map<string, number>>;
		prelockedMap: Map<string, typeof inventoryItems.$inferSelect>;
	},
): Promise<RestoredStornoItem> {
	const {
		organizationId,
		targetItem: initialTarget,
		material: m,
		safeVisitId,
		effectiveUserId,
		reason,
		notes,
		idempotencyKey,
		preferredBatchesByItem,
		prelockedMap,
	} = params;

	const prevStock = Number(initialTarget.stockQuantity ?? initialTarget.currentQty ?? 0);
	const newStock = Number((prevStock + m.quantity).toFixed(4));
	const wasOverdraft = prevStock < 0;
	const overdraftCleared = wasOverdraft && newStock >= 0;

	await tx
		.update(inventoryItems)
		.set({
			stockQuantity: String(newStock),
			currentQty: String(newStock),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(inventoryItems.id, initialTarget.id),
				eq(inventoryItems.organizationId, organizationId),
			),
		);

	const targetItem = {
		...initialTarget,
		stockQuantity: String(newStock),
		currentQty: String(newStock),
	};
	prelockedMap.set(targetItem.id, targetItem);

	const itemUnitCostKopecks = resolveCostKopecks(
		targetItem.unitCostKopecks,
		targetItem.unitCostRub,
		targetItem.pricePerUnitKopecks,
		targetItem.pricePerUnit,
	);
	const resolvedUnitCostRub =
		itemUnitCostKopecks > 0n
			? kopecksToNumericString(toExactKopecks(itemUnitCostKopecks))
			: targetItem.unitCostRub ?? targetItem.pricePerUnit ?? "0";

	let remainingToRestore = Number(m.quantity);
	const restoredBatchAllocations: PreferredBatchAllocation[] = [];
	const itemPreferredBatches = preferredBatchesByItem.get(targetItem.id);

	if (itemPreferredBatches && itemPreferredBatches.size > 0) {
		const preferredIds = Array.from(itemPreferredBatches.keys()).sort();
		const originalBatches = await tx
			.select()
			.from(stockBatches)
			.where(
				and(
					eq(stockBatches.organizationId, organizationId),
					eq(stockBatches.inventoryItemId, targetItem.id),
					inArray(stockBatches.id, preferredIds),
				),
			)
			.orderBy(asc(stockBatches.id))
			.for("update");

		for (const origBatch of originalBatches) {
			if (remainingToRestore <= 0) break;
			const maxForBatch = itemPreferredBatches.get(origBatch.id) ?? 0;
			if (maxForBatch <= 0) continue;
			const takeRestore = Math.min(remainingToRestore, maxForBatch);
			if (takeRestore <= 0) continue;
			const currentBatchRemaining = Number(origBatch.remainingQty ?? 0);
			const newBatchRemaining = Number((currentBatchRemaining + takeRestore).toFixed(3));
			await tx
				.update(stockBatches)
				.set({
					remainingQty: String(newBatchRemaining),
					status: newBatchRemaining > 0 ? "active" : origBatch.status,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(stockBatches.id, origBatch.id),
						eq(stockBatches.organizationId, organizationId),
					),
				);
			restoredBatchAllocations.push({ batchId: origBatch.id, qty: takeRestore });
			const leftOnBatch = Number((maxForBatch - takeRestore).toFixed(4));
			if (leftOnBatch > 0) itemPreferredBatches.set(origBatch.id, leftOnBatch);
			else itemPreferredBatches.delete(origBatch.id);
			remainingToRestore = Number((remainingToRestore - takeRestore).toFixed(4));
		}
	}

	if (remainingToRestore > 0) {
		const [existingBatch] = await tx
			.select()
			.from(stockBatches)
			.where(
				and(
					eq(stockBatches.organizationId, organizationId),
					eq(stockBatches.inventoryItemId, targetItem.id),
				),
			)
			.orderBy(desc(stockBatches.updatedAt))
			.limit(1)
			.for("update");

		if (existingBatch) {
			const currentBatchRemaining = Number(existingBatch.remainingQty ?? 0);
			const newBatchRemaining = Number((currentBatchRemaining + remainingToRestore).toFixed(3));
			await tx
				.update(stockBatches)
				.set({
					remainingQty: String(newBatchRemaining),
					status: newBatchRemaining > 0 ? "active" : existingBatch.status,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(stockBatches.id, existingBatch.id),
						eq(stockBatches.organizationId, organizationId),
					),
				);
			restoredBatchAllocations.push({ batchId: existingBatch.id, qty: remainingToRestore });
		} else {
			const defaultExpDate = targetItem.expirationDate || getDefaultExpirationDate();
			const [createdBatch] = await tx
				.insert(stockBatches)
				.values({
					organizationId,
					inventoryItemId: targetItem.id,
					batchNumber: `STORNO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
					expirationDate: defaultExpDate,
					initialQty: String(remainingToRestore),
					remainingQty: String(remainingToRestore),
					purchasePricePerUnit: resolvedUnitCostRub,
					purchasePricePerUnitKopecks: itemUnitCostKopecks,
					status: "active",
				})
				.returning();
			if (createdBatch?.id) {
				restoredBatchAllocations.push({ batchId: createdBatch.id, qty: remainingToRestore });
			}
		}
	}

	const allocations =
		restoredBatchAllocations.length > 0
			? restoredBatchAllocations
			: [{ batchId: null as unknown as string, qty: m.quantity }];

	const baseNote = buildStornoJournalNote({
		customNote: notes,
		reason,
		serviceTitle: m.serviceTitle,
		quantity: m.quantity,
		unitName: targetItem.unit ?? undefined,
	});

	for (const alloc of allocations) {
		await tx.insert(inventoryTransactions).values({
			organizationId,
			itemId: targetItem.id,
			inventoryItemId: targetItem.id,
			batchId: alloc.batchId || null,
			visitId: safeVisitId ?? null,
			quantityChanged: String(alloc.qty),
			qty: String(alloc.qty),
			unitCostRub: resolvedUnitCostRub,
			unitCostKopecks: itemUnitCostKopecks,
			transactionType: "storno",
			isOverdraft: false,
			metadata: idempotencyKey ? { stornoIdempotencyKey: idempotencyKey } : null,
			notes: baseNote,
			userId: effectiveUserId,
		});
	}

	return {
		inventoryItemId: targetItem.id,
		name: targetItem.name,
		quantityRestored: m.quantity,
		previousStock: prevStock,
		newStock,
		overdraftCleared,
	};
}
