/**
 * @file seedHelpers.ts
 * Вспомогательные функции загрузки карт услуг и материалов для идемпотентного сидинга (Мандат 8b).
 */

import { eq } from "drizzle-orm";
import { withTenantReadCtx, type TenantDb } from "../../../db/rls.js";
import {
	inventoryItems,
	procedureMaterialRules,
	serviceCatalogItems,
} from "../../../db/schema.js";

export async function loadSeedMaps(organizationId: string, executor?: TenantDb) {
	const run = async (tx: TenantDb) => {
		const existingServices = await tx
			.select()
			.from(serviceCatalogItems)
			.where(eq(serviceCatalogItems.organizationId, organizationId));

		const serviceMap = new Map<string, typeof serviceCatalogItems.$inferSelect>();
		for (const s of existingServices) {
			if (s.code) serviceMap.set(s.code.trim(), s);
		}

		const existingItems = await tx
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.organizationId, organizationId));

		const itemMap = new Map<string, typeof inventoryItems.$inferSelect>();
		for (const it of existingItems) {
			itemMap.set(it.name.toLowerCase().trim(), it);
		}

		const existingRules = await tx
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
	};

	return executor ? await run(executor) : await withTenantReadCtx(organizationId, run);
}
