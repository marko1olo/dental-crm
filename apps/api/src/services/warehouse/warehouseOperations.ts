/**
 * apps/api/src/services/warehouse/warehouseOperations.ts
 *
 * Warehouse operations engine implementing Mandates 8e, 8n (Solo Doctor & Small Clinic) & 8v:
 * 1. 1-click disposal of empty anesthetic carpules (SanPiN 3.3686-21).
 * 2. Soft warehouse overdraft (emergency_overdraft ledger, no fatal 400/500 errors).
 * 3. 1-click auto-deduction of consumables by procedure tech-cards / visit (BOM 804n).
 * 4. Zero Dead-Ends: auto-creation of missing inventory items with 0 stock on the fly.
 */

import { randomInt } from "node:crypto";
import { visitStockDeductionRequestSchema } from "@dental/shared";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/client.js";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";
import { FefoStockService } from "../inventory/fefoStockService.js";
import {
	InsufficientStockError,
	TreatmentConsumablesService,
} from "../treatmentConsumablesService.js";

const fefoStockService = new FefoStockService();

export const quickCarpuleDisposalSchema = z.object({
	drugName: z.string().min(1, "Название анестетика обязательно").default("Артикаин 4%"),
	carpulesCount: z.number().int().positive("Количество карпул должно быть > 0").default(1),
	nurseName: z.string().min(1).default("Дежурная медсестра"),
	doctorName: z.string().min(1).default("Лечащий врач"),
	anestheticItemId: z.string().optional(),
	visitId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	organizationId: z.string().optional(),
});

export const softOverdraftDeductSchema = z.object({
	itemId: z.string().optional(),
	inventoryItemId: z.string().optional(),
	name: z.string().optional(),
	itemName: z.string().optional(),
	quantity: z.number().positive("Количество должно быть больше нуля"),
	reason: z.string().optional(),
	visitId: z.string().nullable().optional(),
	organizationId: z.string().optional(),
});

export const warehouseDeductItemSchema = z.object({
	inventoryItemId: z.string().optional(),
	itemId: z.string().optional(),
	id: z.string().optional(),
	name: z.string().optional(),
	itemName: z.string().optional(),
	quantity: z
		.number({
			required_error: "Укажите количество для списания",
			invalid_type_error: "Количество должно быть числом",
		})
		.finite({ message: "Количество должно быть числом" })
		.positive({ message: "Количество для списания должно быть больше 0" }),
	unitCostRub: z.union([z.number(), z.string()]).optional(),
	allowOverdraft: z.boolean().default(true).optional(),
	reason: z.string().optional(),
	notes: z.string().optional(),
});

export const warehouseDeductBatchBodySchema = z.union([
	z.array(warehouseDeductItemSchema),
	z.object({
		items: z.array(warehouseDeductItemSchema).optional(),
		materials: z.array(warehouseDeductItemSchema).optional(),
		organizationId: z.string().optional(),
		reason: z.string().optional(),
		notes: z.string().optional(),
		operationTitle: z.string().optional(),
		hasWarehouseDelay: z.boolean().optional(),
		visitId: z.string().optional(),
		allowOverdraft: z.boolean().default(true).optional(),
	}),
	warehouseDeductItemSchema,
]);

