import type { WarehouseBranchId } from "./warehouseTransferBranches.js";

export type WarehouseItemCategory =
	| "anesthetics"
	| "suture"
	| "implants"
	| "composites"
	| "impression"
	| "disinfection_ppe";

export interface WarehouseItemCatalogPreset {
	readonly id: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly category: WarehouseItemCategory;
	readonly unitRu: string;
	readonly okeiCode: string; // Код по ОКЕИ (796 - шт, 778 - уп, 112 - л, 166 - кг)
	readonly unitCostKopecks: number;
	readonly defaultBatchNumber: string;
	readonly standardPackQuantity: number;
	readonly minStockLevel: number;
	readonly initialStockByBranch: Record<WarehouseBranchId, number>;
}

export const WAREHOUSE_CATALOG_ITEMS_PART1: readonly WarehouseItemCatalogPreset[] = [
	// Анестетики
	{
		id: "mat_ultracain_forte",
		sku: "AN-ULTRA-01",
		nameRu: "Ультракаин Д-С Форте (Артикаин 4% + Эпинефрин 1:100 000, 100 карпул/уп)",
		category: "anesthetics",
		unitRu: "упак",
		okeiCode: "778",
		unitCostKopecks: 650000,
		defaultBatchNumber: "LOT-2026A44",
		standardPackQuantity: 100,
		minStockLevel: 5,
		initialStockByBranch: { central_hub: 150, branch_center: 12, branch_north: 8, branch_south: 10 },
	},
	{
		id: "mat_scandonest",
		sku: "AN-SCAN-02",
		nameRu: "Скандонест 3% без вазоконстриктора (Мепивакаин 3%, 50 карпул/уп)",
		category: "anesthetics",
		unitRu: "упак",
		okeiCode: "778",
		unitCostKopecks: 420000,
		defaultBatchNumber: "LOT-2026B12",
		standardPackQuantity: 50,
		minStockLevel: 3,
		initialStockByBranch: { central_hub: 80, branch_center: 6, branch_north: 4, branch_south: 5 },
	},
	// Шовный материал
	{
		id: "mat_suture_ptfe_40",
		sku: "SUT-PTFE-40",
		nameRu: "Шовный материал ПТФЭ (PTFE) 4-0, обратно-режущая игла 16 мм (12 шт/уп)",
		category: "suture",
		unitRu: "упак",
		okeiCode: "778",
		unitCostKopecks: 540000,
		defaultBatchNumber: "LOT-PTFE-881",
		standardPackQuantity: 12,
		minStockLevel: 4,
		initialStockByBranch: { central_hub: 90, branch_center: 8, branch_north: 5, branch_south: 7 },
	},
	{
		id: "mat_suture_vicryl_50",
		sku: "SUT-VICR-50",
		nameRu: "Викрил (Vicryl Plus) 5-0 рассасывающийся, колющая игла 13 мм (36 шт/уп)",
		category: "suture",
		unitRu: "упак",
		okeiCode: "778",
		unitCostKopecks: 780000,
		defaultBatchNumber: "LOT-VIC-902",
		standardPackQuantity: 36,
		minStockLevel: 2,
		initialStockByBranch: { central_hub: 60, branch_center: 4, branch_north: 3, branch_south: 4 },
	},
	// Имплантационные системы
	{
		id: "mat_impl_osstem_40_10",
		sku: "IMP-OSST-4010",
		nameRu: "Дентальный имплантат Osstem TS III SA Ø4.0 x 10 мм",
		category: "implants",
		unitRu: "шт",
		okeiCode: "796",
		unitCostKopecks: 1250000,
		defaultBatchNumber: "LOT-OS-5541",
		standardPackQuantity: 1,
		minStockLevel: 10,
		initialStockByBranch: { central_hub: 200, branch_center: 15, branch_north: 12, branch_south: 14 },
	},
	{
		id: "mat_impl_straumann_blx",
		sku: "IMP-STRA-3710",
		nameRu: "Дентальный имплантат Straumann BLX Roxolid SLActive Ø3.75 x 10 мм",
		category: "implants",
		unitRu: "шт",
		okeiCode: "796",
		unitCostKopecks: 2800000,
		defaultBatchNumber: "LOT-ST-1102",
		standardPackQuantity: 1,
		minStockLevel: 5,
		initialStockByBranch: { central_hub: 100, branch_center: 8, branch_north: 6, branch_south: 6 },
	},
];
