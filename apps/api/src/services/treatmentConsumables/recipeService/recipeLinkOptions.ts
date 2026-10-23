/**
 * recipeLinkOptions.ts — Layer 2: Picker options queries for services and inventory items.
 */

import type { LinkOptionsItem, LinkOptionsResponse, LinkOptionsTreatment } from "@dental/shared";
import { and, eq, ilike, or } from "drizzle-orm";
import { inventoryItems, serviceCatalogItems } from "../../../db/schema.js";
import type { DbExecutor } from "../types.js";

export async function getLinkOptions(
	executor: DbExecutor,
	organizationId: string,
	query?: string,
	limit = 30,
): Promise<LinkOptionsResponse> {
	const trimmedQuery = query?.trim() || "";

	const serviceConditions = [eq(serviceCatalogItems.organizationId, organizationId), eq(serviceCatalogItems.isActive, true)];
	if (trimmedQuery) {
		serviceConditions.push(
			or(
				ilike(serviceCatalogItems.title, `%${trimmedQuery}%`),
				ilike(serviceCatalogItems.code, `%${trimmedQuery}%`),
			)!,
		);
	}

	const services = await executor
		.select({
			id: serviceCatalogItems.id,
			title: serviceCatalogItems.title,
			code: serviceCatalogItems.code,
			category: serviceCatalogItems.category,
			priceRub: serviceCatalogItems.priceRub,
			basePriceRub: serviceCatalogItems.basePriceRub,
		})
		.from(serviceCatalogItems)
		.where(and(...serviceConditions))
		.orderBy(serviceCatalogItems.title)
		.limit(limit);

	const itemConditions = [eq(inventoryItems.organizationId, organizationId)];
	if (trimmedQuery) {
		itemConditions.push(
			or(
				ilike(inventoryItems.name, `%${trimmedQuery}%`),
				ilike(inventoryItems.category, `%${trimmedQuery}%`),
				ilike(inventoryItems.sku, `%${trimmedQuery}%`),
				ilike(inventoryItems.barcode, `%${trimmedQuery}%`),
			)!,
		);
	}

	const items = await executor
		.select({
			id: inventoryItems.id,
			name: inventoryItems.name,
			unit: inventoryItems.unit,
			category: inventoryItems.category,
			stockQuantity: inventoryItems.stockQuantity,
			unitCostRub: inventoryItems.unitCostRub,
			expirationDate: inventoryItems.expirationDate,
		})
		.from(inventoryItems)
		.where(and(...itemConditions))
		.orderBy(inventoryItems.name)
		.limit(limit);

	return {
		treatments: services.map(
			(s): LinkOptionsTreatment => ({
				id: s.id,
				name: s.title,
				code: s.code,
				category: s.category,
				priceRub: Number(s.priceRub ?? s.basePriceRub ?? 0),
			}),
		),
		items: items.map(
			(i): LinkOptionsItem => ({
				id: i.id,
				name: i.name,
				unit: i.unit,
				category: i.category,
				stockQuantity: Number(i.stockQuantity ?? 0),
				unitCostRub: Number(i.unitCostRub ?? 0),
				expirationDate: i.expirationDate,
			}),
		),
	};
}
