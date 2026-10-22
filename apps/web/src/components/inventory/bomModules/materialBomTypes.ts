/**
 * materialBomTypes.ts — Technological Bill-of-Materials (BOM) Data Contracts & Interfaces.
 */

import {
	CANONICAL_PROCEDURE_RECIPES,
	type CanonicalInventoryUnit,
	type CanonicalProcedureRecipe,
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

export {
	buildCanonicalFallbackBomRules,
	buildCanonicalFallbackWarehouseItems,
} from "./materialBomFallbacks.js";
