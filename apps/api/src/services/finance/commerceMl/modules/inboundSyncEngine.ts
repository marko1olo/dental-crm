import { and, eq, sql } from "drizzle-orm";
import { computeCommerceMlSha256, kopecksToNumericString, rublesToKopecks } from "@dental/shared";
import { createApiLogger, safeLogError } from "../../../../observability/logger.js";
import { withTenantCtx } from "../../../../db/rls.js";
import { auditEvents, inventoryItems, inventoryTransactions, payments, users } from "../../../../db/schema.js";
import { oneCSyncPayloadSchema, type OneCSyncPayload, type OneCSyncResult } from "../types.js";
import { isSyncHashProcessedTx, markSyncHashProcessedTx } from "./reconciliationStore.js";

const logger = createApiLogger("commerceMlSyncEngine");

export async function syncFrom1C(payload: OneCSyncPayload, actorUserId?: string): Promise<OneCSyncResult> {
	const parsed = oneCSyncPayloadSchema.parse(payload);
	const orgId = parsed.organizationId;
	const computedHash = computeCommerceMlSha256(parsed);
	const hash = parsed.sha256Hash || computedHash;

	let updatedStockCount = 0;
	let reconciledPaymentsCount = 0;
	let alreadyProcessed = false;

	try {
		await withTenantCtx(orgId, async (tx) => {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId}), hashtext(${hash}))`,
			);

			alreadyProcessed = await isSyncHashProcessedTx(tx, orgId, hash);
			if (alreadyProcessed) {
				return;
			}

			let resolvedActorUserId: string | null = null;
			if (actorUserId) {
				const [actorRow] = await tx
					.select({ id: users.id })
					.from(users)
					.where(and(eq(users.id, actorUserId), eq(users.organizationId, orgId)))
					.limit(1);
				resolvedActorUserId = actorRow?.id ?? null;
			}

			for (const stock of parsed.inventoryStockUpdates) {
				let targetItem: typeof inventoryItems.$inferSelect | undefined;
				if (stock.itemId) {
					[targetItem] = await tx
						.select()
						.from(inventoryItems)
						.where(and(eq(inventoryItems.id, stock.itemId), eq(inventoryItems.organizationId, orgId)))
						.limit(1);
				} else if (stock.sku) {
					[targetItem] = await tx
						.select()
						.from(inventoryItems)
						.where(and(eq(inventoryItems.sku, stock.sku), eq(inventoryItems.organizationId, orgId)))
						.limit(1);
				}

				if (targetItem) {
					const oldQty = Number(targetItem.currentQty) || 0;
					const newQty = stock.updatedQty;
					const diff = newQty - oldQty;
					const nextCostKop =
						stock.unitCostKopecks !== undefined
							? BigInt(stock.unitCostKopecks)
							: stock.unitCostRub !== undefined
								? BigInt(rublesToKopecks(stock.unitCostRub))
								: targetItem.unitCostKopecks ?? null;
					const nextCostRub =
						stock.unitCostKopecks !== undefined
							? kopecksToNumericString(BigInt(stock.unitCostKopecks))
							: stock.unitCostRub !== undefined
								? String(stock.unitCostRub)
								: targetItem.unitCostRub;

					await tx
						.update(inventoryItems)
						.set({
							currentQty: String(newQty),
							stockQuantity: String(newQty),
							unitCostRub: nextCostRub,
							unitCostKopecks: nextCostKop,
							lotNumber: stock.lotNumber || targetItem.lotNumber,
							expirationDate: stock.expirationDate || targetItem.expirationDate,
							updatedAt: new Date(),
						})
						.where(and(eq(inventoryItems.id, targetItem.id), eq(inventoryItems.organizationId, orgId)));

					await tx.insert(inventoryTransactions).values({
						organizationId: orgId,
						itemId: targetItem.id,
						inventoryItemId: targetItem.id,
						transactionType: diff >= 0 ? "receipt_1c" : "writeoff_1c",
						qty: String(Math.abs(diff)),
						quantityChanged: String(diff),
						unitCostRub: nextCostRub,
						unitCostKopecks: nextCostKop,
						userId: resolvedActorUserId,
						notes: `Синхронизация остатков из 1С:Предприятие (Транзакция ${parsed.syncTransactionId})`,
					});
					updatedStockCount++;
				}
			}

			for (const rec of parsed.reconciledPayments) {
				const [p] = await tx
					.select()
					.from(payments)
					.where(and(eq(payments.id, rec.paymentId), eq(payments.organizationId, orgId)))
					.limit(1);
				if (p) {
					await tx
						.update(payments)
						.set({
							fiscalReceiptNumber: rec.fiscalReceiptNumber || p.fiscalReceiptNumber,
							note: rec.reconciliationNote
								? `${p.note || ""} [1C Сверка: ${rec.reconciliationNote}]`.trim()
								: p.note,
							updatedAt: new Date(),
						})
						.where(and(eq(payments.id, p.id), eq(payments.organizationId, orgId)));
					reconciledPaymentsCount++;
				}
			}

			await tx.insert(auditEvents).values({
				organizationId: orgId,
				actorUserId: resolvedActorUserId,
				entityType: "1c_commerceml_sync",
				entityId: parsed.syncTransactionId,
				action: "sync_applied",
				reason: `1C CommerceML 2.09 Sync: ${updatedStockCount} stock updates, ${reconciledPaymentsCount} reconciled payments (SHA-256: ${hash.slice(0, 16)}...)`,
			});

			await markSyncHashProcessedTx(tx, orgId, hash, {
				syncTransactionId: parsed.syncTransactionId,
				status: "success",
				processedCount: parsed.postedDocumentConfirmations.length,
				updatedCount: updatedStockCount + reconciledPaymentsCount,
				summaryText: `1C Sync ${parsed.syncTransactionId}: stock=${updatedStockCount}, payments=${reconciledPaymentsCount}`,
				actorUserId: resolvedActorUserId ?? undefined,
			});
		});
	} catch (txError) {
		logger.error(
			{ err: safeLogError(txError), organizationId: orgId, syncTransactionId: parsed.syncTransactionId },
			"CommerceML 1C Sync Transaction failed",
		);
		throw txError;
	}

	if (alreadyProcessed) {
		return {
			success: true,
			processedDocumentsCount: parsed.postedDocumentConfirmations.length,
			updatedStockItemsCount: parsed.inventoryStockUpdates.length,
			reconciledPaymentsCount: parsed.reconciledPayments.length,
			syncTransactionHash: hash,
			timestamp: new Date().toISOString(),
		};
	}

	return {
		success: true,
		processedDocumentsCount: parsed.postedDocumentConfirmations.length,
		updatedStockItemsCount: updatedStockCount,
		reconciledPaymentsCount,
		syncTransactionHash: hash,
		timestamp: new Date().toISOString(),
	};
}
