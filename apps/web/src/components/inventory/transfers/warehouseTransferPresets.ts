/**
 * ============================================================================
 * MULTI-CLINIC CENTRALIZED WAREHOUSE LOGISTICS PRESETS
 * Каталог филиалов клиники, категорий стоматологических расходных материалов,
 * эталонных номенклатурных позиций и жизненного цикла перемещений.
 * ============================================================================
 */

export type WarehouseBranchId = "central_hub" | "branch_center" | "branch_north" | "branch_south";

export type WarehouseItemCategory =
	| "anesthetics"
	| "suture"
	| "implants"
	| "composites"
	| "impression"
	| "disinfection_ppe";

export type WarehouseTransferStatus =
	| "draft"
	| "requested"
	| "dispatched"
	| "in_transit"
	| "received_ok"
	| "discrepancy"
	| "cancelled";

export interface WarehouseBranchDefinition {
	readonly id: WarehouseBranchId;
	readonly code: string;
	readonly okpoCode: string;
	readonly nameRu: string;
	readonly addressRu: string;
	readonly responsiblePersonRu: string;
	readonly responsiblePositionRu: string;
	readonly isCentralHub: boolean;
}

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

export interface TransferStatusDefinition {
	readonly status: WarehouseTransferStatus;
	readonly labelRu: string;
	readonly descriptionRu: string;
	readonly hexBadgeBg: string;
	readonly hexBadgeFg: string;
	readonly stepIndex: number;
}

/**
 * 1. Каталог складов и филиалов стоматологической сети
 */
export const WAREHOUSE_BRANCHES: readonly WarehouseBranchDefinition[] = [
	{
		id: "central_hub",
		code: "ЦС-01",
		okpoCode: "49201948",
		nameRu: "Центральный распределительный склад (ЦС)",
		addressRu: "г. Москва, ул. Складская, д. 12, стр. 3",
		responsiblePersonRu: "Васильев Олег Петрович",
		responsiblePositionRu: "Заведующий центральным складом",
		isCentralHub: true,
	},
	{
		id: "branch_center",
		code: "ФИЛ-01",
		okpoCode: "49201954",
		nameRu: "Филиал «Центральный» (Тверская)",
		addressRu: "г. Москва, ул. Тверская, д. 24",
		responsiblePersonRu: "Смирнова Анна Викторовна",
		responsiblePositionRu: "Главная медицинская сестра",
		isCentralHub: false,
	},
	{
		id: "branch_north",
		code: "ФИЛ-02",
		okpoCode: "49201960",
		nameRu: "Филиал «Северный» (Сокол)",
		addressRu: "г. Москва, Ленинградский пр-т, д. 74",
		responsiblePersonRu: "Кузнецова Ирина Сергеевна",
		responsiblePositionRu: "Старшая медицинская сестра",
		isCentralHub: false,
	},
	{
		id: "branch_south",
		code: "ФИЛ-03",
		okpoCode: "49201977",
		nameRu: "Филиал «Южный» (Профсоюзная)",
		addressRu: "г. Москва, ул. Профсоюзная, д. 56",
		responsiblePersonRu: "Морозова Елена Павловна",
		responsiblePositionRu: "Старшая медицинская сестра",
		isCentralHub: false,
	},
];

/**
 * 2. Эталонный каталог стоматологических расходных материалов и медикаментов
 */
