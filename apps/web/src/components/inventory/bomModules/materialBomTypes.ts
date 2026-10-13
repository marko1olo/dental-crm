/**
 * materialBomTypes.ts — Technological Bill-of-Materials (BOM) Data Contracts & Interfaces.
 *
 * Implements:
 * 1. Statutory 804n medical procedure links to warehouse inventory consumables.
 * 2. Deterministic unit conversion and kopeck cost tracking.
 * 3. Single Source of Truth linking to @dental/shared inventory and recipe SSOTs.
 */

import {
	CANONICAL_PROCEDURE_RECIPES,
	type CanonicalInventoryUnit,
	type CanonicalProcedureRecipe,
	formatInventoryUnitRu,
	type ProcedureMaterialCategory,
} from "@dental/shared";

export interface ProcedureMaterialRuleViewItem {
	id: string;
	serviceId: string;
	serviceCode?: string | null;
	serviceTitle?: string | null;
	serviceCategory?: string | null;
	specialty?: string | null;
	inventoryItemId: string;
	itemName: string;
	category?: string | null;
	unit: string;
	stockQuantity: string | number;
	unitCostRub?: string | number | null;
	criticalThreshold?: string | number | null;
	quantityToDeduct: string | number;
	requiredQty?: string | number;
	createdAt?: string;
}

export interface ServiceGroupViewItem {
	serviceId: string;
	serviceCode: string;
	serviceTitle: string;
	serviceCategory: string;
	specialty: string;
	rules: ProcedureMaterialRuleViewItem[];
	totalCostRub: number;
	hasDeficit: boolean;
}

export interface MaterialBomModalState {
	isOpen: boolean;
	ruleId?: string | undefined;
	serviceId: string;
	inventoryItemId: string;
	quantityToDeduct: string;
}

export interface MaterialBomStats {
	readonly totalServices: number;
	readonly totalRules: number;
	readonly totalDeficitServices: number;
	readonly avgCostFormatted: string;
}

export interface ServiceOption {
	readonly id: string;
	readonly code: string;
	readonly title: string;
	readonly category: string;
}

export {
	type CanonicalInventoryUnit,
	type CanonicalProcedureRecipe,
	type ProcedureMaterialCategory,
	CANONICAL_PROCEDURE_RECIPES,
};

/**
 * Builds canonical 804n clinical fallback BOM rules using CANONICAL_PROCEDURE_RECIPES SSOT.
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

