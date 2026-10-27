/**
 * @file seedHelpers.ts
 * Вспомогательные функции загрузки карт услуг и материалов для идемпотентного сидинга (Мандат 8b).
 */

import { eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	inventoryItems,
	procedureMaterialRules,
	serviceCatalogItems,
} from "../../../db/schema.js";

export async function loadSeedMaps(organizationId: string) {
	const existingServices = await db
		.select()
		.from(serviceCatalogItems)
		.where(eq(serviceCatalogItems.organizationId, organizationId));

	const serviceMap = new Map<string, typeof serviceCatalogItems.$inferSelect>();
	for (const s of existingServices) {
		if (s.code) serviceMap.set(s.code.trim(), s);
	}

	const existingItems = await db
		.select()
		.from(inventoryItems)
		.where(eq(inventoryItems.organizationId, organizationId));

	const itemMap = new Map<string, typeof inventoryItems.$inferSelect>();
	for (const it of existingItems) {
		itemMap.set(it.name.toLowerCase().trim(), it);
	}

	const existingRules = await db
		.select()
		.from(procedureMaterialRules)
		.where(eq(procedureMaterialRules.organizationId, organizationId));

	const ruleSet = new Set<string>();
	for (const r of existingRules) {
		if (r.serviceId && r.inventoryItemId) {
			ruleSet.add(`${r.serviceId}:${r.inventoryItemId}`);
		}
	}

	return { serviceMap, itemMap, ruleSet };
}
