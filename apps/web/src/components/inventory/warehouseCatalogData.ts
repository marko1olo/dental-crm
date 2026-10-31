/**
 * warehouseCatalogData.ts — Canonical SSOT: Склад, номенклатура и Soft Negative Stock.
 * Мандаты: 8e (Автономия врача), 8n (Соло-практика, мягкий овердрафт без блокировок),
 * 8b (Sweet Spot: строго 300–350 строк), 8wy (Целочисленные копейки amountKopecks),
 * 8x (Живой человеческий клинический язык без канцелярита и советских приказов).
 */

export type WarehouseCategoryKey = "anesthetics" | "therapy" | "orthopedics" | "surgery" | "ppe";

export interface WarehouseMaterialCategory {
	readonly id: WarehouseCategoryKey;
	readonly nameRu: string;
	readonly description: string;
	readonly badgeColor: string;
}

export type StockUnit = "шт." | "упак." | "мл" | "набор" | "карп." | "шприц" | "флакон" | "компл." | "порц." | "пара";

export interface WarehouseStockItem {
	readonly id: string;
	readonly nameRu: string;
	readonly category: WarehouseCategoryKey;
	readonly unit: StockUnit | string;
	currentStock: number;
	readonly minStock: number;
	readonly unitCostKopecks: number;
	readonly supplierName: string;
	readonly sku: string;
	needsReorder?: boolean;
}

export interface ProcedureTechMapItem {
	readonly materialId: string;
	readonly nameRu: string;
	readonly quantity: number;
	readonly unit: StockUnit | string;
	readonly unitCostKopecks: number;
}

export interface ProcedureTechMap {
	readonly id: string;
	readonly code: string;
	readonly titleRu: string;
	readonly category: WarehouseCategoryKey;
	readonly descriptionRu: string;
	readonly items: readonly ProcedureTechMapItem[];
}

export interface SoftDeductionResult {
	readonly materialId: string;
	readonly nameRu: string;
	readonly quantity: number;
	readonly unit: string;
	readonly previousStock: number;
	readonly newStock: number;
	readonly isOverdraft: boolean;
	readonly overdraftAmount: number;
	readonly totalCostKopecks: number;
}

export interface IncomingInvoiceResult {
	readonly materialId: string;
	readonly nameRu: string;
	readonly addedQuantity: number;
	readonly previousStock: number;
	readonly newStock: number;
	readonly clearedOverdraft: number;
	readonly totalCostKopecks: number;
}

export interface WarehouseKpis {
	readonly totalPositions: number;
	readonly deficitCount: number;
	readonly lowStockCount: number;
	readonly reorderCount: number;
	readonly totalValuationKopecks: number;
}

