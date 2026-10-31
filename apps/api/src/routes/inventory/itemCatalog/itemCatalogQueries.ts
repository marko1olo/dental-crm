import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { inventoryQuery } from "../../../db/inventoryQuery.js";
import type { inventoryItems } from "../../../db/schema.js";
import { ReorderSuggestionService } from "../../../services/reorderSuggestionService.js";

export const calculateAlertsFromItems = (
	items: Array<typeof inventoryItems.$inferSelect>,
) => {
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
};

export const registerItemCatalogQueries = (server: FastifyInstance): void => {
	// GET all inventory items for an organization (authenticated, Dual-Route Parity & "current" support)
	server.get<{ Params: { organizationId?: string } }>(
		"/:organizationId",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory read",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			const effectiveOrgId =
				!organizationId || organizationId === "current" || organizationId === "items"
					? resolvedOrgId
					: organizationId;
			if (resolvedOrgId !== effectiveOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await inventoryQuery.getInventoryItems(effectiveOrgId);
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
			const effectiveOrgId =
				organizationId === "current" || organizationId === "items"
					? resolvedOrgId
					: organizationId;
			if (resolvedOrgId !== effectiveOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await inventoryQuery.getInventoryItems(effectiveOrgId);
			return reply.send(items);
		},
	);

	// GET /items — автоопределение orgId из сессии (Zero Dead-Ends SSOT)
	server.get("/items", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"inventory read items",
		);
		if (!resolvedOrgId) return;

		const items = await inventoryQuery.getInventoryItems(resolvedOrgId);
		return reply.send(items);
	});

	// GET /:organizationId/stock — алиас реестра остатков для складского модуля
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/stock",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory read stock",
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

	// GET /stock — автоопределение orgId
	server.get("/stock", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"inventory read stock",
		);
		if (!resolvedOrgId) return;

		const items = await inventoryQuery.getInventoryItems(resolvedOrgId);
		return items;
	});

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
			const effectiveOrgId =
				organizationId === "current" || organizationId === "alerts"
					? resolvedOrgId
					: organizationId;
			if (resolvedOrgId !== effectiveOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await inventoryQuery.getInventoryItems(effectiveOrgId);
			return calculateAlertsFromItems(items);
		},
	);

	// GET /alerts — сводка по дефициту с автоопределением orgId
	server.get("/alerts", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"inventory alerts read",
		);
		if (!resolvedOrgId) return;

		const items = await inventoryQuery.getInventoryItems(resolvedOrgId);
		return calculateAlertsFromItems(items);
	});
};
