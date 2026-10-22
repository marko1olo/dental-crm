import type { WarehouseItemCatalogPreset } from "./warehouseTransferCatalogItems1.js";

export const WAREHOUSE_CATALOG_ITEMS_PART2: readonly WarehouseItemCatalogPreset[] = [
	// Композиты и адгезивы
	{
		id: "mat_filtek_ultimate_a2",
		sku: "COMP-FILT-A2",
		nameRu: "Композит Filtek Ultimate шприц 4г (Enamel A2)",
		category: "composites",
		unitRu: "шт",
		okeiCode: "796",
		unitCostKopecks: 420000,
		defaultBatchNumber: "LOT-FLT-772",
		standardPackQuantity: 1,
		minStockLevel: 6,
		initialStockByBranch: { central_hub: 120, branch_center: 10, branch_north: 8, branch_south: 9 },
	},
	{
		id: "mat_single_bond_universal",
		sku: "ADH-SBU-5ML",
		nameRu: "Адгезив универсальный 3M Single Bond Universal (флакон 5 мл)",
		category: "composites",
		unitRu: "шт",
		okeiCode: "796",
		unitCostKopecks: 680000,
		defaultBatchNumber: "LOT-SBU-909",
		standardPackQuantity: 1,
		minStockLevel: 4,
		initialStockByBranch: { central_hub: 75, branch_center: 6, branch_north: 5, branch_south: 6 },
	},
	// Слепочные массы
	{
		id: "mat_silagum_putty",
		sku: "IMP-SILA-PUTT",
		nameRu: "А-силикон Silagum Putty Soft (база + катализатор 2 x 450 мл)",
		category: "impression",
		unitRu: "компл",
		okeiCode: "778",
		unitCostKopecks: 890000,
		defaultBatchNumber: "LOT-SILA-441",
		standardPackQuantity: 1,
		minStockLevel: 4,
		initialStockByBranch: { central_hub: 85, branch_center: 7, branch_north: 5, branch_south: 6 },
	},
	// Дезинфекция и СИЗ
	{
		id: "mat_brilliant_classic_1l",
		sku: "DIS-BRIL-1L",
		nameRu: "Концентрат дезинфицирующий «Бриллиант Классик» (флакон 1 л)",
		category: "disinfection_ppe",
		unitRu: "фл",
		okeiCode: "112",
		unitCostKopecks: 95000,
		defaultBatchNumber: "LOT-BRIL-2026",
		standardPackQuantity: 1,
		minStockLevel: 10,
		initialStockByBranch: { central_hub: 300, branch_center: 20, branch_north: 15, branch_south: 18 },
	},
];