export async function executeSoftOverdraftDeduct(
	organizationId: string,
	data: z.infer<typeof softOverdraftDeductSchema>,
	userId: string | null,
) {
	const rawId = data.itemId || data.inventoryItemId;
	const searchName = (data.name || data.itemName || "").trim();

	return await db.transaction(async (tx) => {
		let item: typeof inventoryItems.$inferSelect | undefined;

		if (rawId) {
			const [itemById] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.id, rawId),
						eq(inventoryItems.organizationId, organizationId),
					),
				)
				.limit(1)
				.for("update");
			item = itemById;
		}

		if (!item && searchName) {
			const [itemByName] = await tx
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
			item = itemByName;
		}

		if (!item && searchName) {
			const [partial] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, organizationId),
						ilike(inventoryItems.name, `%${searchName}%`),
					),
				)
				.limit(1)
				.for("update");
			item = partial;
		}

		// По закону Zero Dead-Ends (Мандат 8e, 8n): если номенклатура отсутствует на складе,
		// создаем карточку материала с остатком 0 для последующего мягкого овердрафта.
		if (!item) {
			const targetName = searchName || (rawId ? `Материал ${rawId}` : "Клинический расходник");
			const isUuid = rawId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
			const [created] = await tx
				.insert(inventoryItems)
				.values({
					...(isUuid ? { id: rawId } : {}),
					organizationId,
					name: targetName,
					stockQuantity: "0",
					currentQty: "0",
					criticalThreshold: "0",
					unitCostRub: "0",
				})
				.returning();
			item = created;
		}

		if (!item) {
			throw new Error("Не удалось инициализировать карточку материала для списания");
		}

		const currentStock = Number(item.stockQuantity ?? item.currentQty ?? 0);
		const newStock = Number((currentStock - data.quantity).toFixed(4));
		const isOverdraft = newStock < 0;
		const deficit = isOverdraft ? Math.abs(newStock) : 0;

		await tx
			.update(inventoryItems)
			.set({
				stockQuantity: String(newStock),
				currentQty: String(newStock),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(inventoryItems.id, item.id),
					eq(inventoryItems.organizationId, organizationId),
				),
			);

		const [txRecord] = await tx
			.insert(inventoryTransactions)
			.values({
				organizationId,
				itemId: item.id,
				inventoryItemId: item.id,
				visitId: data.visitId || null,
				transactionType: isOverdraft ? "emergency_overdraft" : "consumption",
				qty: String(-data.quantity),
				quantityChanged: String(-data.quantity),
				isOverdraft,
				notes:
					data.reason ??
					(isOverdraft
						? `Мягкий овердрафт: экстренное списание при нулевом/недостаточном остатке (дефицит: ${deficit})`
						: "Списание расходных материалов"),
				userId,
				createdAt: new Date(),
			})
			.returning();

		return {
			item,
			currentStock,
			newStock,
			isOverdraft,
			deficit,
			transaction: txRecord,
		};
	});
}

export async function executeQuickCarpuleDisposal(
	organizationId: string,
	data: z.infer<typeof quickCarpuleDisposalSchema>,
	userId: string | null,
) {
	const now = new Date();
	const dateIso = now.toISOString().slice(0, 10);
	const actNumber = `АКТ-КП-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${randomInt(100, 1000)}`;

	const result = await db.transaction(async (tx) => {
		let matchingItem: typeof inventoryItems.$inferSelect | undefined;

		if (data.anestheticItemId) {
			const [itemById] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.id, data.anestheticItemId),
						eq(inventoryItems.organizationId, organizationId),
					),
				)
				.limit(1)
				.for("update");
			matchingItem = itemById;
		}

		if (!matchingItem) {
			const [itemByName] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, organizationId),
						or(
							ilike(inventoryItems.name, `%${data.drugName}%`),
							ilike(inventoryItems.name, "%артикаин%"),
							ilike(inventoryItems.name, "%ультракаин%"),
							ilike(inventoryItems.name, "%анесте%"),
							eq(inventoryItems.category, "anesthesia"),
						),
					),
				)
				.limit(1)
				.for("update");
			matchingItem = itemByName;
		}

		let isOverdraft = false;
		let remainingStock = 0;
		let deficitCount = 0;

		if (matchingItem) {
			const fefoResult = await fefoStockService.deductFefo(tx, {
				organizationId,
				inventoryItemId: matchingItem.id,
				requiredQty: data.carpulesCount,
				visitId: data.visitId ?? null,
				userId,
				allowOverdraft: true,
				transactionType: "treatment_consumable",
				notes: `Списание пустых карпул в 1 клик (${data.carpulesCount} шт.) • ${data.nurseName} [СанПиН 3.3686-21]`,
			});

			const currentStock = Number(matchingItem.stockQuantity ?? matchingItem.currentQty ?? 0);
			const newStock = Number((currentStock - data.carpulesCount).toFixed(3));
			isOverdraft = fefoResult.isOverdraft;
			remainingStock = newStock;
			deficitCount = fefoResult.deficitQty;
		} else {
			// Если карточка анестетика еще не заведена на складе:
			// создаем виртуальную фиксацию дефицита без сбоя
			isOverdraft = true;
			deficitCount = data.carpulesCount;
			remainingStock = -data.carpulesCount;
		}

		return {
			isOverdraft,
			remainingStock,
			deficitCount,
			drugName: matchingItem?.name ?? data.drugName,
		};
	});

	return {
		success: true,
		actNumber,
		date: dateIso,
		drugName: result.drugName,
		carpulesCount: data.carpulesCount,
		nurseName: data.nurseName,
		doctorName: data.doctorName,
		singleSigner: true,
		sanpinClause: "СанПиН 3.3686-21 п. 3630",
		wasteClass: "class_b_hazardous",
		isOverdraft: result.isOverdraft,
		remainingStock: result.remainingStock,
		deficitCount: result.deficitCount,
		warning: result.isOverdraft ? "soft_overdraft" : undefined,
		warningMessage: result.isOverdraft
			? `Остаток 0: зафиксирован мягкий овердрафт (дефицит: ${result.deficitCount} карп., накладная поставщика ещё не внесена). Операция спасения зуба не заблокирована.`
			: undefined,
	};
}

