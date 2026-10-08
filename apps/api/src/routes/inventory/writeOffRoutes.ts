import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { visitStockDeductionRequestSchema } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { inventoryItems } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { fefoStockService } from "../../services/inventory/fefoStockService.js";
import { InsufficientStockError } from "../../services/inventory/materialDeduction.js";
import { TreatmentConsumablesService } from "../../services/treatmentConsumablesService.js";
import {
	inventoryDeductBatchBodySchema,
	inventoryDeductItemSchema,
} from "./types.js";

export const writeOffRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// POST /:organizationId/quick-writeoff-standard-kit — 1-клик списание базового набора приёма
	// (перчатки 2 пары, маска 2 шт., слюноотсос 1 шт., нагрудник 1 шт., валики 6 шт.)
	// без поиска по 1000 позициям и без комиссии из 3 человек.
	server.post<{
		Params: { organizationId: string };
		Body?: { cabinetId?: string; visitId?: string; notes?: string };
	}>("/:organizationId/quick-writeoff-standard-kit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff standard kit",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const body = request.body ?? {};
		const userContext = request.user;

		const result = await db.transaction(async (tx) => {
			return TreatmentConsumablesService.quickWriteoffStandardKit(tx, {
				organizationId,
				userId: userContext?.id ?? null,
				visitId: body.visitId ?? null,
				notes: body.notes ?? null,
			});
		});

		return result;
	});

	// POST /:organizationId/quick-writeoff-carpules — 1-клик списание пустых карпул анестетиков
	// медсестрой (СанПиН 3.3686-21, отходы Класса Б) без требования комиссии из 3 человек.
	server.post<{
		Params: { organizationId: string };
		Body?: { carpulesCount?: number; drugName?: string; visitId?: string; notes?: string };
	}>("/:organizationId/quick-writeoff-carpules", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff carpules",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const body = request.body ?? {};
		const userContext = request.user;

		const result = await db.transaction(async (tx) => {
			return TreatmentConsumablesService.quickWriteoffCarpules(tx, {
				organizationId,
				carpulesCount: body.carpulesCount,
				drugName: body.drugName,
				userId: userContext?.id ?? null,
				visitId: body.visitId ?? null,
				notes: body.notes ?? null,
			});
		});

		return result;
	});

	// POST /:organizationId/quick-writeoff-shift-bundle — 1-клик пакетное списание смены
	// (комплект терапия / ортопедия / хирургия) без прокликивания 40 позиций.
	server.post<{
		Params: { organizationId: string };
		Body?: { bundleType?: "therapy" | "orthopedics" | "surgery"; visitId?: string; notes?: string };
	}>("/:organizationId/quick-writeoff-shift-bundle", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff shift bundle",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const body = request.body ?? {};
		const userContext = request.user;

		const result = await db.transaction(async (tx) => {
			return TreatmentConsumablesService.quickWriteoffShiftBundle(tx, {
				organizationId,
				bundleType: body.bundleType || "therapy",
				userId: userContext?.id ?? null,
				visitId: body.visitId ?? null,
				notes: body.notes ?? null,
			});
		});

		return result;
	});

	// POST /:organizationId/quick-writeoff-visit-bundle — 1-клик списание набора клинического приёма
	// (терапия: карпула + игла + перчатки + слюноотсос + валики + нагрудник;
	//  хирургия: карпула + игла + скальпель + шовный материал + гемостатическая губка)
	// без созыва комиссий и с поддержкой мягкого овердрафта (Мандат 8e п. 10).
	server.post<{
		Params: { organizationId: string };
		Body?: { visitType?: "therapy" | "surgery" | "implant" | "sinus_gbr"; visitId?: string; notes?: string };
	}>("/:organizationId/quick-writeoff-visit-bundle", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff visit bundle",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const body = request.body ?? {};
		const userContext = request.user;

		const result = await db.transaction(async (tx) => {
			return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
				organizationId,
				visitType: body.visitType || "therapy",
				userId: userContext?.id ?? null,
				visitId: body.visitId ?? null,
				notes: body.notes ?? null,
			});
		});

		return result;
	});

	// POST /:organizationId/quick-writeoff-package — 1-клик пакетное списание анестетиков и расходников
	// (Мандаты 8e п. 10, 8k, 8n: мягкий овердрафт склада без созыва комиссии из 3 человек).
	server.post<{
		Params: { organizationId: string };
		Body?: {
			packageId?: string;
			quantityMultiplier?: number;
			cabinetId?: string;
			doctorName?: string;
			nurseName?: string;
			patientName?: string;
			visitId?: string;
			notes?: string;
			allowOverdraft?: boolean;
			allowSoftOverdraft?: boolean;
		};
	}>("/:organizationId/quick-writeoff-package", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick writeoff package",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const body = request.body ?? {};
		const identity = getRequestIdentity(request);
		const userContext = request.user;
		const effectiveUserId = identity.userId ?? userContext?.id ?? null;
		const pkgId = body.packageId || "anesthesia";
		const multiplier = Math.max(1, body.quantityMultiplier ?? 1);

		const result = await db.transaction(async (tx) => {
			if (pkgId === "anesthesia") {
				return TreatmentConsumablesService.quickWriteoffCarpules(tx, {
					organizationId,
					carpulesCount: multiplier,
					userId: effectiveUserId,
					visitId: body.visitId ?? null,
					notes: body.notes ?? `Списание анестезии у кресла (пакет «Стандартная анестезия» x${multiplier})`,
				});
			}
			if (pkgId === "surgery") {
				return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
					organizationId,
					visitType: "surgery",
					userId: effectiveUserId,
					visitId: body.visitId ?? null,
					notes: body.notes ?? `Списание хирургического пакета у кресла x${multiplier}`,
				});
			}
			if (pkgId === "implant") {
				return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
					organizationId,
					visitType: "implant",
					userId: effectiveUserId,
					visitId: body.visitId ?? null,
					notes: body.notes ?? `Списание имплантологического пакета у кресла x${multiplier}`,
				});
			}
			if (pkgId === "sinus_gbr" || pkgId === "implant_gbr") {
				return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
					organizationId,
					visitType: "sinus_gbr",
					userId: effectiveUserId,
					visitId: body.visitId ?? null,
					notes: body.notes ?? `Списание пакета костной пластики / синус-лифтинга у кресла x${multiplier}`,
				});
			}
			return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
				organizationId,
				visitType: "therapy",
				userId: effectiveUserId,
				visitId: body.visitId ?? null,
				notes: body.notes ?? `Списание пакета приёма у кресла (${pkgId}) x${multiplier}`,
			});
		});

		return result;
	});

	// =========================================================================
	// LIVE STOCK DEDUCTION & FEFO CONSUMPTION (Мандаты 8e, 8k, 8s)
	// =========================================================================

	const handleDeductRequest = async (
		organizationId: string,
		rawBody: unknown,
		request: any,
		reply: any,
	) => {
		const parsed = inventoryDeductBatchBodySchema.safeParse(rawBody);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Неверный формат данных для списания материалов",
				details: parsed.error.errors,
			});
		}

		let itemsList: z.infer<typeof inventoryDeductItemSchema>[] = [];
		let commonReason: string | undefined;
		let visitId: string | undefined;
		let allowOverdraftDefault = true;

		if (Array.isArray(parsed.data)) {
			itemsList = parsed.data;
		} else if (
			("items" in parsed.data && Array.isArray(parsed.data.items)) ||
			("materials" in parsed.data && Array.isArray(parsed.data.materials))
		) {
			itemsList =
				parsed.data.materials && parsed.data.materials.length > 0
					? parsed.data.materials
					: (parsed.data.items ?? []);
			commonReason =
				parsed.data.reason ||
				parsed.data.notes ||
				(parsed.data.operationTitle
					? `Списание под операцию «${parsed.data.operationTitle}» (FEFO у кресла)`
					: undefined);
			visitId = parsed.data.visitId;
			if (parsed.data.allowOverdraft !== undefined) {
				allowOverdraftDefault = parsed.data.allowOverdraft;
			} else if (parsed.data.hasWarehouseDelay !== undefined) {
				allowOverdraftDefault = true;
			}
		} else {
			itemsList = [parsed.data as z.infer<typeof inventoryDeductItemSchema>];
		}

		if (itemsList.length === 0) {
			return reply.status(400).send({
				error: "EmptyDeduction",
				message: "Список материалов для списания пуст",
			});
		}

		const identity = getRequestIdentity(request);
		const userContext = request.user;
		const effectiveUserId = identity.userId ?? userContext?.id ?? null;

		try {
			const deductionResults = await db.transaction(async (tx) => {
				const results: Array<any> = [];

				for (const item of itemsList) {
					let itemId = item.inventoryItemId || item.id;

					// Если ID не передан, но передано наименование — ищем позицию в базе
					if (!itemId && item.name?.trim()) {
						const searchName = item.name.trim();
						let [found] = await tx
							.select({ id: inventoryItems.id })
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.organizationId, organizationId),
									sql`lower(${inventoryItems.name}) = lower(${searchName})`,
								),
							)
							.limit(1);

						if (!found) {
							// Поиск по ключевым словам/подстроке
							const [partial] = await tx
								.select({ id: inventoryItems.id })
								.from(inventoryItems)
								.where(
									and(
										eq(inventoryItems.organizationId, organizationId),
										sql`lower(${inventoryItems.name}) LIKE lower(${'%' + searchName + '%'}) OR lower(${searchName}) LIKE ('%' || lower(${inventoryItems.name}) || '%')`,
									),
								)
								.limit(1);
							if (partial) found = partial;
						}

						if (found) {
							itemId = found.id;
						} else {
							// По закону Zero Dead-Ends (Мандат 8e, 8n): если номенклатура отсутствует на складе,
							// создаем карточку материала с остатком 0 для последующего мягкого овердрафта.
							const [created] = await tx
								.insert(inventoryItems)
								.values({
									organizationId,
									name: searchName,
									stockQuantity: "0",
									currentQty: "0",
									criticalThreshold: "0",
									unitCostRub:
										item.unitCostRub != null
											? String(item.unitCostRub)
											: "0",
								})
								.returning({ id: inventoryItems.id });
							if (created) itemId = created.id;
						}
					}

					if (!itemId) {
						throw new Error(
							`Не удалось определить позицию склада для материала «${item.name || "не указано"}»`,
						);
					}

					const res = await fefoStockService.deductFefo(tx, {
						organizationId,
						inventoryItemId: itemId,
						requiredQty: item.quantity,
						allowOverdraft:
							item.allowOverdraft ?? allowOverdraftDefault,
						notes:
							item.reason ||
							item.notes ||
							commonReason ||
							"Списание со склада у кресла (автоматический FEFO)",
						userId: effectiveUserId,
						visitId: visitId || null,
						transactionType: "treatment_consumable",
					});

					results.push(res);
				}

				return results;
			});

			const hasOverdraft = deductionResults.some((r) => r.isOverdraft);

			return reply.status(200).send({
				success: true,
				count: deductionResults.length,
				items: deductionResults,
				hasOverdraft,
				message: hasOverdraft
					? `Списано позиций по FEFO: ${deductionResults.length} (зафиксирован мягкий овердрафт, клинический процесс не блокируется)`
					: `Списано позиций по FEFO: ${deductionResults.length}`,
			});
		} catch (error) {
			const isInsufficientStock =
				error instanceof InsufficientStockError ||
				(error as any)?.error === "InsufficientStock" ||
				(error as any)?.name === "InsufficientStockError" ||
				(error as any)?.code === "InsufficientStock";

			if (isInsufficientStock) {
				const itemErr = error as any;
				const invItemId = itemErr.inventoryItemId ?? "unknown";
				const invItemName = itemErr.inventoryItemName ?? "Материал";
				const avail = Number(itemErr.availableStock ?? 0);
				const req = Number(itemErr.requiredStock ?? 1);
				return reply.status(200).send({
					success: true,
					isOverdraft: true,
					is_overdraft: true,
					hasOverdraft: true,
					warning: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}). Приём проведён без блокировки.`,
					message: `Мягкий овердрафт склада: дефицит по материалу «${invItemName}». Клинический процесс не блокируется.`,
					inventoryItemId: invItemId,
					inventoryItemName: invItemName,
					availableStock: avail,
					requiredStock: req,
					count: 0,
					items: [],
				});
			}

			request.log.error(error, "Failed to deduct inventory items");
			const msg =
				error instanceof Error
					? error.message
					: "Не удалось провести списание материалов";
			return reply.status(400).send({
				error: "DeductionFailed",
				message: msg,
			});
		}
	};

	// POST /:organizationId/deduct — Пакетное или одиночное списание со склада (Мандаты 8e, 8k, 8s)
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/deduct", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory deduct",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductRequest(organizationId, request.body, request, reply);
	});

	// POST /deduct — Списание со склада (для клиентов без orgId в URL)
	server.post("/deduct", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory deduct",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductRequest(targetOrgId, request.body, request, reply);
	});

	// POST /:organizationId/write-off — Пакетное списание со склада
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/write-off", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory write-off",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductRequest(organizationId, request.body, request, reply);
	});

	// POST /write-off — Списание со склада (без orgId в URL)
	server.post("/write-off", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory write-off",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductRequest(targetOrgId, request.body, request, reply);
	});

	// POST /:organizationId/transactions — Складская транзакция (списание)
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/transactions", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory transactions",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductRequest(organizationId, request.body, request, reply);
	});

	// POST /transactions — Складская транзакция (без orgId в URL)
	server.post("/transactions", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory transactions",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductRequest(targetOrgId, request.body, request, reply);
	});

	// POST /:organizationId/quick-deduct-surgical — 1-клик списание расходников операции (Мандат 8e, 8n)
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/quick-deduct-surgical", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick deduct surgical",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductRequest(organizationId, request.body, request, reply);
	});

	// POST /quick-deduct-surgical — 1-клик списание расходников операции без orgId в URL
	server.post("/quick-deduct-surgical", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory quick deduct surgical",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductRequest(targetOrgId, request.body, request, reply);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// POST /:organizationId/deduct/visit — Автосписание расходников по визиту (Мандаты 8e, 8k, 8s)
	// ─────────────────────────────────────────────────────────────────────────
	const handleDeductVisitRequest = async (
		organizationId: string,
		rawBody: unknown,
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		let normalizedBody = rawBody;
		if (rawBody && typeof rawBody === "object") {
			const b = rawBody as Record<string, any>;
			const rawVisitId = b.visitId ?? b.treatment_reference_id ?? b.visit_id;
			const rawItems = b.items ?? b.materials;
			let items: any[] | undefined = undefined;
			if (Array.isArray(rawItems)) {
				const uuidRegex =
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
				for (const it of rawItems) {
					const id = it.inventoryItemId ?? it.inventory_item_id ?? it.id;
					if (id && !uuidRegex.test(id)) {
						return reply.status(400).send({
							error: "ValidationError",
							message: "ID материала должен быть валидным UUID",
						});
					}
				}
				items = rawItems.map((it) => ({
					inventoryItemId: it.inventoryItemId ?? it.inventory_item_id ?? it.id,
					quantity: it.quantity,
					reason: it.reason ?? it.notes ?? b.notes,
				}));
			}
			normalizedBody = {
				...b,
				visitId: rawVisitId,
				items,
				allowOverdraft:
					b.allowOverdraft ?? b.allowSoftOverdraft ?? b.clamp_at_zero ?? true,
			};
		}

		const parsedBody = visitStockDeductionRequestSchema.safeParse(normalizedBody);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса списания",
			});
		}

		try {
			const result = await db.transaction(async (tx) => {
				return TreatmentConsumablesService.deductForVisit(tx, {
					organizationId,
					visitId: parsedBody.data.visitId,
					clientMutationId:
						parsedBody.data.clientMutationId ??
						(request.headers["idempotency-key"] as string | undefined) ??
						null,
					...(parsedBody.data.userId !== undefined
						? { userId: parsedBody.data.userId }
						: { userId: (request.user as any)?.id ?? null }),
					...(parsedBody.data.transactionType !== undefined
						? { transactionType: parsedBody.data.transactionType }
						: {}),
					...(parsedBody.data.services !== undefined
						? { services: parsedBody.data.services }
						: {}),
					...(parsedBody.data.items !== undefined ? { items: parsedBody.data.items } : {}),
					...(parsedBody.data.carpulesCount !== undefined
						? { carpulesCount: parsedBody.data.carpulesCount }
						: {}),
					...(parsedBody.data.drugName !== undefined
						? { drugName: parsedBody.data.drugName }
						: {}),
					...(parsedBody.data.paperJournalAcknowledged !== undefined
						? { paperJournalAcknowledged: parsedBody.data.paperJournalAcknowledged }
						: {}),
					...(parsedBody.data.allowOverdraft !== undefined
						? { allowOverdraft: parsedBody.data.allowOverdraft }
						: {}),
				});
			});
			return reply.send({
				success: true,
				...result,
				is_overdraft: Boolean(result.isOverdraft),
			});
		} catch (err: unknown) {
			const isInsufficientStock =
				err instanceof InsufficientStockError ||
				(err as any)?.error === "InsufficientStock" ||
				(err as any)?.name === "InsufficientStockError" ||
				(err as any)?.code === "InsufficientStock";

			if (isInsufficientStock) {
				const itemErr = err as any;
				const invItemId = itemErr.inventoryItemId ?? "unknown";
				const invItemName = itemErr.inventoryItemName ?? "Материал";
				const avail = Number(itemErr.availableStock ?? 0);
				const req = Number(itemErr.requiredStock ?? 1);
				return reply.status(200).send({
					success: true,
					isOverdraft: true,
					is_overdraft: true,
					warning: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}). Приём проведён без блокировки.`,
					inventoryItemId: invItemId,
					inventoryItemName: invItemName,
					availableStock: avail,
					requiredStock: req,
					deductions: [],
					warnings: [
						{
							type: "out_of_stock",
							itemId: invItemId,
							itemName: invItemName,
							message: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}).`,
							currentStock: avail - req,
							criticalThreshold: 0,
						},
					],
				});
			}
			request.log.error(err, "Failed to deduct visit inventory");
			return reply.code(500).send({
				error: "InternalServerError",
				message: err instanceof Error ? err.message : "Не удалось выполнить списание расходников по визиту",
			});
		}
	};

	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/deduct/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory deduct visit",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductVisitRequest(organizationId, request.body, request, reply);
	});

	server.post("/deduct/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory deduct visit",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeductVisitRequest(targetOrgId, request.body, request, reply);
	});
};
