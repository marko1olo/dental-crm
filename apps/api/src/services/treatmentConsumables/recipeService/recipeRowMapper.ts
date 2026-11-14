/**
 * recipeRowMapper.ts — Layer 1: Helper mapping joined procedureMaterialRules row to ConsumableLinkDetailed.
 */

import type { ConsumableLinkDetailed } from "@dental/shared";

export interface ConsumableLinkJoinedRow {
	id: string;
	organizationId?: string | null | undefined;
	serviceId?: string | null | undefined;
	inventoryItemId?: string | null | undefined;
	quantityToDeduct?: number | string | null | undefined;
	requiredQty?: number | string | null | undefined;
	createdAt?: Date | string | null | undefined;
	serviceCode?: string | null | undefined;
	serviceTitle?: string | null | undefined;
	serviceCategory?: string | null | undefined;
	specialty?: string | null | undefined;
	itemName?: string | null | undefined;
	itemCategory?: string | null | undefined;
	itemUnit?: string | null | undefined;
	stockQuantity?: number | string | null | undefined;
	unitCostRub?: number | string | null | undefined;
	criticalThreshold?: number | string | null | undefined;
}

export function mapRowToLinkDetailed(
	r: ConsumableLinkJoinedRow,
	defaultOrgId: string,
): ConsumableLinkDetailed {
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
		serviceTitle: r.serviceTitle || "Без названия",
		serviceCategory: r.serviceCategory,
		specialty: r.specialty,
		itemName: r.itemName || "Расходный материал",
		itemCategory: r.itemCategory,
		itemUnit: r.itemUnit,
		stockQuantity: stock,
		unitCostRub: cost,
		criticalThreshold: threshold,
		totalCostRub: Number((qty * cost).toFixed(2)),
		isLowStock: stock <= threshold,
	};
}
