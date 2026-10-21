/**
 * apps/web/src/components/treatment-plans/materialEngine/inventoryMatching.ts
 *
 * Сопоставление требуемых клинических материалов со складскими остатками клиники.
 */

import type { ProcedureMaterialNorm } from "../types";
import { THERAPY_MATERIAL_NORMS } from "../treatmentPlanTherapyNorms";
import { SURGICAL_MATERIAL_NORMS } from "../treatmentPlanSurgicalNorms";

export interface InventoryItemLookup {
	readonly id: string;
	readonly name: string;
	readonly stockQuantity: number;
	readonly criticalThreshold?: number;
	readonly unitCostRub: string | number;
	readonly sku?: string;
	readonly barcode?: string;
	readonly lotNumber?: string;
	readonly expirationDate?: string;
}

export const ORDER_804N_MATERIAL_NORMS_MAP: Record<string, readonly ProcedureMaterialNorm[]> = {
	...THERAPY_MATERIAL_NORMS,
	...SURGICAL_MATERIAL_NORMS,
};

export function matchMaterialToInventoryItem(
	materialName: string,
	inventoryItems?: readonly InventoryItemLookup[],
): InventoryItemLookup | undefined {
	if (!inventoryItems || inventoryItems.length === 0) return undefined;

	const search = materialName.toLowerCase().trim();
	const words = search.split(/\s+/).filter((w) => w.length > 3);

	const exact = inventoryItems.find((it) => it.name.toLowerCase().trim() === search);
	if (exact) return exact;

	return inventoryItems.find((it) => {
		const n = it.name.toLowerCase();
		return words.some((w) => n.includes(w));
	});
}
