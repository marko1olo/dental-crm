/**
 * @file seedRunner.ts
 * Идемпотентный сидер дефолтных технологических карт (BOM) расхода материалов (Мандат 8b).
 */

import { eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	inventoryItems,
	procedureMaterialRules,
	serviceCatalogItems,
} from "../../../db/schema.js";
import { DEFAULT_804N_BOM_SEEDS } from "./registry.js";
import { loadSeedMaps } from "./seedHelpers.js";
import type { SeedDefaultBomResult } from "./types.js";

export async function seedDefaultProcedureMaterialRules(
	organizationId: string,
): Promise<SeedDefaultBomResult> {
	let createdServicesCount = 0;
	let createdItemsCount = 0;
	let createdRulesCount = 0;

	const { serviceMap, itemMap, ruleSet } = await loadSeedMaps(organizationId);

	for (const proto of DEFAULT_804N_BOM_SEEDS) {
		let service = serviceMap.get(proto.serviceCode);

		if (!service) {
			const [newService] = await db
				.insert(serviceCatalogItems)
				.values({
					organizationId,
					code: proto.serviceCode,
					title: proto.serviceTitle,
					category: proto.serviceCategory,
					specialty: proto.specialty,
					basePriceRub: proto.basePriceRub,
					priceRub: proto.basePriceRub,
					durationMinutes: proto.durationMinutes,
					taxDeductible: true,
					order804nCode: proto.serviceCode,
					isActive: true,
				})
				.returning();

			if (newService) {
				service = newService;
				serviceMap.set(proto.serviceCode, newService);
				createdServicesCount++;
			}
		}

		if (!service) continue;

		for (const mat of proto.materials) {
			const matKey = mat.name.toLowerCase().trim();
			let item = itemMap.get(matKey);

			if (!item) {
				const [newItem] = await db
					.insert(inventoryItems)
					.values({
						organizationId,
						name: mat.name,
						category: mat.category,
						unit: mat.unit,
						unitCostRub: String(mat.defaultUnitCostRub),
						stockQuantity: String(mat.defaultStockQty),
						currentQty: String(mat.defaultStockQty),
						criticalThreshold: String(mat.criticalThreshold),
					})
					.returning();

				if (newItem) {
					item = newItem;
					itemMap.set(matKey, newItem);
					createdItemsCount++;
				}
			}

			if (!item) continue;

			const ruleKey = `${service.id}:${item.id}`;
			if (!ruleSet.has(ruleKey)) {
				const [newRule] = await db
					.insert(procedureMaterialRules)
					.values({
						organizationId,
						serviceId: service.id,
						inventoryItemId: item.id,
						serviceCode: proto.serviceCode,
						materialItemId: item.id,
						materialName: item.name,
						quantityToDeduct: String(mat.quantityToDeduct),
						requiredQty: String(mat.quantityToDeduct),
					})
					.returning();

				if (newRule) {
					ruleSet.add(ruleKey);
					createdRulesCount++;
				}
			}
		}
	}

	const totalRules = await db
		.select()
		.from(procedureMaterialRules)
		.where(eq(procedureMaterialRules.organizationId, organizationId));

	return {
		createdServicesCount,
		createdItemsCount,
		createdRulesCount,
		totalRulesCount: totalRules.length,
	};
}
