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
	readonly sku?: string | undefined;
	readonly category: string;
	readonly quantityPerProcedure: number;
	readonly unitOfMeasure: MaterialUnitOfMeasure;
	readonly defaultUnitCostRub: number;
	readonly mandatory: boolean;
	readonly lotTrackingRequired?: boolean | undefined;
	readonly hideInPatientPresentation?: boolean | undefined;
}

export interface PlanStageMaterialRequirement {
	readonly id: string;
	readonly materialName: string;
	readonly serviceCode?: string | undefined;
	readonly order804nCode: string;
	readonly procedureName: string;
	readonly toothNumber?: number | undefined;
	readonly quantityRequired: number;
	readonly unitOfMeasure: MaterialUnitOfMeasure;
	readonly unitCostRub: number;
	readonly unitCostKopecks: Kopecks;
	readonly totalCostRub: number;
	readonly totalCostKopecks: Kopecks;
	readonly inventoryItemId?: string | undefined;
	readonly inStockQuantity?: number | undefined;
	readonly isDeficit: boolean;
	readonly deficitQuantity: number;
	readonly hideInPatientPresentation?: boolean | undefined;
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
