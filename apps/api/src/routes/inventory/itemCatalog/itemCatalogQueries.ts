import type { FastifyInstance } from "fastify";
import { kopecksToRubles, resolveCostKopecks } from "@dental/shared";
import { defineTenantQuery } from "../../../core/routeFactories.js";
import {
	inventoryQuery,
	serializeInventoryItem,
	type SerializedInventoryItem,
} from "../../../db/inventoryQuery.js";
import type { inventoryItems } from "../../../db/schema.js";
import {
	formatDateIsoInTimeZone,
	resolveClinicTimeZone,
} from "../../payrollModules/payrollTypesAndQueries.js";
import { ReorderSuggestionService } from "../../../services/reorderSuggestionService.js";

const INVENTORY_READ_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowUnverifiedHeaderRead: true,
} as const;

export const calculateAlertsFromItems = (
	items: Array<typeof inventoryItems.$inferSelect>,
	timeZone: string = "Europe/Moscow",
) => {
	const now = new Date();
	const todayStr = formatDateIsoInTimeZone(now, timeZone);
	const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	const in30DaysStr = formatDateIsoInTimeZone(in30Days, timeZone);

	const lowStockItems: SerializedInventoryItem[] = [];
	const outOfStockItems: SerializedInventoryItem[] = [];
	const expiredItems: SerializedInventoryItem[] = [];
	const expiringSoonItems: SerializedInventoryItem[] = [];

	let totalValuationKopecks = 0n;

	for (const rawItem of items) {
		const item = serializeInventoryItem(rawItem);
		const stock = Number(item.stockQuantity ?? 0);
		const threshold = Number(item.criticalThreshold ?? 0);
		const costKopecks = Number(
			resolveCostKopecks(
				item.unitCostKopecks,
				item.unitCostRub,
				item.pricePerUnitKopecks,
				item.pricePerUnit,
			),
		);

		if (Number.isFinite(stock) && stock > 0 && costKopecks > 0) {
			const lineValuationKopecks = BigInt(Math.round(stock * costKopecks));
			totalValuationKopecks += lineValuationKopecks;
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
			totalValuationRub: kopecksToRubles(totalValuationKopecks),
			totalValuationKopecks: Number(totalValuationKopecks),
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
	defineTenantQuery(server, {
		path: "/:organizationId",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId } = request.params as { organizationId?: string };
			const effectiveOrgId =
				!organizationId || organizationId === "current" || organizationId === "items"
					? resolvedOrgId
					: organizationId;
			if (resolvedOrgId !== effectiveOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await inventoryQuery.getInventoryItems(effectiveOrgId, tx);
			return items.map(serializeInventoryItem);
		},
	});

	// GET /:organizationId/items — alias for inventory read
	defineTenantQuery(server, {
		path: "/:organizationId/items",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId } = request.params as { organizationId: string };
			const effectiveOrgId =
				organizationId === "current" || organizationId === "items"
					? resolvedOrgId
					: organizationId;
			if (resolvedOrgId !== effectiveOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await inventoryQuery.getInventoryItems(effectiveOrgId, tx);
			return reply.send(items.map(serializeInventoryItem));
		},
	});

	// GET /items — автоопределение orgId из сессии (Zero Dead-Ends SSOT)
	defineTenantQuery(server, {
		path: "/items",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, reply }) => {
			const items = await inventoryQuery.getInventoryItems(resolvedOrgId, tx);
			return reply.send(items.map(serializeInventoryItem));
		},
	});

	// GET /:organizationId/stock — алиас реестра остатков для складского модуля
	defineTenantQuery(server, {
		path: "/:organizationId/stock",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId } = request.params as { organizationId: string };
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await inventoryQuery.getInventoryItems(organizationId, tx);
			return items.map(serializeInventoryItem);
		},
	});

	// GET /stock — автоопределение orgId
	defineTenantQuery(server, {
		path: "/stock",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId }) => {
			const items = await inventoryQuery.getInventoryItems(resolvedOrgId, tx);
			return items.map(serializeInventoryItem);
		},
	});

	// GET /reorder-suggestions — Предиктивные рекомендации к закупкам (DentalPin Reorder Point)
	defineTenantQuery(server, {
		path: "/reorder-suggestions",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const query = request.query as { onlyNeedingReorder?: string | boolean };
			const onlyNeedingReorder =
				query.onlyNeedingReorder === "true" ||
				query.onlyNeedingReorder === true;

			const suggestions = await ReorderSuggestionService.getSuggestions(
				resolvedOrgId,
				{ onlyNeedingReorder, tx },
			);
			return reply.status(200).send(suggestions);
		},
	});

	// GET /:organizationId/alerts — сводка по дефициту и срокам годности материалов
	defineTenantQuery(server, {
		path: "/:organizationId/alerts",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const { organizationId } = request.params as { organizationId: string };
			const effectiveOrgId =
				organizationId === "current" || organizationId === "alerts"
					? resolvedOrgId
					: organizationId;
			if (resolvedOrgId !== effectiveOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const [items, timeZone] = await Promise.all([
				inventoryQuery.getInventoryItems(effectiveOrgId, tx),
				resolveClinicTimeZone(tx, effectiveOrgId),
			]);
			return calculateAlertsFromItems(items, timeZone);
		},
	});

	// GET /alerts — сводка по дефициту с автоопределением orgId
	defineTenantQuery(server, {
		path: "/alerts",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId }) => {
			const [items, timeZone] = await Promise.all([
				inventoryQuery.getInventoryItems(resolvedOrgId, tx),
				resolveClinicTimeZone(tx, resolvedOrgId),
			]);
			return calculateAlertsFromItems(items, timeZone);
		},
	});
};
