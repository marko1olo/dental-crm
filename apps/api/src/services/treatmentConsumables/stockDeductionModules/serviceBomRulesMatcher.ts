/**
 * serviceBomRulesMatcher.ts — Layer 1/2: Multi-tier service metadata & Bill-of-Materials (BOM) resolution.
 * Matches clinical services to DB BOM rules and statutory consumable norms.
 * Decomposed in accordance with Mandate 8b (<= 120 lines SSOT).
 */

import { and, eq } from "drizzle-orm";
import { inventoryItems } from "../../../db/schema/inventory.js";
import type { DbExecutor } from "../types.js";
import { isPureUuid, type RawRequiredMaterial, type ServiceDescriptor } from "./stockDeductionTypes.js";
import { resolveServicesMetadata } from "./serviceMetadataResolver.js";
import { findDbProcedureItems } from "../../inventory/fefoModules/procedureBomResolver.js";
import { resolveStatutoryBomForService } from "./statutoryBomResolver.js";

export { resolveServicesMetadata };

export async function resolveRequiredMaterialsForServices(
	tx: DbExecutor,
	organizationId: string,
	services: Array<{ serviceToken: string; quantity: number }>,
	serviceMetadataMap: Map<string, ServiceDescriptor>,
): Promise<RawRequiredMaterial[]> {
	const materials: RawRequiredMaterial[] = [];

	for (const srv of services) {
		const srvQty = srv.quantity > 0 ? srv.quantity : 1;
		const meta = serviceMetadataMap.get(srv.serviceToken) ?? {
			rawToken: srv.serviceToken,
			serviceId: isPureUuid(srv.serviceToken) ? srv.serviceToken : null,
			serviceCode: isPureUuid(srv.serviceToken) ? null : srv.serviceToken,
			order804nCode: isPureUuid(srv.serviceToken) ? null : srv.serviceToken,
			title: null,
		};

		const targetServiceId = meta.serviceId || meta.rawToken || "";
		const serviceMeta = {
			serviceCode: meta.serviceCode || meta.rawToken || "",
			serviceTitle: meta.title || "",
			order804nCode: meta.order804nCode || "",
		};

		const dbItems = await findDbProcedureItems(
			tx,
			organizationId,
			targetServiceId,
			serviceMeta,
			srvQty,
		);
		if (dbItems && dbItems.length > 0) {
			for (const ci of dbItems) {
				let effectiveItemId = ci.inventoryItemId;

				// Если указан клинический аналог и базового материала не хватает на складе
				if (ci.alternativeInventoryItemId) {
					const [baseItem] = await tx
						.select({
							stockQuantity: inventoryItems.stockQuantity,
							currentQty: inventoryItems.currentQty,
						})
						.from(inventoryItems)
						.where(
							and(
								eq(inventoryItems.id, ci.inventoryItemId),
								eq(inventoryItems.organizationId, organizationId),
							),
						)
						.limit(1);

					const baseStock = Number(baseItem?.stockQuantity ?? baseItem?.currentQty ?? 0);
					if (baseStock < ci.quantity) {
						// Базового материала нет или дефицит: проверяем наличие аналога
						const [altItem] = await tx
							.select({
								id: inventoryItems.id,
								name: inventoryItems.name,
								stockQuantity: inventoryItems.stockQuantity,
								currentQty: inventoryItems.currentQty,
							})
							.from(inventoryItems)
							.where(
								and(
									eq(inventoryItems.id, ci.alternativeInventoryItemId),
									eq(inventoryItems.organizationId, organizationId),
								),
							)
							.limit(1);

						const altStock = Number(altItem?.stockQuantity ?? altItem?.currentQty ?? 0);
						if (altStock >= ci.quantity || altStock > 0) {
							effectiveItemId = ci.alternativeInventoryItemId;
						}
					}
				}

				materials.push({
					key: effectiveItemId,
					quantity: ci.quantity,
					unit: ci.unit || "pcs",
					name: ci.name,
					isMdlpRequired: ci.isMdlpRequired,
					alternativeInventoryItemId: ci.alternativeInventoryItemId,
					isOptional: ci.isOptional,
				});
			}
			continue;
		}

		const statutoryMaterials = resolveStatutoryBomForService(meta, srvQty);
		if (statutoryMaterials.length > 0) {
			materials.push(...statutoryMaterials);
		}
	}

	return materials;
}
