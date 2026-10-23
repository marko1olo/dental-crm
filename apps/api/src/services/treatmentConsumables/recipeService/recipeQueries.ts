/**
 * recipeQueries.ts — Layer 2: Read queries for consumable links.
 */

import type { ConsumableLinkDetailed } from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { inventoryItems, procedureMaterialRules, serviceCatalogItems } from "../../../db/schema.js";
import type { DbExecutor } from "../types.js";
import { mapRowToLinkDetailed } from "./recipeRowMapper.js";

const LINK_SELECT_FIELDS = {
	id: procedureMaterialRules.id,
	organizationId: procedureMaterialRules.organizationId,
	serviceId: procedureMaterialRules.serviceId,
	inventoryItemId: procedureMaterialRules.inventoryItemId,
	quantityToDeduct: procedureMaterialRules.quantityToDeduct,
	requiredQty: procedureMaterialRules.requiredQty,
	createdAt: procedureMaterialRules.createdAt,
	serviceCode: serviceCatalogItems.code,
	serviceTitle: serviceCatalogItems.title,
	serviceCategory: serviceCatalogItems.category,
	specialty: serviceCatalogItems.specialty,
	itemName: inventoryItems.name,
	itemCategory: inventoryItems.category,
	itemUnit: inventoryItems.unit,
	stockQuantity: inventoryItems.stockQuantity,
	unitCostRub: inventoryItems.unitCostRub,
	criticalThreshold: inventoryItems.criticalThreshold,
};

export async function listLinks(
	executor: DbExecutor,
	organizationId: string,
	options: {
		serviceId?: string | undefined;
		inventoryItemId?: string | undefined;
		page?: number | undefined;
		pageSize?: number | undefined;
	} = {},
): Promise<{ items: ConsumableLinkDetailed[]; total: number; page: number; pageSize: number }> {
	const page = Math.max(1, options.page ?? 1);
	const pageSize = Math.max(1, Math.min(100, options.pageSize ?? 50));
	const offset = (page - 1) * pageSize;

	const conditions = [
		eq(procedureMaterialRules.organizationId, organizationId),
		eq(inventoryItems.organizationId, organizationId),
		eq(serviceCatalogItems.organizationId, organizationId),
	];
	if (options.serviceId) conditions.push(eq(procedureMaterialRules.serviceId, options.serviceId));
	if (options.inventoryItemId) conditions.push(eq(procedureMaterialRules.inventoryItemId, options.inventoryItemId));

	const [countResult] = await executor
		.select({ count: sql<number>`count(*)::int` })
		.from(procedureMaterialRules)
		.innerJoin(serviceCatalogItems, eq(procedureMaterialRules.serviceId, serviceCatalogItems.id))
		.innerJoin(inventoryItems, eq(procedureMaterialRules.inventoryItemId, inventoryItems.id))
		.where(and(...conditions));

	const total = Number(countResult?.count ?? 0);

	const rows = await executor
		.select(LINK_SELECT_FIELDS)
		.from(procedureMaterialRules)
		.innerJoin(serviceCatalogItems, eq(procedureMaterialRules.serviceId, serviceCatalogItems.id))
		.innerJoin(inventoryItems, eq(procedureMaterialRules.inventoryItemId, inventoryItems.id))
		.where(and(...conditions))
		.orderBy(serviceCatalogItems.title, inventoryItems.name)
		.limit(pageSize)
		.offset(offset);

	return { items: rows.map((r) => mapRowToLinkDetailed(r, organizationId)), total, page, pageSize };
}

export async function getLink(executor: DbExecutor, organizationId: string, linkId: string): Promise<ConsumableLinkDetailed | null> {
	const [row] = await executor
		.select(LINK_SELECT_FIELDS)
		.from(procedureMaterialRules)
		.innerJoin(serviceCatalogItems, eq(procedureMaterialRules.serviceId, serviceCatalogItems.id))
		.innerJoin(inventoryItems, eq(procedureMaterialRules.inventoryItemId, inventoryItems.id))
		.where(
			and(
				eq(procedureMaterialRules.id, linkId),
				eq(procedureMaterialRules.organizationId, organizationId),
				eq(inventoryItems.organizationId, organizationId),
				eq(serviceCatalogItems.organizationId, organizationId),
			),
		)
		.limit(1);

	return row ? mapRowToLinkDetailed(row, organizationId) : null;
}