export const WAREHOUSE_CATALOG_PRESETS: readonly WarehouseItemCatalogPreset[] = [
	// Анестетики
	{
		id: "mat_ultracain_forte",
		sku: "AN-ULTRA-01",
		nameRu: "Ультракаин Д-С Форте (Артикаин 4% + Эпинефрин 1:100 000, 100 карпул/уп)",
		category: "anesthetics",
		unitRu: "упак",
		okeiCode: "778",
		unitCostKopecks: 650000, // 6 500 руб
		defaultBatchNumber: "LOT-2026A44",
		standardPackQuantity: 100,
		minStockLevel: 5,
		initialStockByBranch: {
			central_hub: 150,
			branch_center: 12,
			branch_north: 8,
			branch_south: 10,
		},
	},
	{
		id: "mat_scandonest",
		sku: "AN-SCAN-02",
		nameRu: "Скандонест 3% без вазоконстриктора (Мепивакаин 3%, 50 карпул/уп)",
		category: "anesthetics",
		unitRu: "упак",
		okeiCode: "778",
		unitCostKopecks: 420000, // 4 200 руб
		defaultBatchNumber: "LOT-2026B12",
		standardPackQuantity: 50,
		minStockLevel: 3,
		initialStockByBranch: {
			central_hub: 80,
			branch_center: 6,
			branch_north: 4,
			branch_south: 5,
		},
	},

	// Шовный материал
	{
		id: "mat_suture_ptfe_40",
		sku: "SUT-PTFE-40",
		nameRu: "Шовный материал ПТФЭ (PTFE) 4-0, обратно-режущая игла 16 мм (12 шт/уп)",
		category: "suture",
		unitRu: "упак",
		okeiCode: "778",
		unitCostKopecks: 540000, // 5 400 руб
		defaultBatchNumber: "LOT-PTFE-881",
		standardPackQuantity: 12,
		minStockLevel: 4,
		initialStockByBranch: {
			central_hub: 90,
			branch_center: 8,
			branch_north: 5,
			branch_south: 7,
		},
	},
	{
		id: "mat_suture_vicryl_50",
		sku: "SUT-VICR-50",
		nameRu: "Викрил (Vicryl Plus) 5-0 рассасывающийся, колющая игла 13 мм (36 шт/уп)",
		category: "suture",
		unitRu: "упак",
		okeiCode: "778",
		unitCostKopecks: 780000, // 7 800 руб
		defaultBatchNumber: "LOT-VIC-902",
		standardPackQuantity: 36,
		minStockLevel: 2,
		initialStockByBranch: {
			central_hub: 60,
			branch_center: 4,
			branch_north: 3,
			branch_south: 4,
		},
	},

	// Имплантационные системы
	{
		id: "mat_impl_osstem_40_10",
		sku: "IMP-OSST-4010",
		nameRu: "Дентальный имплантат Osstem TS III SA Ø4.0 x 10 мм",
		category: "implants",
		unitRu: "шт",
		okeiCode: "796",
		unitCostKopecks: 1250000, // 12 500 руб
		defaultBatchNumber: "LOT-OS-5541",
		standardPackQuantity: 1,
		minStockLevel: 10,
		initialStockByBranch: {
			central_hub: 200,
			branch_center: 15,
			branch_north: 12,
			branch_south: 14,
		},
	},
	{
		id: "mat_impl_straumann_blx",
		sku: "IMP-STRA-3710",
		nameRu: "Дентальный имплантат Straumann BLX Roxolid SLActive Ø3.75 x 10 мм",
		category: "implants",
		unitRu: "шт",
		okeiCode: "796",
		unitCostKopecks: 2800000, // 28 000 руб
		defaultBatchNumber: "LOT-ST-1102",
		standardPackQuantity: 1,
		minStockLevel: 5,
		initialStockByBranch: {
			central_hub: 100,
			branch_center: 8,
			branch_north: 6,
			branch_south: 6,
		},
	},

	// Композиты и адгезивы
	{
		id: "mat_filtek_ultimate_a2",
		sku: "COMP-FILT-A2",
		nameRu: "Композит Filtek Ultimate шприц 4г (Enamel A2)",
		category: "composites",
		unitRu: "шт",
		okeiCode: "796",
		unitCostKopecks: 420000, // 4 200 руб
		defaultBatchNumber: "LOT-FLT-772",
		standardPackQuantity: 1,
		minStockLevel: 6,
		initialStockByBranch: {
			central_hub: 120,
			branch_center: 10,
			branch_north: 8,
			branch_south: 9,
		},
	},
	{
		id: "mat_single_bond_universal",
		sku: "ADH-SBU-5ML",
		nameRu: "Адгезив универсальный 3M Single Bond Universal (флакон 5 мл)",
		category: "composites",
		unitRu: "шт",
		okeiCode: "796",
		unitCostKopecks: 680000, // 6 800 руб
		defaultBatchNumber: "LOT-SBU-909",
		standardPackQuantity: 1,
		minStockLevel: 4,
		initialStockByBranch: {
			central_hub: 75,
			branch_center: 6,
			branch_north: 5,
			branch_south: 6,
		},
	},

	// Слепочные массы
	{
		id: "mat_silagum_putty",
		sku: "IMP-SILA-PUTT",
		nameRu: "А-силикон Silagum Putty Soft (база + катализатор 2 x 450 мл)",
		category: "impression",
		unitRu: "компл",
		okeiCode: "778",
		unitCostKopecks: 890000, // 8 900 руб
		defaultBatchNumber: "LOT-SILA-441",
		standardPackQuantity: 1,
		minStockLevel: 4,
		initialStockByBranch: {
			central_hub: 85,
			branch_center: 7,
			branch_north: 5,
			branch_south: 6,
		},
	},

	// Дезинфекция и СИЗ
	{
		id: "mat_brilliant_classic_1l",
		sku: "DIS-BRIL-1L",
		nameRu: "Концентрат дезинфицирующий «Бриллиант Классик» (флакон 1 л)",
		category: "disinfection_ppe",
		unitRu: "фл",
		okeiCode: "112",
		unitCostKopecks: 95000, // 950 руб
		defaultBatchNumber: "LOT-BRIL-2026",
		standardPackQuantity: 1,
		minStockLevel: 10,
		initialStockByBranch: {
			central_hub: 300,
			branch_center: 20,
			branch_north: 15,
			branch_south: 18,
		},
	},
];

