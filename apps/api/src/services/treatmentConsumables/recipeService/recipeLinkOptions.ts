/**
 * recipeLinkOptions.ts — Layer 2: Picker options queries for services and inventory items.
 */

import { kopecksToRubles, rublesToKopecks, type LinkOptionsItem, type LinkOptionsResponse, type LinkOptionsTreatment } from "@dental/shared";
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
			priceKopecks: serviceCatalogItems.priceKopecks,
			basePriceKopecks: serviceCatalogItems.basePriceKopecks,
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
			unitCostKopecks: inventoryItems.unitCostKopecks,
			pricePerUnitKopecks: inventoryItems.pricePerUnitKopecks,
			expirationDate: inventoryItems.expirationDate,
		})
		.from(inventoryItems)
		.where(and(...itemConditions))
		.orderBy(inventoryItems.name)
		.limit(limit);

	return {
		treatments: services.map((s): LinkOptionsTreatment => {
			const primaryKop =
				s.priceKopecks != null && Number(s.priceKopecks) !== 0
					? Number(s.priceKopecks)
					: s.basePriceKopecks != null && Number(s.basePriceKopecks) !== 0
						? Number(s.basePriceKopecks)
						: null;
			const resolvedKop =
				primaryKop ?? rublesToKopecks(Number(s.priceRub ?? s.basePriceRub ?? 0));
			return {
				id: s.id,
				name: s.title,
				code: s.code,
				category: s.category,
				priceKopecks: resolvedKop,
				priceRub: kopecksToRubles(resolvedKop),
			};
		}),
		items: items.map((i): LinkOptionsItem => {
			const primaryUnitKop =
				i.unitCostKopecks != null && Number(i.unitCostKopecks) !== 0
					? Number(i.unitCostKopecks)
					: i.pricePerUnitKopecks != null && Number(i.pricePerUnitKopecks) !== 0
						? Number(i.pricePerUnitKopecks)
						: null;
			const resolvedUnitKop =
				primaryUnitKop ?? rublesToKopecks(Number(i.unitCostRub ?? 0));
			return {
				id: i.id,
				name: i.name,
				unit: i.unit,
				category: i.category,
				stockQuantity: Number(i.stockQuantity ?? 0),
				unitCostKopecks: resolvedUnitKop,
				unitCostRub: kopecksToRubles(resolvedUnitKop),
				expirationDate: i.expirationDate,
			};
		}),
	};
}