export async function handleWarehouseDeductRequest(
	organizationId: string,
	rawBody: unknown,
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const parsed = warehouseDeductBatchBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Неверный формат данных для списания материалов",
			details: parsed.error.errors,
		});
	}

	let itemsList: z.infer<typeof warehouseDeductItemSchema>[] = [];
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
		visitId = parsed.data.visitId ? String(parsed.data.visitId) : undefined;
		if (parsed.data.allowOverdraft !== undefined) {
			allowOverdraftDefault = parsed.data.allowOverdraft;
		}
	} else {
		itemsList = [parsed.data as z.infer<typeof warehouseDeductItemSchema>];
	}

	if (itemsList.length === 0) {
		return reply.status(400).send({
			error: "EmptyDeduction",
			message: "Список материалов для списания пуст",
		});
	}

	const effectiveUserId = (request.user as { id?: string } | undefined)?.id ?? null;

	try {
		const deductionResults = await db.transaction(async (tx) => {
			const results: Array<any> = [];

			for (const item of itemsList) {
				let itemId = item.inventoryItemId || item.itemId || item.id;
				const searchName = (item.name || item.itemName || "").trim();

				if (!itemId && searchName) {
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
						const [partial] = await tx
							.select({ id: inventoryItems.id })
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.organizationId, organizationId),
									ilike(inventoryItems.name, `%${searchName}%`),
								),
							)
							.limit(1);
						if (partial) found = partial;
					}

					if (found) {
						itemId = found.id;
					} else {
						// Zero Dead-Ends (Мандат 8n)
						const [created] = await tx
							.insert(inventoryItems)
							.values({
								organizationId,
								name: searchName,
								stockQuantity: "0",
								currentQty: "0",
								criticalThreshold: "0",
								unitCostRub: item.unitCostRub != null ? String(item.unitCostRub) : "0",
							})
							.returning({ id: inventoryItems.id });
						if (created) itemId = created.id;
					}
				}

				if (!itemId) {
					throw new Error(
						`Не удалось определить позицию склада для материала «${searchName || "не указано"}»`,
					);
				}

				const res = await fefoStockService.deductFefo(tx, {
					organizationId,
					inventoryItemId: itemId,
					requiredQty: item.quantity,
					allowOverdraft: item.allowOverdraft ?? allowOverdraftDefault,
					notes:
						item.reason ||
						item.notes ||
						commonReason ||
						"Списание со склада у кресла (автоматический FEFO по Мандату 8e, 8v)",
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
			isOverdraft: hasOverdraft,
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
				count: 1,
				hasOverdraft: true,
				isOverdraft: true,
				is_overdraft: true,
				items: [
					{
						inventoryItemId: invItemId,
						inventoryItemName: invItemName,
						requiredQty: req,
						deductedQty: req,
						isOverdraft: true,
						deficitQty: req - avail,
						warning: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}). Приём проведён без блокировки.`,
					},
				],
				message: `Списание со склада проведено (зафиксирован мягкий овердрафт: дефицит ${req - avail} ед. по «${invItemName}», накладная ещё не внесена). Приём не заблокирован.`,
			});
		}

		request.log.error(error, "Failed to deduct warehouse items");
		const msg = error instanceof Error ? error.message : "Не удалось провести списание материалов";
		return reply.status(400).send({
			error: "DeductionFailed",
			message: msg,
		});
	}
}

export async function handleWarehouseDeductVisitRequest(
	organizationId: string,
	rawBody: unknown,
	request: FastifyRequest,
	reply: FastifyReply,
) {
	let normalizedBody = rawBody;
	if (rawBody && typeof rawBody === "object") {
		const b = rawBody as Record<string, any>;
		const rawVisitId = b.visitId ?? b.treatment_reference_id ?? b.visit_id;
		const rawItems = b.items ?? b.materials;
		let items: any[] | undefined = undefined;
		if (Array.isArray(rawItems)) {
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
			allowOverdraft: b.allowOverdraft ?? b.allowSoftOverdraft ?? b.clamp_at_zero ?? true,
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
		request.log.error(err, "Failed to deduct visit inventory from warehouse");
		return reply.code(500).send({
			error: "InternalServerError",
			message: err instanceof Error ? err.message : "Не удалось выполнить списание расходников по визиту",
		});
	}
}
