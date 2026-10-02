/**
 * apps/api/src/routes/warehouse.ts — Warehouse API routes.
 *
 * Implements Mandate 8e item 10 & Mandate 8n (Solo Doctor & Small Clinic):
 * 1. 1-click nurse disposal of empty anesthetic carpules (SanPiN 3.3686-21, single nurse signature, NO 3-person commission).
 * 2. Soft warehouse overdraft: when stock is 0 or insufficient due to supplier invoice delay,
 *    never throws fatal 400/500 or blocks patient care/treatment/operation. Decrements stock into negative,
 *    records emergency_overdraft transaction, and returns 200 OK with soft overdraft warning.
 */

import { randomInt } from "node:crypto";
import { and, eq, ilike, or } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { inventoryItems, inventoryTransactions } from "../db/schema.js";
import { FefoStockService } from "../services/inventory/fefoStockService.js";

const fefoStockService = new FefoStockService();

const quickCarpuleDisposalSchema = z.object({
	drugName: z.string().min(1, "Название анестетика обязательно").default("Артикаин 4%"),
	carpulesCount: z.number().int().positive("Количество карпул должно быть > 0").default(1),
	nurseName: z.string().min(1).default("Дежурная медсестра"),
	doctorName: z.string().min(1).default("Лечащий врач"),
	anestheticItemId: z.string().optional(),
	visitId: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
});

const softOverdraftDeductSchema = z.object({
	itemId: z.string().min(1, "Идентификатор материала обязателен"),
	quantity: z.number().positive("Количество должно быть больше нуля"),
	reason: z.string().optional(),
	visitId: z.string().nullable().optional(),
});

export const warehouseRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// POST /api/warehouse/:organizationId/quick-carpule-disposal
	// 1-клик списание пустых карпул медсестрой единолично (СанПиН 3.3686-21, без комиссии из 3 человек)
	server.post<{
		Params: { organizationId: string };
		Body: z.infer<typeof quickCarpuleDisposalSchema>;
	}>("/:organizationId/quick-carpule-disposal", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"warehouse quick carpule disposal",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsed = quickCarpuleDisposalSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры списания",
			});
		}

		const data = parsed.data;
		const now = new Date();
		const dateIso = now.toISOString().slice(0, 10);
		const actNumber = `АКТ-КП-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${randomInt(100, 1000)}`;

		const result = await db.transaction(async (tx) => {
			// Находим позицию анестетика на складе (по ID, имени или категории)
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
					userId: (request.user as { id?: string } | undefined)?.id ?? null,
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

		return reply.status(200).send({
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
		});
	});

	// POST /api/warehouse/:organizationId/soft-overdraft-deduct
	// Мягкое списание материала без блокировки при задержке накладной (Мягкий овердрафт)
	server.post<{
		Params: { organizationId: string };
		Body: z.infer<typeof softOverdraftDeductSchema>;
	}>("/:organizationId/soft-overdraft-deduct", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"warehouse soft overdraft deduct",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsed = softOverdraftDeductSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры списания",
			});
		}

		const { itemId, quantity, reason, visitId } = parsed.data;

		const result = await db.transaction(async (tx) => {
			const [item] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.id, itemId),
						eq(inventoryItems.organizationId, organizationId),
					),
				)
				.limit(1)
				.for("update");

			if (!item) {
				return { notFound: true as const };
			}

			const fefoResult = await fefoStockService.deductFefo(tx, {
				organizationId,
				inventoryItemId: item.id,
				requiredQty: quantity,
				visitId: visitId ?? null,
				userId: (request.user as { id?: string } | undefined)?.id ?? null,
				allowOverdraft: true,
				transactionType: "treatment_consumable",
				notes: reason || "Списание материала со склада",
			});

			const currentStock = Number(item.stockQuantity ?? item.currentQty ?? 0);
			const newStock = Number((currentStock - quantity).toFixed(4));
			const isOverdraft = fefoResult.isOverdraft;
			const deficit = fefoResult.deficitQty;

			return {
				item,
				newStock,
				isOverdraft,
				deficit,
			};
		});

		if ("notFound" in result) {
			return reply.status(404).send({
				error: "ItemNotFound",
				message: "Материал не найден на складе клиники",
			});
		}

		return reply.status(200).send({
			success: true,
			itemId: result.item.id,
			itemName: result.item.name,
			quantityDeducted: quantity,
			newStock: result.newStock,
			isOverdraft: result.isOverdraft,
			deficit: result.deficit,
			warning: result.isOverdraft ? "soft_overdraft" : undefined,
			warningMessage: result.isOverdraft
				? `Остаток 0: зафиксирован мягкий овердрафт (дефицит: ${result.deficit} ${result.item.unit ?? "ед."}). Задержка оприходования накладной не блокирует проведение приема!`
				: undefined,
		});
	});

	// GET /api/warehouse/:organizationId/stock
	// Чтение актуальных остатков склада клиники из реального PostgreSQL 18 (Mandate 8y)
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/stock",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"warehouse stock read",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await db
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.organizationId, organizationId))
				.orderBy(inventoryItems.name);

			return reply.send(items);
		},
	);

	// GET /api/warehouse/stock (автоопределение orgId из сессии)
	server.get("/stock", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"warehouse stock read",
		);
		if (!resolvedOrgId) return;

		const items = await db
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.organizationId, resolvedOrgId))
			.orderBy(inventoryItems.name);

		return reply.send(items);
	});
};

export default warehouseRoutes;
