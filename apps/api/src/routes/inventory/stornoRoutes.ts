import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { DEFAULT_804N_CONSUMABLE_LINKS } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	inventoryOverdraftAlertBodySchema,
	inventoryStornoBodySchema,
	toValidUuid,
} from "./types.js";

export const stornoRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// ─────────────────────────────────────────────────────────────────────────
	// POST /:organizationId/overdraft-alert — Асинхронное оповещение об овердрафте при приеме (Мандат 8n)
	// ─────────────────────────────────────────────────────────────────────────
	const handleOverdraftAlertRequest = async (
		organizationId: string,
		rawBody: unknown,
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const parsed = inventoryOverdraftAlertBodySchema.safeParse(rawBody ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректный формат оповещения об овердрафте",
				details: parsed.error.errors,
			});
		}

		const data = parsed.data;
		const safeVisitId = toValidUuid(data.visitId);
		const identity = getRequestIdentity(request);
		const userContext = request.user;
		const effectiveUserId = toValidUuid(identity.userId ?? userContext?.id ?? null);

		try {
			let recordedCount = 0;
			if (data.items && data.items.length > 0) {
				await db.transaction(async (tx) => {
					for (const it of data.items) {
						const rawItemId = it.itemId || it.inventoryItemId;
						const validItemId = toValidUuid(rawItemId);
						const deficit = it.deficitQty ?? it.quantity ?? 1;

						await tx.insert(inventoryTransactions).values({
							organizationId,
							itemId: validItemId,
							inventoryItemId: validItemId,
							visitId: safeVisitId,
							transactionType: "emergency_overdraft",
							quantityChanged: `-${deficit}`,
							qty: `-${deficit}`,
							isOverdraft: true,
							notes: `[Дефицит/Овердрафт] ${it.itemName ? `Материал: ${it.itemName}. ` : ""}${data.cabinetId ? `Кабинет: ${data.cabinetId}. ` : ""}${data.chairId ? `Кресло: ${data.chairId}. ` : ""}${data.message ?? ""}`.trim(),
							userId: effectiveUserId,
						});
						recordedCount++;
					}
				});
			}

			return reply.status(200).send({
				success: true,
				status: "recorded",
				recordedCount,
				isOverdraft: true,
				message: `Зафиксирован мягкий овердрафт: ${recordedCount} поз. (клинический прием не прерывается)`,
			});
		} catch (error) {
			request.log.error(error, "Failed to record inventory overdraft alert");
			return reply.status(500).send({
				error: "OverdraftAlertFailed",
				message: "Ошибка фиксации овердрафта в журнале склада",
			});
		}
	};

	server.post<{ Params: { organizationId: string } }>(
		"/:organizationId/overdraft-alert",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"inventory overdraft alert",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			return handleOverdraftAlertRequest(organizationId, request.body, request, reply);
		},
	);

	server.post("/overdraft-alert", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory overdraft alert",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleOverdraftAlertRequest(targetOrgId, request.body, request, reply);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// POST /:organizationId/storno — Автоматическое сторно при отмене услуг (Мандаты 8e, 8n)
	// ─────────────────────────────────────────────────────────────────────────
	const handleStornoRequest = async (
		organizationId: string,
		rawBody: unknown,
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
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
				const materialsToRestore: Array<{
					inventoryItemId?: string | undefined;
					name?: string | undefined;
					quantity: number;
					serviceTitle?: string | undefined;
				}> = [];

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

				// 2. Services passed (single or array)
				const servicesList = data.services ?? (data.service ? [data.service] : []);
				for (const srv of servicesList) {
					const srvQty = srv.quantity ?? 1;
					const srvCode = (srv.code804n || srv.serviceCode || "").trim().toUpperCase();
					const srvTitle = srv.title || srvCode || "Стоматологическая услуга";

					// 2a. Ищем правила в БД (procedureMaterialRules)
					let dbRules: Array<{
						inventoryItemId: string | null;
						materialItemId: string | null;
						quantityToDeduct: string | null;
						requiredQty: string | null;
						materialName: string | null;
					}> = [];

					if (srv.serviceId || srvCode) {
						const conditions = [
							eq(procedureMaterialRules.organizationId, organizationId),
						];
						if (srv.serviceId && srvCode) {
							conditions.push(
								or(
									eq(procedureMaterialRules.serviceId, srv.serviceId),
									eq(procedureMaterialRules.serviceCode, srvCode),
								)!,
							);
						} else if (srv.serviceId) {
							conditions.push(eq(procedureMaterialRules.serviceId, srv.serviceId));
						} else {
							conditions.push(eq(procedureMaterialRules.serviceCode, srvCode));
						}
						dbRules = await tx
							.select({
								inventoryItemId: procedureMaterialRules.inventoryItemId,
								materialItemId: procedureMaterialRules.materialItemId,
								quantityToDeduct: procedureMaterialRules.quantityToDeduct,
								requiredQty: procedureMaterialRules.requiredQty,
								materialName: procedureMaterialRules.materialName,
							})
							.from(procedureMaterialRules)
							.where(and(...conditions));
					}

					if (dbRules.length > 0) {
						for (const r of dbRules) {
							const itemId = r.inventoryItemId || r.materialItemId;
							const unitQty = Number(r.quantityToDeduct ?? r.requiredQty ?? 1);
							materialsToRestore.push({
								inventoryItemId: itemId ?? undefined,
								name: r.materialName ?? undefined,
								quantity: Number((unitQty * srvQty).toFixed(4)),
								serviceTitle: srvTitle,
							});
						}
					} else {
						// 2b. Статутные техкарты 804н (DEFAULT_804N_CONSUMABLE_LINKS & fallback)
						const matchedLinks = DEFAULT_804N_CONSUMABLE_LINKS.filter(
							(l) =>
								l.service804nCode.toUpperCase() === srvCode ||
								srvCode.startsWith(l.service804nCode.toUpperCase()),
						);

						if (matchedLinks.length > 0) {
							for (const link of matchedLinks) {
								materialsToRestore.push({
									name: link.itemName,
									quantity: Number((link.quantityPerService * srvQty).toFixed(4)),
									serviceTitle: srvTitle,
								});
							}
						} else {
							// 2c. Fallback по ключевым клиническим словам
							const normName = srvTitle.toLowerCase();
							if (
								normName.includes("анестез") ||
								srvCode.includes("004") ||
								srvCode.includes("012")
							) {
								materialsToRestore.push(
									{
										name: "Анестетик артикаиновый 4% Ультракаин Д-С 1.7 мл",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
									{
										name: "Игла карпульная стоматологическая 30G",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
								);
							} else if (
								normName.includes("кариес") ||
								normName.includes("пломб") ||
								srvCode.includes("002")
							) {
								materialsToRestore.push(
									{
										name: "Композит светоотверждаемый Filtek / Estelite",
										quantity: Number((0.4 * srvQty).toFixed(2)),
										serviceTitle: srvTitle,
									},
									{
										name: "Анестетик артикаиновый 4% Ультракаин Д-С 1.7 мл",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
									{
										name: "Полировочная головка Enhance",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
								);
							} else if (normName.includes("гигиен") || srvCode.includes("051")) {
								materialsToRestore.push(
									{
										name: "Порошок для Air-Flow",
										quantity: 25 * srvQty,
										serviceTitle: srvTitle,
									},
									{
										name: "Паста полировочная Cleanic",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
								);
							} else if (
								normName.includes("удален") ||
								normName.includes("экстракц") ||
								srvCode.includes("001")
							) {
								materialsToRestore.push(
									{
										name: "Анестетик артикаиновый 4% Ультракаин Д-С 1.7 мл",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
									{
										name: "Игла карпульная стоматологическая",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
									{
										name: "Гемостатическая губка Альвостаз",
										quantity: 1 * srvQty,
										serviceTitle: srvTitle,
									},
								);
							} else if (
								normName.includes("визиограф") ||
								normName.includes("снимок") ||
								srvCode.includes("003")
							) {
								materialsToRestore.push({
									name: "Чехол защитный для датчика визиографа",
									quantity: 1 * srvQty,
									serviceTitle: srvTitle,
								});
							} else {
								materialsToRestore.push({
									name: "Стандартный набор расходников приёма",
									quantity: 1 * srvQty,
									serviceTitle: srvTitle,
								});
							}
						}
					}
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
				const restoredItems: Array<{
					inventoryItemId: string;
					name: string;
					quantityRestored: number;
					previousStock: number;
					newStock: number;
					overdraftCleared: boolean;
				}> = [];

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
						notes:
							data.notes ||
							data.reason ||
							`Списание материалов по услуге отменено: автоматическое сторно при отмене услуги «${m.serviceTitle || "услуга"}» (+${m.quantity} ${targetItem.unit ?? "ед."})`,
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
						? `Сторно выполнено: ${stornoResult.length} позиций материалов возвращены на склад`
						: "Нет материалов для сторнирования",
			});
		} catch (error) {
			request.log.error(error, "Failed to execute inventory storno");
			const msg =
				error instanceof Error ? error.message : "Не удалось провести сторно материалов";
			return reply.status(400).send({
				error: "StornoFailed",
				message: msg,
			});
		}
	};

	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/storno", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(organizationId, request.body, request, reply);
	});

	server.post("/storno", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(targetOrgId, request.body, request, reply);
	});

	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/storno/service", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno service",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(organizationId, request.body, request, reply);
	});

	server.post("/storno/service", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno service",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(targetOrgId, request.body, request, reply);
	});

	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/storno/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno visit",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(organizationId, request.body, request, reply);
	});

	server.post("/storno/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory storno visit",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleStornoRequest(targetOrgId, request.body, request, reply);
	});
};
