/**
 * apps/web/src/components/treatment-plans/types/planMaterialTypes.ts
 *
 * Нормы списания материалов и расчет себестоимости этапов.
 */

import type { Kopecks } from "@dental/shared";

export type MaterialUnitOfMeasure =
	| "г"
	| "мл"
	| "шт."
	| "карп."
	| "компл."
	| "порц."
	| "см"
	| "мм"
	| "упак.";

export interface ProcedureMaterialNorm {
	readonly id: string;
	readonly materialName: string;
	readonly sku?: string;
	readonly category: string;
	readonly quantityPerProcedure: number;
	readonly unitOfMeasure: MaterialUnitOfMeasure;
	readonly defaultUnitCostRub: number;
	readonly mandatory: boolean;
	readonly lotTrackingRequired?: boolean;
	readonly hideInPatientPresentation?: boolean;
}

export interface PlanStageMaterialRequirement {
	readonly id: string;
	readonly materialName: string;
	readonly serviceCode?: string;
	readonly order804nCode: string;
	readonly procedureName: string;
	readonly toothNumber?: number;
	readonly quantityRequired: number;
	readonly unitOfMeasure: MaterialUnitOfMeasure;
	readonly unitCostRub: number;
	readonly unitCostKopecks: Kopecks;
	readonly totalCostRub: number;
	readonly totalCostKopecks: Kopecks;
	readonly inventoryItemId?: string;
	readonly inStockQuantity?: number;
	readonly isDeficit: boolean;
	readonly deficitQuantity: number;
	readonly hideInPatientPresentation?: boolean;
}

export interface StageMaterialCostSummary {
	readonly stageNumber: number;
	readonly stageTitle: string;
	readonly items: readonly PlanStageMaterialRequirement[];
	readonly totalMaterialsCostKopecks: Kopecks;
	readonly totalMaterialsCostRub: number;
	readonly serviceRevenueKopecks: Kopecks;
	readonly serviceRevenueRub: number;
	readonly grossMarginKopecks: Kopecks;
	readonly grossMarginRub: number;
	readonly marginPercent: number;
	readonly hasDeficit: boolean;
	readonly deficitCount: number;
}
