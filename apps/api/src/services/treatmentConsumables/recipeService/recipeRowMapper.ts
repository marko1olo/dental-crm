/**
 * recipeRowMapper.ts — Layer 1: Helper mapping joined procedureMaterialRules row to ConsumableLinkDetailed.
 */

import type { ConsumableLinkDetailed } from "@dental/shared";

export function mapRowToLinkDetailed(r: any, defaultOrgId: string): ConsumableLinkDetailed {
	const qty = Number(r.quantityToDeduct ?? r.requiredQty ?? 1);
	const stock = Number(r.stockQuantity ?? 0);
	const cost = Number(r.unitCostRub ?? 0);
	const threshold = Number(r.criticalThreshold ?? 0);
	return {
		id: r.id,
		organizationId: r.organizationId ?? defaultOrgId,
		serviceId: r.serviceId ?? "",
		inventoryItemId: r.inventoryItemId ?? "",
		quantity: qty,
		note: null,
		createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
		serviceCode: r.serviceCode,
		serviceTitle: r.serviceTitle,
		serviceCategory: r.serviceCategory,
		specialty: r.specialty,
		itemName: r.itemName,
		itemCategory: r.itemCategory,
		itemUnit: r.itemUnit,
		stockQuantity: stock,
		unitCostRub: cost,
		criticalThreshold: threshold,
		totalCostRub: Number((qty * cost).toFixed(2)),
		isLowStock: stock <= threshold,
	};
}
