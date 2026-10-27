/**
 * @file procedureBomDefaultFallback.ts
 * Резервный поиск техкарт в эталонных каталогах 804н (Мандат 8b).
 */

import { and, eq, or, sql } from "drizzle-orm";
import { inventoryItems } from "../../../db/schema/inventory.js";
import { DEFAULT_804N_CONSUMABLE_LINKS } from "@dental/shared";
import { DEFAULT_804N_BOM_SEEDS } from "../bomSeeds/registry.js";
import type { DbTransaction } from "./types.js";
import type { ServiceMeta } from "./procedureBomDbResolver.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveDefaultFallbackItems(
	tx: DbTransaction,
	organizationId: string,
	serviceId: string,
	meta: ServiceMeta,
	serviceQuantity: number,
): Promise<Array<{ inventoryItemId: string; quantity: number }>> {
	const itemsToDeduct: Array<{ inventoryItemId: string; quantity: number }> = [];
	const safeServiceId = (serviceId || "").toLowerCase();

	const proto = DEFAULT_804N_BOM_SEEDS.find(
		(s) =>
			s.serviceCode === meta.serviceCode ||
			(meta.order804nCode && s.serviceCode === meta.order804nCode) ||
			(meta.serviceTitle && s.serviceTitle?.toLowerCase() === meta.serviceTitle.toLowerCase()) ||
			(meta.serviceTitle && s.serviceTitle && meta.serviceTitle.toLowerCase().includes(s.serviceTitle.toLowerCase())) ||
			s.serviceCode === serviceId ||
			(safeServiceId && s.serviceTitle?.toLowerCase() === safeServiceId),
	);

	if (proto) {
		for (const mat of proto.materials) {
			const [existing] = await tx
				.select({ id: inventoryItems.id })
				.from(inventoryItems)
				.where(and(eq(inventoryItems.organizationId, organizationId), sql`lower(${inventoryItems.name}) = lower(${mat.name})`))
				.limit(1);

			let targetItemId = existing?.id;
			if (!targetItemId) {
				const [created] = await tx
					.insert(inventoryItems)
					.values({
						organizationId,
						name: mat.name,
						category: mat.category,
						unit: mat.unit,
						stockQuantity: "0",
						currentQty: "0",
						criticalThreshold: String(mat.criticalThreshold),
						unitCostRub: String(mat.defaultUnitCostRub),
					})
					.returning({ id: inventoryItems.id });
				targetItemId = created?.id;
			}

			if (targetItemId) {
				itemsToDeduct.push({ inventoryItemId: targetItemId, quantity: mat.quantityToDeduct * serviceQuantity });
			}
		}
		return itemsToDeduct;
	}

	const matchingLinks = DEFAULT_804N_CONSUMABLE_LINKS.filter(
		(l) =>
			l.service804nCode === meta.serviceCode ||
			(meta.order804nCode && l.service804nCode === meta.order804nCode) ||
			(meta.serviceTitle && l.serviceTitle?.toLowerCase() === meta.serviceTitle.toLowerCase()) ||
			l.service804nCode === serviceId,
	);

	for (const link of matchingLinks) {
		const [existing] = await tx
			.select({ id: inventoryItems.id })
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.organizationId, organizationId),
					or(eq(inventoryItems.id, link.inventoryItemId), sql`lower(${inventoryItems.name}) = lower(${link.itemName})`),
				),
			)
			.limit(1);

		let targetItemId = existing?.id;
		if (!targetItemId) {
			const isLinkUuid = UUID_REGEX.test(link.inventoryItemId);
			const [created] = await tx
				.insert(inventoryItems)
				.values({
					...(isLinkUuid ? { id: link.inventoryItemId } : {}),
					organizationId,
					name: link.itemName,
					category: link.category,
					unit: link.unit,
					stockQuantity: "0",
					currentQty: "0",
					criticalThreshold: "5",
					unitCostRub: String((link.costPriceKopecks / 100).toFixed(2)),
				})
				.returning({ id: inventoryItems.id });
			targetItemId = created?.id;
		}

		if (targetItemId) {
			itemsToDeduct.push({ inventoryItemId: targetItemId, quantity: link.quantityPerService * serviceQuantity });
		}
	}

	return itemsToDeduct;
}
