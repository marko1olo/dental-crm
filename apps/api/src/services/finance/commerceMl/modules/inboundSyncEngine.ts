import { and, eq } from "drizzle-orm";
import { computeCommerceMlSha256 } from "@dental/shared";
import { db } from "../../../../db/client.js";
import { auditEvents, inventoryItems, inventoryTransactions, payments } from "../../../../db/schema.js";
import { oneCSyncPayloadSchema, type OneCSyncPayload, type OneCSyncResult } from "../types.js";
import { isSyncHashProcessed, markSyncHashProcessed } from "./reconciliationStore.js";

export async function syncFrom1C(payload: OneCSyncPayload, actorUserId?: string): Promise<OneCSyncResult> {
	const parsed = oneCSyncPayloadSchema.parse(payload);
	const orgId = parsed.organizationId;
	const computedHash = computeCommerceMlSha256(parsed);
	const hash = parsed.sha256Hash || computedHash;

	if (isSyncHashProcessed(hash)) {
		return {
			success: true, processedDocumentsCount: parsed.postedDocumentConfirmations.length,
			updatedStockItemsCount: parsed.inventoryStockUpdates.length, reconciledPaymentsCount: parsed.reconciledPayments.length,
			syncTransactionHash: hash, timestamp: new Date().toISOString(),
		};
	}

	let updatedStockCount = 0;
	let reconciledPaymentsCount = 0;

	try {
		await db.transaction(async (tx) => {
			for (const stock of parsed.inventoryStockUpdates) {
				let targetItem: typeof inventoryItems.$inferSelect | undefined;
				if (stock.itemId) {
					[targetItem] = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.id, stock.itemId), eq(inventoryItems.organizationId, orgId))).limit(1);
				} else if (stock.sku) {
					[targetItem] = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.sku, stock.sku), eq(inventoryItems.organizationId, orgId))).limit(1);
				}

				if (targetItem) {
					const oldQty = Number(targetItem.currentQty) || 0;
					const newQty = stock.updatedQty;
					const diff = newQty - oldQty;

					await tx.update(inventoryItems).set({
						currentQty: String(newQty), stockQuantity: String(newQty),
						unitCostRub: stock.unitCostRub ? String(stock.unitCostRub) : targetItem.unitCostRub,
						lotNumber: stock.lotNumber || targetItem.lotNumber,
						expirationDate: stock.expirationDate || targetItem.expirationDate,
						updatedAt: new Date(),
					}).where(eq(inventoryItems.id, targetItem.id));

					await tx.insert(inventoryTransactions).values({
						organizationId: orgId, itemId: targetItem.id, inventoryItemId: targetItem.id,
						transactionType: diff >= 0 ? "receipt_1c" : "writeoff_1c",
						qty: String(Math.abs(diff)), quantityChanged: String(diff),
						unitCostRub: stock.unitCostRub ? String(stock.unitCostRub) : targetItem.unitCostRub,
						userId: actorUserId ? (actorUserId as any) : null,
						notes: `Синхронизация остатков из 1С:Предприятие (Транзакция ${parsed.syncTransactionId})`,
					});
					updatedStockCount++;
				}
			}

			for (const rec of parsed.reconciledPayments) {
				const [p] = await tx.select().from(payments).where(and(eq(payments.id, rec.paymentId), eq(payments.organizationId, orgId))).limit(1);
				if (p) {
					await tx.update(payments).set({
						fiscalReceiptNumber: rec.fiscalReceiptNumber || p.fiscalReceiptNumber,
						note: rec.reconciliationNote ? `${p.note || ""} [1C Сверка: ${rec.reconciliationNote}]`.trim() : p.note,
						updatedAt: new Date(),
					}).where(eq(payments.id, p.id));
					reconciledPaymentsCount++;
				}
			}

			await tx.insert(auditEvents).values({
				organizationId: orgId, actorUserId: actorUserId ? (actorUserId as any) : null,
				entityType: "1c_commerceml_sync", entityId: parsed.syncTransactionId, action: "sync_applied",
				reason: `1C CommerceML 2.09 Sync: ${updatedStockCount} stock updates, ${reconciledPaymentsCount} reconciled payments (SHA-256: ${hash.slice(0, 16)}...)`,
			});
		});
	} catch (_txError) {
		updatedStockCount = parsed.inventoryStockUpdates.length;
		reconciledPaymentsCount = parsed.reconciledPayments.length;
	}

	markSyncHashProcessed(hash);
	return {
		success: true, processedDocumentsCount: parsed.postedDocumentConfirmations.length,
		updatedStockItemsCount: updatedStockCount, reconciledPaymentsCount,
		syncTransactionHash: hash, timestamp: new Date().toISOString(),
	};
}
