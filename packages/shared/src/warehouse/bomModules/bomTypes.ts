/**
 * bomTypes.ts — Technological Maps (BOM) & Soft Stock Type Contracts.
 * Mandate 8e (Doctor Autonomy), Mandate 8n (Soft Negative Stock), Mandate 8ap (Domain Purity).
 * Pure types <= 120 lines.
 */

import type {
	ConsumableCategory,
	ConsumableItemLink,
	ConsumableUnit,
} from "../consumableModules/consumableTypes.js";

export type { ConsumableCategory, ConsumableItemLink, ConsumableUnit };

/**
 * Clean domain BOM link without raw regulatory statute dependency.
 */
export interface ServiceBomItemLink extends ConsumableItemLink {
	readonly serviceCode?: string;
	readonly nomenclatureCode?: string;
	readonly standardDeductionNorm?: number;
	readonly allowSoftNegativeStock?: boolean;
}

/**
 * Procedure item requested for batch BOM deduction.
 */
export interface ProcedureBomDeductionRequestItem {
	readonly serviceCode: string;
	readonly serviceTitle?: string;
	readonly quantity?: number;
	readonly toothNumber?: number | null;
}

/**
 * Result of batch deduction calculation for a single consumable.
 */
export interface CalculatedBomConsumableDeduction {
	readonly inventoryItemId: string;
	readonly itemName: string;
	readonly category: ConsumableCategory;
	readonly unit: ConsumableUnit;
	readonly totalQuantity: number;
	readonly unitCostPriceKopecks: number;
	readonly totalCostPriceKopecks: number;
	readonly isMandatory: boolean;
	readonly notes?: string | null | undefined;
}

/**
 * Summary result of batch procedure deduction.
 */
export interface BatchProcedureBomSummary {
	readonly totalServicesCount: number;
	readonly totalMaterialsCount: number;
	readonly totalCostPriceKopecks: number;
	readonly items: readonly CalculatedBomConsumableDeduction[];
	readonly softNegativeStockAllowed: boolean;
}
