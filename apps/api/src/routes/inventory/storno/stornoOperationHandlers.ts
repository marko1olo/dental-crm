/**
 * stornoOperationHandlers.ts — Безопасный возврат и аннулирование складских проводок (Мандаты 8e, 8n).
 * Автоматический возврат ТМЦ на склад при удалении услуг из визита.
 */

import { and, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
} from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import {
	inventoryStornoBodySchema,
	toValidUuid,
} from "../types.js";
import {
	buildStornoJournalNote,
	resolveServiceStornoMaterials,
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

/**
 * Обработчик запроса на сторнирование списанных материалов (Мандаты 8e, 8n).
 */
export async function handleStornoRequest(
	organizationId: string,
	rawBody: unknown,
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const parsed = inventoryStornoBodySchema.safeParse(rawBody ?? {});
	if (!parsed.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: parsed.error.errors[0]?.message ?? "Неверные параметры запроса сторно",
			details: parsed.error.errors,
		});
	}

	const data = parsed.data;
	const safeVisitId = toValidUuid(data.visitId);
	const identity = getRequestIdentity(request);
	const userContext = request.user;
	const effectiveUserId = identity.userId ?? userContext?.id ?? null;

	try {
		const stornoResult = await db.transaction(async (tx) => {
			const materialsToRestore: StornoMaterialTarget[] = [];

			// 1. Direct items / materials passed
			const directItems = data.items ?? data.materials ?? [];
			for (const it of directItems) {
				materialsToRestore.push({
					inventoryItemId: it.inventoryItemId || it.id,
					name: it.name,
					quantity: it.quantity,
					serviceTitle: "Ручное сторно",
				});
			}

			// 2. Services passed (single or array) — резолв по BOM техкартам
			const servicesList = data.services ?? (data.service ? [data.service] : []);
			for (const srv of servicesList) {
				const resolved = await resolveServiceStornoMaterials(srv, organizationId, tx);
				materialsToRestore.push(...resolved);
			}

			// 3. Отмена всего визита по visitId (если не были переданы конкретные услуги/позиции)
			if (materialsToRestore.length === 0 && safeVisitId) {
				const visitTxs = await tx
					.select()
					.from(inventoryTransactions)
					.where(
						and(
							eq(inventoryTransactions.organizationId, organizationId),
							eq(inventoryTransactions.visitId, safeVisitId),
						),
					);

				// Находим списания, по которым еще не было сделано сторно
				const deductedByItem = new Map<string, number>();
				for (const t of visitTxs) {
					const itId = t.itemId ?? t.inventoryItemId;
					if (!itId) continue;
					const change = Number(t.quantityChanged ?? t.qty ?? 0);
					if (t.transactionType === "storno") {
						const curr = deductedByItem.get(itId) ?? 0;
						deductedByItem.set(itId, curr - Math.abs(change));
					} else if (
						change < 0 ||
						[
							"auto_deduct",
							"emergency_overdraft",
							"treatment_consumable",
						].includes(t.transactionType)
					) {
						const curr = deductedByItem.get(itId) ?? 0;
						deductedByItem.set(itId, curr + Math.abs(change));
					}
				}

				for (const [itId, netDeducted] of deductedByItem.entries()) {
					if (netDeducted > 0) {
						materialsToRestore.push({
							inventoryItemId: itId,
							quantity: netDeducted,
							serviceTitle: `Отмена визита ${data.visitId}`,
						});
					}
				}
			}

			// 4. Физическое возвращение материалов на склад (сторно)
			const restoredItems: RestoredStornoItem[] = [];

			for (const m of materialsToRestore) {
				if (!m.quantity || m.quantity <= 0) continue;

				let targetItem: typeof inventoryItems.$inferSelect | undefined;

				if (m.inventoryItemId) {
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
									sql`lower(${inventoryItems.name}) LIKE lower(${'%' + searchName + '%'}) OR lower(${searchName}) LIKE ('%' || lower(${inventoryItems.name}) || '%')`,
								),
							)
							.limit(1)
							.for("update");
						targetItem = partial;
					}
				}

				if (!targetItem) {
					// Если карточки нет, создаем ее со сторно-остатком
					const [created] = await tx
						.insert(inventoryItems)
						.values({
							organizationId,
							name: m.name?.trim() || "Сторнированный материал",
							stockQuantity: String(m.quantity),
							currentQty: String(m.quantity),
							criticalThreshold: "0",
							unitCostRub: "0",
						})
						.returning();
					targetItem = created;
				}

				if (!targetItem) continue;

				const prevStock = Number(targetItem.stockQuantity ?? targetItem.currentQty ?? 0);
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
							eq(inventoryItems.id, targetItem.id),
							eq(inventoryItems.organizationId, organizationId),
						),
					);

				// Фиксируем сторно в журнале движений (положительное количество, тип "storno")
				await tx.insert(inventoryTransactions).values({
					organizationId,
					itemId: targetItem.id,
					inventoryItemId: targetItem.id,
					visitId: safeVisitId ?? null,
					quantityChanged: String(m.quantity),
					qty: String(m.quantity),
					unitCostRub: targetItem.unitCostRub ?? targetItem.pricePerUnit ?? "0",
					transactionType: "storno",
					isOverdraft: false,
					notes: buildStornoJournalNote({
						customNote: data.notes,
						reason: data.reason,
						serviceTitle: m.serviceTitle,
						quantity: m.quantity,
						unitName: targetItem.unit ?? undefined,
					}),
					userId: effectiveUserId,
				});

				restoredItems.push({
					inventoryItemId: targetItem.id,
					name: targetItem.name,
					quantityRestored: m.quantity,
					previousStock: prevStock,
					newStock,
					overdraftCleared,
				});
			}

			return restoredItems;
		});

		return reply.status(200).send({
			success: true,
			stornoCount: stornoResult.length,
			restoredItems: stornoResult,
			message:
				stornoResult.length > 0
					? `Отмена ошибочного списания: ${stornoResult.length} позиций материалов возвращены на склад`
					: "Нет материалов для отмены списания",
		});
	} catch (error) {
		request.log.error(error, "Failed to execute inventory storno");
		const msg =
			error instanceof Error ? error.message : "Не удалось выполнить отмену ошибочного списания материалов";
		return reply.status(400).send({
			error: "StornoFailed",
			message: msg,
		});
	}
}