/** 5 Канонических категорий материалов стоматологической клиники (Мандат 8n) */
export const WAREHOUSE_CATEGORIES: readonly WarehouseMaterialCategory[] = [
	{ id: "anesthetics", nameRu: "Анестезия и карпулы", description: "Артикаин, карпульные иглы 30G/27G", badgeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
	{ id: "therapy", nameRu: "Терапевтические композиты", description: "Световые композиты, адгезивы, бонды", badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
	{ id: "surgery", nameRu: "Хирургия и шовный материал", description: "Шовный викрил, гемостатики, физраствор", badgeColor: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
	{ id: "orthopedics", nameRu: "Ортопедия и слепочные массы", description: "А-силиконы, С-силиконы, альгинаты", badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" },
	{ id: "ppe", nameRu: "Дезинфекция и СИЗ", description: "Перчатки нитриловые, маски, слюноотсосы", badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
] as const;

/** Стартовый каталог складских запасов с демонстрацией Soft Negative Stock */
export const INITIAL_WAREHOUSE_STOCK: readonly WarehouseStockItem[] = [
	{ id: "mat-art-01", nameRu: "Артикаин 1:100 000 (карпулы 1.7 мл)", category: "anesthetics", unit: "карп.", currentStock: 48, minStock: 20, unitCostKopecks: 14500, supplierName: "Дентал-Маркет", sku: "ART-100-FR", needsReorder: false },
	{ id: "mat-art-02", nameRu: "Ультракаин Д-С форте (карпулы 1.7 мл)", category: "anesthetics", unit: "карп.", currentStock: 12, minStock: 15, unitCostKopecks: 18500, supplierName: "Дентал-Маркет", sku: "ULT-DS-FR", needsReorder: true },
	{ id: "mat-needle-01", nameRu: "Иглы карпульные 30G короткие 0.3x21мм", category: "anesthetics", unit: "шт.", currentStock: -4, minStock: 30, unitCostKopecks: 850, supplierName: "МедСнаб Трейд", sku: "NDL-30G-21", needsReorder: true },
	{ id: "mat-comp-01", nameRu: "Композит световой Filtek Ultimate A2 (4г)", category: "therapy", unit: "шприц", currentStock: 6, minStock: 2, unitCostKopecks: 385000, supplierName: "СтомТорг Комплект", sku: "FLT-ULT-A2", needsReorder: false },
	{ id: "mat-comp-02", nameRu: "Композит световой Estelite Asteria A2 (4г)", category: "therapy", unit: "шприц", currentStock: 1, minStock: 2, unitCostKopecks: 410000, supplierName: "СтомТорг Комплект", sku: "EST-AST-A2", needsReorder: true },
	{ id: "mat-bond-01", nameRu: "Адгезив самопротравливающий Single Bond (5мл)", category: "therapy", unit: "флакон", currentStock: 3, minStock: 1, unitCostKopecks: 540000, supplierName: "СтомТорг Комплект", sku: "BND-UNIV-5ML", needsReorder: false },
	{ id: "mat-surg-01", nameRu: "Шовный материал Викрил 4-0 с иглой 16мм", category: "surgery", unit: "шт.", currentStock: 18, minStock: 10, unitCostKopecks: 36000, supplierName: "МедСнаб Трейд", sku: "VIC-4-0-16K", needsReorder: false },
	{ id: "mat-hemo-01", nameRu: "Гемостатическая губка Альвостаз (30 шт)", category: "surgery", unit: "банка", currentStock: 4, minStock: 1, unitCostKopecks: 98000, supplierName: "МедСнаб Трейд", sku: "ALV-SPONGE-30", needsReorder: false },
	{ id: "mat-impl-01", nameRu: "Стерильный хирургический халат + простыня", category: "surgery", unit: "компл.", currentStock: 8, minStock: 5, unitCostKopecks: 125000, supplierName: "МедСнаб Трейд", sku: "SURG-DRAPE-ST", needsReorder: false },
	{ id: "mat-saline-01", nameRu: "Физраствор стерильный для ирригации 500мл", category: "surgery", unit: "флакон", currentStock: 15, minStock: 10, unitCostKopecks: 24000, supplierName: "МедСнаб Трейд", sku: "NACL-09-500", needsReorder: false },
	{ id: "mat-algin-01", nameRu: "Альгинатная слепочная масса Hydrogum 5 (453г)", category: "orthopedics", unit: "упак.", currentStock: 5, minStock: 2, unitCostKopecks: 112000, supplierName: "Дентал-Маркет", sku: "ZHM-HYDR-453", needsReorder: false },
	{ id: "mat-silic-01", nameRu: "А-силикон база + корректор Silagum Putty/Light", category: "orthopedics", unit: "компл.", currentStock: 2, minStock: 2, unitCostKopecks: 620000, supplierName: "Дентал-Маркет", sku: "DMG-SILAGUM", needsReorder: false },
	{ id: "mat-glove-01", nameRu: "Перчатки нитриловые неопудренные размер M", category: "ppe", unit: "упак.", currentStock: -2, minStock: 5, unitCostKopecks: 65000, supplierName: "СтомТорг Комплект", sku: "GLV-NIT-M-100", needsReorder: true },
	{ id: "mat-saliv-01", nameRu: "Слюноотсосы одноразовые с фильтром (100 шт)", category: "ppe", unit: "упак.", currentStock: 14, minStock: 4, unitCostKopecks: 32000, supplierName: "СтомТорг Комплект", sku: "ASP-SLV-100", needsReorder: false },
] as const;

/** Техкарты процедур для автосписания расходников крупными батчами в 1 клик */
export const PROCEDURE_TECH_MAPS: readonly ProcedureTechMap[] = [
	{
		id: "proc-filling-light",
		code: "THER-01",
		titleRu: "Пломбирование кариеса световым композитом",
		category: "therapy",
		descriptionRu: "1 карпула артикаина, игла 30G, порция композита Filtek, адгезив, слюноотсос",
		items: [
			{ materialId: "mat-art-01", nameRu: "Артикаин 1:100 000 (1.7 мл)", quantity: 1, unit: "карп.", unitCostKopecks: 14500 },
			{ materialId: "mat-needle-01", nameRu: "Иглы карпульные 30G короткие", quantity: 1, unit: "шт.", unitCostKopecks: 850 },
			{ materialId: "mat-comp-01", nameRu: "Композит световой Filtek A2", quantity: 1, unit: "порц.", unitCostKopecks: 48000 },
			{ materialId: "mat-bond-01", nameRu: "Адгезив Single Bond Universal", quantity: 1, unit: "капля", unitCostKopecks: 27000 },
			{ materialId: "mat-saliv-01", nameRu: "Слюноотсос одноразовый", quantity: 1, unit: "шт.", unitCostKopecks: 320 },
		],
	},
	{
		id: "proc-surgery-extract",
		code: "SURG-01",
		titleRu: "Простое удаление зуба",
		category: "surgery",
		descriptionRu: "2 карпулы анестетика, игла, гемостатическая губка, шовный материал",
		items: [
			{ materialId: "mat-art-01", nameRu: "Артикаин 1:100 000 (1.7 мл)", quantity: 2, unit: "карп.", unitCostKopecks: 29000 },
			{ materialId: "mat-needle-01", nameRu: "Иглы карпульные 30G короткие", quantity: 1, unit: "шт.", unitCostKopecks: 850 },
			{ materialId: "mat-hemo-01", nameRu: "Гемостатическая губка Альвостаз", quantity: 1, unit: "шт.", unitCostKopecks: 3267 },
			{ materialId: "mat-surg-01", nameRu: "Шовный материал Викрил 4-0", quantity: 1, unit: "шт.", unitCostKopecks: 36000 },
		],
	},
	{
		id: "proc-implant-stage1",
		code: "IMPL-01",
		titleRu: "Дентальная имплантация (1-й этап)",
		category: "surgery",
		descriptionRu: "Хирургический набор, халат, ирригация физраствором, 2 карпулы артикаина",
		items: [
			{ materialId: "mat-art-01", nameRu: "Артикаин 1:100 000 (1.7 мл)", quantity: 2, unit: "карп.", unitCostKopecks: 29000 },
			{ materialId: "mat-needle-01", nameRu: "Иглы карпульные 30G короткие", quantity: 2, unit: "шт.", unitCostKopecks: 1700 },
			{ materialId: "mat-impl-01", nameRu: "Стерильный хирургический набор", quantity: 1, unit: "компл.", unitCostKopecks: 125000 },
			{ materialId: "mat-saline-01", nameRu: "Физраствор стерильный 500мл", quantity: 1, unit: "флакон", unitCostKopecks: 24000 },
			{ materialId: "mat-surg-01", nameRu: "Шовный материал Викрил 4-0", quantity: 1, unit: "шт.", unitCostKopecks: 36000 },
		],
	},
	{
		id: "proc-hygiene-prof",
		code: "HYG-01",
		titleRu: "Комплексная профессиональная гигиена",
		category: "ppe",
		descriptionRu: "Слюноотсосы, полировочная паста, перчатки нитриловые",
		items: [
			{ materialId: "mat-saliv-01", nameRu: "Слюноотсосы одноразовые", quantity: 2, unit: "шт.", unitCostKopecks: 640 },
			{ materialId: "mat-glove-01", nameRu: "Перчатки нитриловые", quantity: 1, unit: "пара", unitCostKopecks: 1300 },
		],
	},
	{
		id: "proc-endo-root",
		code: "ENDO-01",
		titleRu: "Эндодонтическая обработка корневых каналов",
		category: "therapy",
		descriptionRu: "Анестетик, игла, антисептическая ирригация, коффердам",
		items: [
			{ materialId: "mat-art-01", nameRu: "Артикаин 1:100 000 (1.7 мл)", quantity: 1, unit: "карп.", unitCostKopecks: 14500 },
			{ materialId: "mat-needle-01", nameRu: "Иглы карпульные 30G", quantity: 1, unit: "шт.", unitCostKopecks: 850 },
			{ materialId: "mat-saliv-01", nameRu: "Слюноотсос одноразовый", quantity: 1, unit: "шт.", unitCostKopecks: 320 },
		],
	},
] as const;

/** Логика Soft Negative Stock: мягкий овердрафт без блокировки врача (Мандат 8e, 8n) */
export function calculateSoftNegativeStock(
	currentStock: number,
	deductQuantity: number,
): { nextStock: number; isOverdraft: boolean; overdraftAmount: number } {
	const safeDeduct = Math.max(0, deductQuantity);
	const nextStock = currentStock - safeDeduct;
	const isOverdraft = nextStock < 0;
	const overdraftAmount = isOverdraft ? Math.abs(nextStock) : 0;
	return { nextStock, isOverdraft, overdraftAmount };
}

/** Сводный расчет KPI склада: дефицит, мало, переоценка запасов в копейках */
export function computeWarehouseKpis(items: readonly WarehouseStockItem[]): WarehouseKpis {
	let deficitCount = 0;
	let lowStockCount = 0;
	let reorderCount = 0;
	let totalValuationKopecks = 0;
	for (const item of items) {
		if (item.currentStock < 0) {
			deficitCount++;
			reorderCount++;
		} else if (item.currentStock <= item.minStock) {
			lowStockCount++;
			reorderCount++;
		}
		if (item.currentStock > 0) {
			totalValuationKopecks += item.currentStock * item.unitCostKopecks;
		}
	}
	return { totalPositions: items.length, deficitCount, lowStockCount, reorderCount, totalValuationKopecks };
}

/** Цветовая индикация складского остатка: норма, мало, овердрафт (минус) */
export function getStockStatusBadge(
	currentStock: number,
	minStock: number,
): { status: "normal" | "low" | "overdraft"; badgeLabel: string; colorClass: string } {
	if (currentStock < 0) {
		return {
			status: "overdraft",
			badgeLabel: `Овердрафт (${currentStock})`,
			colorClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold",
		};
	}
	if (currentStock <= minStock) {
		return {
			status: "low",
			badgeLabel: `Мало (${currentStock})`,
			colorClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
		};
	}
	return {
		status: "normal",
		badgeLabel: `В норме (${currentStock})`,
		colorClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
	};
}

/** Применение техкарты процедурного списания с поддержкой Soft Negative Stock */
export function applyProcedureBatchDeduction(
	items: readonly WarehouseStockItem[],
	techMapId: string,
	multiplier = 1,
): { updatedItems: WarehouseStockItem[]; deductions: SoftDeductionResult[]; totalCostKopecks: number } {
	const techMap = PROCEDURE_TECH_MAPS.find((tm) => tm.id === techMapId);
	if (!techMap) return { updatedItems: [...items], deductions: [], totalCostKopecks: 0 };

	const safeMultiplier = Math.max(1, multiplier);
	const deductions: SoftDeductionResult[] = [];
	let totalCostKopecks = 0;

	const updatedItems = items.map((item) => {
		const deductionReq = techMap.items.find((i) => i.materialId === item.id);
		if (!deductionReq) return { ...item };
		const totalDeduct = deductionReq.quantity * safeMultiplier;
		const prev = item.currentStock;
		const { nextStock, isOverdraft, overdraftAmount } = calculateSoftNegativeStock(prev, totalDeduct);
		const lineCost = totalDeduct * deductionReq.unitCostKopecks;
		totalCostKopecks += lineCost;
		deductions.push({
			materialId: item.id,
			nameRu: item.nameRu,
			quantity: totalDeduct,
			unit: item.unit,
			previousStock: prev,
			newStock: nextStock,
			isOverdraft,
			overdraftAmount,
			totalCostKopecks: lineCost,
		});
		return { ...item, currentStock: nextStock, needsReorder: nextStock <= item.minStock };
	});
	return { updatedItems, deductions, totalCostKopecks };
}

/** Экспресс-приход накладной в 1 клик: автоматическое погашение накопленного овердрафта */
export function applyExpressIncomingInvoice(
	items: readonly WarehouseStockItem[],
	incomingLines: ReadonlyArray<{ materialId: string; quantity: number }>,
): { updatedItems: WarehouseStockItem[]; results: IncomingInvoiceResult[]; totalIncomingKopecks: number } {
	const results: IncomingInvoiceResult[] = [];
	let totalIncomingKopecks = 0;

	const updatedItems = items.map((item) => {
		const line = incomingLines.find((l) => l.materialId === item.id);
		if (!line || line.quantity <= 0) return { ...item };
		const prev = item.currentStock;
		const added = line.quantity;
		const next = prev + added;
		const cleared = prev < 0 ? Math.min(Math.abs(prev), added) : 0;
		const lineCost = added * item.unitCostKopecks;
		totalIncomingKopecks += lineCost;
		results.push({
			materialId: item.id,
			nameRu: item.nameRu,
			addedQuantity: added,
			previousStock: prev,
			newStock: next,
			clearedOverdraft: cleared,
			totalCostKopecks: lineCost,
		});
		return { ...item, currentStock: next, needsReorder: next <= item.minStock };
	});
	return { updatedItems, results, totalIncomingKopecks };
}

/** Экспресс-инвентаризация в 1 клик для соло-практики: выравнивание дефицита до нормы */
export function quickOneClickInventoryAudit(items: readonly WarehouseStockItem[]): {
	updatedItems: WarehouseStockItem[];
	auditedCount: number;
	clearedDeficitCount: number;
} {
	let clearedDeficitCount = 0;
	const updatedItems = items.map((item) => {
		if (item.currentStock < item.minStock) {
			clearedDeficitCount++;
			return { ...item, currentStock: item.minStock, needsReorder: false };
		}
		return { ...item };
	});
	return { updatedItems, auditedCount: items.length, clearedDeficitCount };
}

/** Форматирование целочисленных копеек в рубли без артефактов */
export function formatKopecksToRubles(kopecks: number): string {
	const rubles = Math.round(kopecks / 100);
	return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(rubles);
}
