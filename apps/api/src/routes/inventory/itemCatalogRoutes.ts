import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { inventoryQuery } from "../../db/inventoryQuery.js";
import { inventoryItems } from "../../db/schema.js";
import { ReorderSuggestionService } from "../../services/reorderSuggestionService.js";
import {
	INVALID_DATE,
	inventoryCreateBodySchema,
	inventoryUpdateBodySchema,
	normalizedExpirationDate,
} from "./types.js";

export const itemCatalogRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// GET all inventory items for an organization (authenticated)
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory read",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			// Security: ensure the resolved org matches the requested one
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await inventoryQuery.getInventoryItems(organizationId);
			return items;
		},
	);

	// GET /:organizationId/items — alias for inventory read
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/items",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory read items",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await inventoryQuery.getInventoryItems(organizationId);
			return items;
		},
	);

	// GET /reorder-suggestions — Предиктивные рекомендации к закупкам (DentalPin Reorder Point)
	server.get<{ Querystring: { onlyNeedingReorder?: string | boolean } }>(
		"/reorder-suggestions",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory reorder suggestions read",
			);
			if (!resolvedOrgId) return;

			const onlyNeedingReorder =
				request.query.onlyNeedingReorder === "true" ||
				request.query.onlyNeedingReorder === true;

			const suggestions = await ReorderSuggestionService.getSuggestions(
				resolvedOrgId,
				{ onlyNeedingReorder },
			);
			return reply.status(200).send(suggestions);
		},
	);

	// GET /:organizationId/reorder-suggestions
	server.get<{
		Params: { organizationId: string };
		Querystring: { onlyNeedingReorder?: string | boolean };
	}>("/:organizationId/reorder-suggestions", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"inventory reorder suggestions read",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const onlyNeedingReorder =
			request.query.onlyNeedingReorder === "true" ||
			request.query.onlyNeedingReorder === true;

		const suggestions = await ReorderSuggestionService.getSuggestions(
			organizationId,
			{ onlyNeedingReorder },
		);
		return reply.status(200).send(suggestions);
	});

	// GET /:organizationId/alerts — сводка по дефициту и срокам годности материалов
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/alerts",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory alerts read",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await inventoryQuery.getInventoryItems(organizationId);

			const now = new Date();
			const todayStr = now.toISOString().slice(0, 10);
			const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
			const in30DaysStr = in30Days.toISOString().slice(0, 10);

			const lowStockItems: typeof items = [];
			const outOfStockItems: typeof items = [];
			const expiredItems: typeof items = [];
			const expiringSoonItems: typeof items = [];

			let totalValuationRub = 0;

			for (const item of items) {
				const stock = Number(item.stockQuantity ?? 0);
				const threshold = Number(item.criticalThreshold ?? 0);
				const cost = Number(item.unitCostRub ?? 0);

				if (Number.isFinite(stock) && Number.isFinite(cost)) {
					totalValuationRub += Math.max(0, stock) * Math.max(0, cost);
				}

				if (stock <= 0) {
					outOfStockItems.push(item);
				} else if (threshold > 0 && stock <= threshold) {
					lowStockItems.push(item);
				}

				if (item.expirationDate) {
					if (item.expirationDate < todayStr) {
						expiredItems.push(item);
					} else if (item.expirationDate <= in30DaysStr) {
						expiringSoonItems.push(item);
					}
				}
			}

			return {
				summary: {
					totalItems: items.length,
					totalValuationRub: Number(totalValuationRub.toFixed(2)),
					lowStockCount: lowStockItems.length,
					outOfStockCount: outOfStockItems.length,
					expiredCount: expiredItems.length,
					expiringSoonCount: expiringSoonItems.length,
				},
				lowStockItems,
				outOfStockItems,
				expiredItems,
				expiringSoonItems,
			};
		},
	);

	const handleCreateInventoryItem = async (
		organizationId: string,
		rawBody: unknown,
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const parsedBody = inventoryCreateBodySchema.safeParse(rawBody ?? {});
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "NameRequired",
				message: "Укажите название материала.",
			});
		}
		const {
			name,
			criticalThreshold = 0,
			unitCostRub = 0,
			stockQuantity = 0,
			sku = null,
			barcode = null,
			lotNumber = null,
			expirationDate = null,
		} = parsedBody.data;
		if (!name?.trim()) {
			return reply.status(400).send({
				error: "NameRequired",
				message: "Укажите название материала.",
			});
		}
		/*
		 * Умолчание порога снижено с 5 до 0.
		 *
		 * Пятёрка бралась с потолка: не приславший поле клиент получал в базу
		 * выдуманный минимальный остаток, и склад начинал сигналить о дефиците
		 * материала, для которого никто порога не задавал. Ноль означает «порог не
		 * задан» и ни о чём не сигналит.
		 */
		const expiration = normalizedExpirationDate(expirationDate);
		if (expiration === INVALID_DATE) {
			return reply.status(400).send({
				error: "ExpirationDateInvalid",
				message: "Срок годности указывается датой, например 31.03.2027.",
			});
		}

		const newItem = await db
			.insert(inventoryItems)
			.values({
				organizationId,
				name: name.trim(),
				criticalThreshold: String(Math.max(0, criticalThreshold)),
				unitCostRub: String(Math.max(0, unitCostRub)),
				stockQuantity: String(Math.max(0, stockQuantity)),
				sku: sku?.trim() || null,
				barcode: barcode?.trim() || null,
				lotNumber: lotNumber?.trim() || null,
				expirationDate: expiration,
			})
			.returning();

		const created = newItem[0];
		if (!created)
			return reply.status(500).send({
				error: "InventoryItemNotSaved",
				message:
					"Позиция склада не создана: сервер не сохранил запись. Проверьте название и повторите; если снова не выйдет — сообщите администратору клиники.",
			});
		return created;
	};

	// POST new inventory item (staff/admin only)
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory create",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleCreateInventoryItem(organizationId, request.body, request, reply);
	});

	// POST new inventory item alias /:organizationId/items (staff/admin only)
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/items", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory create items",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleCreateInventoryItem(organizationId, request.body, request, reply);
	});

	// PUT update inventory item details (staff/admin only)
	server.put<{
		Params: { organizationId: string; itemId: string };
		Body: {
			name: string;
			criticalThreshold?: number;
			unitCostRub?: number;
			stockQuantity?: number;
			sku?: string | null;
			barcode?: string | null;
			lotNumber?: string | null;
			expirationDate?: string | null;
		};
	}>("/:organizationId/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory update",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		/*
		 * Правка материала сохраняла только название, порог и цену.
		 *
		 * Артикул и штрихкод форма присылала, а `.set()` их не писал: кладовщик
		 * менял штрихкод, видел «Материал обновлён» и получал прежнее значение.
		 * Молчаливая потеря введённого хуже отказа — человек уверен, что данные
		 * сохранены.
		 *
		 * Умолчание порога снижено с 5 до 0 по той же причине, что и при создании:
		 * пятёрка бралась с потолка и заставляла склад сигналить о дефиците
		 * материала, для которого порога не задавали.
		 */
		const parsedUpdate = inventoryUpdateBodySchema.safeParse(
			request.body ?? {},
		);
		if (!parsedUpdate.success) {
			return reply.status(400).send({
				error: "NameRequired",
				message: "Укажите название материала.",
			});
		}
		const {
			name,
			criticalThreshold = 0,
			unitCostRub = 0,
			sku = null,
			barcode = null,
			lotNumber = null,
			expirationDate = null,
		} = parsedUpdate.data;
		if (!name?.trim()) {
			return reply.status(400).send({
				error: "NameRequired",
				message: "Укажите название материала.",
			});
		}
		const expiration = normalizedExpirationDate(expirationDate);
		if (expiration === INVALID_DATE) {
			return reply.status(400).send({
				error: "ExpirationDateInvalid",
				message: "Срок годности указывается датой, например 31.03.2027.",
			});
		}

		const [existing] = await db
			.select({ id: inventoryItems.id })
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!existing) return reply.status(404).send({ error: "Item not found" });

		const [updated] = await db
			.update(inventoryItems)
			.set({
				name: name.trim(),
				criticalThreshold: String(Math.max(0, criticalThreshold)),
				unitCostRub: String(Math.max(0, unitCostRub)),
				sku: sku?.trim() || null,
				barcode: barcode?.trim() || null,
				lotNumber: lotNumber?.trim() || null,
				expirationDate: expiration,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.returning();

		if (!updated)
			return reply.status(500).send({
				error: "InventoryItemNotSaved",
				message:
					"Позиция склада не сохранена: сервер не записал изменения. Проверьте данные и повторите; если снова не выйдет — сообщите администратору клиники.",
			});
		return updated;
	});

	// DELETE inventory item (admin only)
	server.delete<{
		Params: { organizationId: string; itemId: string };
	}>("/:organizationId/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory delete",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const [existing] = await db
			.select({ id: inventoryItems.id })
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!existing) return reply.status(404).send({ error: "Item not found" });

		// БЫЛО: DELETE по id после SELECT с org — без organizationId в WHERE и без
		// RETURNING: 0 строк всё равно success:true.
		// СТАЛО: and(id, organizationId) + RETURNING; пусто — 404.
		const [deleted] = await db
			.delete(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.returning({ id: inventoryItems.id });
		if (!deleted) return reply.status(404).send({ error: "Item not found" });
		return { success: true };
	});
};