/**
 * 3. Жизненный цикл статусов перемещения ТМЦ
 */
export const TRANSFER_STATUS_PIPELINE: Record<WarehouseTransferStatus, TransferStatusDefinition> = {
	draft: {
		status: "draft",
		labelRu: "Черновик",
		descriptionRu: "Заявка на перемещение создана и ожидает утверждения складом",
		hexBadgeBg: "#f1f5f9",
		hexBadgeFg: "#475569",
		stepIndex: 1,
	},
	requested: {
		status: "requested",
		labelRu: "Запрошено",
		descriptionRu: "Заявка отправлена на склад-отправитель для комплектации",
		hexBadgeBg: "#fef3c7",
		hexBadgeFg: "#92400e",
		stepIndex: 2,
	},
	dispatched: {
		status: "dispatched",
		labelRu: "Скомплектовано",
		descriptionRu: "Товар скомплектован на складе, выписана накладная ТОРГ-13",
		hexBadgeBg: "#e0f2fe",
		hexBadgeFg: "#0369a1",
		stepIndex: 3,
	},
	in_transit: {
		status: "in_transit",
		labelRu: "В пути / Курьер",
		descriptionRu: "ТМЦ переданы водителю-курьеру для доставки в филиал",
		hexBadgeBg: "#ede9fe",
		hexBadgeFg: "#6d28d9",
		stepIndex: 4,
	},
	received_ok: {
		status: "received_ok",
		labelRu: "Принято без расхождений",
		descriptionRu: "ТМЦ успешно оприходованы филиалом-получателем в полном объеме",
		hexBadgeBg: "#ecfdf5",
		hexBadgeFg: "#047857",
		stepIndex: 5,
	},
	discrepancy: {
		status: "discrepancy",
		labelRu: "Принято с расхождениями",
		descriptionRu: "Выявлена недостача, бой или пересортица (составлен акт ТОРГ-2)",
		hexBadgeBg: "#fef2f2",
		hexBadgeFg: "#b91c1c",
		stepIndex: 5,
	},
	cancelled: {
		status: "cancelled",
		labelRu: "Отменено",
		descriptionRu: "Перемещение отменено инициатором или складом",
		hexBadgeBg: "#f1f5f9",
		hexBadgeFg: "#94a3b8",
		stepIndex: 0,
	},
};

/**
 * Получить филиал по ID
 */
export function getWarehouseBranch(id: WarehouseBranchId): WarehouseBranchDefinition {
	const found = WAREHOUSE_BRANCHES.find((b) => b.id === id);
	return found || WAREHOUSE_BRANCHES[0]!;
}

/**
 * Получить товар по ID
 */
export function getWarehouseItemCatalogPreset(id: string): WarehouseItemCatalogPreset | undefined {
	return WAREHOUSE_CATALOG_PRESETS.find((item) => item.id === id);
}
