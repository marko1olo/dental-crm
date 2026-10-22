import {
	CANONICAL_PROCEDURE_RECIPES,
	formatInventoryUnitRu,
} from "@dental/shared";
import type { ProcedureMaterialRuleViewItem } from "./materialBomTypes.js";

/**
 * Builds canonical clinical fallback BOM rules using CANONICAL_PROCEDURE_RECIPES SSOT.
 */
export function buildCanonicalFallbackBomRules(): ProcedureMaterialRuleViewItem[] {
	const rules: ProcedureMaterialRuleViewItem[] = [];
	for (const recipe of CANONICAL_PROCEDURE_RECIPES) {
		const sId = `srv-${recipe.code804n.replace(/\./g, "-").toLowerCase()}`;
		for (const item of recipe.items) {
			rules.push({
				id: `rule-${sId}-${item.id}`,
				serviceId: sId,
				serviceCode: recipe.code804n,
				serviceTitle: recipe.titleRu,
				serviceCategory: recipe.category,
				specialty: "therapist",
				inventoryItemId: item.inventoryItemId,
				itemName: item.nameRu,
				category: item.category,
				unit: formatInventoryUnitRu(item.unit),
				stockQuantity: 25,
				criticalThreshold: 5,
				unitCostRub: String(Math.round(item.estimatedUnitCostKopecks / 100)),
				quantityToDeduct: item.standardQuantity,
			});
		}
	}
	return rules;
}

export function buildCanonicalFallbackWarehouseItems() {
	const map = new Map<
		string,
		{
			id: string;
			name: string;
			stockQuantity: number;
			criticalThreshold: number;
			unitCostRub: string;
			updatedAt: string;
			unit: string;
		}
	>();
	for (const r of buildCanonicalFallbackBomRules()) {
		if (!map.has(r.inventoryItemId)) {
			map.set(r.inventoryItemId, {
				id: r.inventoryItemId,
				name: r.itemName,
				stockQuantity: Number(r.stockQuantity) || 25,
				criticalThreshold: Number(r.criticalThreshold) || 5,
				unitCostRub: String(r.unitCostRub || "150"),
				updatedAt: new Date().toISOString(),
				unit: r.unit,
			});
		}
	}
	return Array.from(map.values());
}
