/**
 * bomDeductionCalculator.ts — Batch BOM Deduction Calculator & Service BOM Link Resolver.
 * Mandate 8e & 8n: Doctor Autonomy & Soft Negative Stock.
 * Mandate 8b: Strictly <= 120 lines.
 */

import type { ConsumableItemLink } from "../consumableModules/consumableTypes.js";
import type {
	BatchProcedureBomSummary,
	CalculatedBomConsumableDeduction,
	ProcedureBomDeductionRequestItem,
} from "./bomTypes.js";
import { HYGIENE_BOM_LINKS } from "./hygieneBoms.js";
import { ORTHODONTIC_BOM_LINKS } from "./orthodonticBoms.js";
import { ORTHOPEDIC_BOM_LINKS } from "./orthopedicBoms.js";
import { SURGICAL_BOM_LINKS } from "./surgicalBoms.js";
import { THERAPEUTIC_BOM_LINKS } from "./therapeuticBoms.js";

export const DEFAULT_SERVICE_CONSUMABLE_LINKS: readonly ConsumableItemLink[] = [
	...SURGICAL_BOM_LINKS.slice(0, 3),
	...THERAPEUTIC_BOM_LINKS.slice(0, 14),
	...SURGICAL_BOM_LINKS.slice(3, 9),
	...HYGIENE_BOM_LINKS.slice(0, 4),
	...THERAPEUTIC_BOM_LINKS.slice(14, 15),
	...HYGIENE_BOM_LINKS.slice(4),
	...SURGICAL_BOM_LINKS.slice(9, 14),
	...ORTHODONTIC_BOM_LINKS.slice(0, 2),
	...ORTHOPEDIC_BOM_LINKS,
	...THERAPEUTIC_BOM_LINKS.slice(15, 17),
	...THERAPEUTIC_BOM_LINKS.slice(17),
	...ORTHODONTIC_BOM_LINKS.slice(2),
	...SURGICAL_BOM_LINKS.slice(14),
];

export const DEFAULT_804N_CONSUMABLE_LINKS = DEFAULT_SERVICE_CONSUMABLE_LINKS;

export function getDefaultBomLinksForService(serviceCode: string): readonly ConsumableItemLink[] {
	if (!serviceCode) return [];
	const trimmed = serviceCode.trim();
	const exactMatches = DEFAULT_SERVICE_CONSUMABLE_LINKS.filter(
		(l) => l.service804nCode === trimmed,
	);
	if (exactMatches.length > 0) return exactMatches;

	const parts = trimmed.split(".");
	if (parts.length > 3) {
		const baseCode = parts.slice(0, 3).join(".");
		return DEFAULT_SERVICE_CONSUMABLE_LINKS.filter(
			(l) => l.service804nCode === baseCode,
		);
	}
	return [];
}

export const getDefaultBomLinksForService804n = getDefaultBomLinksForService;

export function calculateBatchBomDeduction(
	requests: readonly ProcedureBomDeductionRequestItem[],
): BatchProcedureBomSummary {
	const itemMap = new Map<string, CalculatedBomConsumableDeduction>();
	let totalCostPriceKopecks = 0;

	for (const req of requests) {
		const qty = req.quantity ?? 1;
		const links = getDefaultBomLinksForService(req.serviceCode);
		for (const link of links) {
			const consumedQty = link.quantityPerService * qty;
			const consumedCost = Math.round(link.costPriceKopecks * qty);
			totalCostPriceKopecks += consumedCost;

			const existing = itemMap.get(link.inventoryItemId);
			if (existing) {
				itemMap.set(link.inventoryItemId, {
					...existing,
					totalQuantity: Number((existing.totalQuantity + consumedQty).toFixed(4)),
					totalCostPriceKopecks: existing.totalCostPriceKopecks + consumedCost,
				});
			} else {
				itemMap.set(link.inventoryItemId, {
					inventoryItemId: link.inventoryItemId,
					itemName: link.itemName,
					category: link.category ?? "other",
					unit: link.unit,
					totalQuantity: Number(consumedQty.toFixed(4)),
					unitCostPriceKopecks: link.costPriceKopecks,
					totalCostPriceKopecks: consumedCost,
					isMandatory: link.isMandatory ?? true,
					notes: link.notes,
				});
			}
		}
	}

	return {
		totalServicesCount: requests.length,
		totalMaterialsCount: itemMap.size,
		totalCostPriceKopecks,
		items: Array.from(itemMap.values()),
		softNegativeStockAllowed: true,
	};
}
