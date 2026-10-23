/**
 * recipeForService.ts — Layer 2: Service recipe calculation and consumable links retrieval.
 */

import { calculateRecipeEstimatedCost } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { serviceCatalogItems } from "../../../db/schema.js";
import { type DbExecutor, TreatmentConsumablesServiceError } from "../types.js";
import { listLinks } from "./recipeQueries.js";

export async function getRecipeForService(
	executor: DbExecutor,
	organizationId: string,
	serviceId: string,
) {
	const [service] = await executor
		.select()
		.from(serviceCatalogItems)
		.where(
			and(
				eq(serviceCatalogItems.id, serviceId),
				eq(serviceCatalogItems.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!service) {
		throw new TreatmentConsumablesServiceError("Услуга не найдена в прейскуранте", 404, "ServiceNotFound");
	}

	const { items: consumables } = await listLinks(executor, organizationId, { serviceId, pageSize: 100 });
	const totalEstimatedCostRub = calculateRecipeEstimatedCost(
		consumables.map((c) => ({ quantity: c.quantity, unitCostRub: c.unitCostRub })),
	);

	return {
		service: {
			id: service.id,
			code: service.code,
			title: service.title,
			category: service.category,
			priceRub: Number(service.priceRub ?? service.basePriceRub ?? 0),
		},
		consumables,
		totalEstimatedCostRub,
	};
}
