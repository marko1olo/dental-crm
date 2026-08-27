import { z } from "zod";

/**
 * ============================================================================
 * CLINICAL PROCEDURE BOM (BILL OF MATERIALS) & MATERIAL DEDUCTION ENGINE
 * Canonical 804n Nomenclature Technological Maps & Cabinet Stock Automation
 * ============================================================================
 */

/**
 * Supported clinical procedure categories for technological maps.
 */
export const procedureCategorySchema = z.enum([
	"therapy",
	"endo",
	"surgery",
	"implant",
	"hygiene",
	"ortho",
	"perio",
	"whitening",
]);

export type ProcedureCategory = z.infer<typeof procedureCategorySchema>;

/**
 * Unit of measurement for medical and dental consumables.
 */
export const consumableUnitSchema = z.enum([
	"pcs",       // штук
	"carpule",   // карпула (1.7 - 1.8 мл)
	"gram",      // грамм (композит)
	"ml",        // миллилитр (ирригация)
	"pack",      // упаковка / саше
	"tube",      // туба
	"dose",      // разовая доза
	"cm",        // сантиметр (лента, шовник)
]);

export type ConsumableUnit = z.infer<typeof consumableUnitSchema>;

/**
 * Zod schema for a single material item within a standard Procedure BOM.
 */
export const procedureBomItemSchema = z.object({
	sku: z.string().min(1),
	nameRu: z.string().min(1),
	category: z.string().min(1),
	standardQuantity: z.number().positive(),
	unitOfMeasure: consumableUnitSchema,
	estimatedUnitCostKopecks: z.number().int().nonnegative(),
	isOptional: z.boolean().default(false),
	description: z.string().optional(),
});

export type ProcedureBomItem = z.infer<typeof procedureBomItemSchema>;

/**
 * Zod schema for a complete Procedure BOM technological map.
 */
export const procedureBomMapSchema = z.object({
	code804n: z.string().min(1),
	procedureTitleRu: z.string().min(1),
	category: procedureCategorySchema,
	materials: z.array(procedureBomItemSchema),
	defaultDurationMinutes: z.number().int().positive().default(30),
});

export type ProcedureBomMap = z.infer<typeof procedureBomMapSchema>;

/**
 * Canonical Standard Technological Maps (BOM) for 804n Clinical Procedures.
 */
export const STANDARD_PROCEDURE_BOM_MAPS: Record<string, ProcedureBomMap> = {
	// 1. A16.07.002 — Восстановление зуба пломбой (Кариес / Пломбирование светоотверждаемым композитом)
	"A16.07.002": {
		code804n: "A16.07.002",
		procedureTitleRu: "Восстановление зуба пломбой с нанокомпозитом светового отверждения",
		category: "therapy",
		defaultDurationMinutes: 45,
		materials: [
			{
				sku: "MAT-ANES-01",
				nameRu: "Анестетик артикаиновый (Ультракаин Д-С 1:200 000, 1.7 мл)",
				category: "Анестезия",
				standardQuantity: 1,
				unitOfMeasure: "carpule",
				estimatedUnitCostKopecks: 14500, // 145.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-COMP-01",
				nameRu: "Светоотверждаемый нанокомпозит (Filtek Ultimate / Estelite Asteria)",
				category: "Пломбировочные материалы",
				standardQuantity: 0.2,
				unitOfMeasure: "gram",
				estimatedUnitCostKopecks: 38000, // 380.00 ₽ за 0.2г (1900 ₽/г)
				isOptional: false,
			},
			{
				sku: "MAT-MATR-01",
				nameRu: "Секционная матрица контурная металлизированная (Tor VM)",
				category: "Матричные системы",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 4500, // 45.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-BRUSH-01",
				nameRu: "Аппликатор микробраш стоматологический (Microbrush)",
				category: "Расходные материалы",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 1200, // 12.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-ROLL-01",
				nameRu: "Ватные стоматологические валики гигроскопичные (комплект 4 шт)",
				category: "Изоляция",
				standardQuantity: 1,
				unitOfMeasure: "pack",
				estimatedUnitCostKopecks: 800, // 8.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-SUCT-01",
				nameRu: "Одноразовый слюноотсос с фильтром",
				category: "Аспирация",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 1500, // 15.00 ₽
				isOptional: false,
			},
		],
	},

	// 2. A16.07.030 — Эндодонтическое лечение (Пульпит / Инструментальная и медикаментозная обработка 1 канала)
	"A16.07.030": {
		code804n: "A16.07.030",
		procedureTitleRu: "Инструментальная и медикаментозная обработка корневого канала (1 канал)",
		category: "endo",
		defaultDurationMinutes: 60,
		materials: [
			{
				sku: "MAT-ANES-01",
				nameRu: "Анестетик артикаиновый (Ультракаин Д-С 1:200 000, 1.7 мл)",
				category: "Анестезия",
				standardQuantity: 1,
				unitOfMeasure: "carpule",
				estimatedUnitCostKopecks: 14500, // 145.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-COFF-01",
				nameRu: "Платок раббердама латексный / бессиликоновый (Sanctuary)",
				category: "Изоляция",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 9500, // 95.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-NITI-01",
				nameRu: "NiTi ротационный машинный файл (ProTaper Gold / WaveOne Gold)",
				category: "Эндодонтия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 65000, // 650.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-HYPO-01",
				nameRu: "Гипохлорит натрия 3% стабилизированный (шприц 5 мл с эндо-иглой)",
				category: "Ирригация",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 12000, // 120.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-SEAL-01",
				nameRu: "Эпоксидный силер для постоянной обтурации (AH Plus Jet, 0.2г)",
				category: "Эндодонтия",
				standardQuantity: 1,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 42000, // 420.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-GUTT-01",
				nameRu: "Гуттаперчевые конусные штифты калиброванные (3 шт)",
				category: "Эндодонтия",
				standardQuantity: 3,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 4500, // 45.00 ₽ (15 ₽/шт)
				isOptional: false,
			},
		],
	},

	// 3. A16.07.006 — Сложное удаление зуба (Хирургия)
	"A16.07.006": {
		code804n: "A16.07.006",
		procedureTitleRu: "Сложное удаление постоянного зуба с фрагментацией корней",
		category: "surgery",
		defaultDurationMinutes: 45,
		materials: [
			{
				sku: "MAT-ANES-01",
				nameRu: "Анестетик артикаиновый (Ультракаин Д-С Форте 1:100 000, 1.7 мл)",
				category: "Анестезия",
				standardQuantity: 2,
				unitOfMeasure: "carpule",
				estimatedUnitCostKopecks: 29000, // 290.00 ₽ (2 x 145)
				isOptional: false,
			},
			{
				sku: "MAT-SCALP-01",
				nameRu: "Лезвие скальпеля хирургическое стерильное (№ 15C Swann-Morton)",
				category: "Хирургия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 6500, // 65.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-SUTR-01",
				nameRu: "Шовный материал полифиламентный рассасывающийся Vicryl 4-0 (Ethicon)",
				category: "Хирургия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 48000, // 480.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-HEMO-01",
				nameRu: "Гемостатическая антисептическая губка с хлоргексидином (Альвостаз)",
				category: "Хирургия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 18000, // 180.00 ₽
				isOptional: false,
			},
		],
	},

	// 4. A16.07.054 — Внутрикостная дентальная имплантация (Установка имплантата)
	"A16.07.054": {
		code804n: "A16.07.054",
		procedureTitleRu: "Внутрикостная дентальная имплантация (установка титанового имплантата)",
		category: "implant",
		defaultDurationMinutes: 60,
		materials: [
			{
				sku: "MAT-IMPL-01",
				nameRu: "Дентальный имплантат титановый SLA стерильный (Straumann/Osstem/Dentium)",
				category: "Имплантаты",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 1450000, // 14 500.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-COVER-01",
				nameRu: "Винт-заглушка стерильный титановый",
				category: "Имплантаты",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 150000, // 1 500.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-SUTR-01",
				nameRu: "Шовный материал Vicryl 4-0 с атравматической обратной режущей иглой",
				category: "Хирургия",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 48000, // 480.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-ANES-01",
				nameRu: "Анестетик артикаиновый 4% с эпинефрином 1:100 000 (2 карпулы)",
				category: "Анестезия",
				standardQuantity: 2,
				unitOfMeasure: "carpule",
				estimatedUnitCostKopecks: 29000, // 290.00 ₽
				isOptional: false,
			},
		],
	},

	// 5. A16.07.051 — Профессиональная гигиена полости рта (AirFlow + УЗ скейлинг)
	"A16.07.051": {
		code804n: "A16.07.051",
		procedureTitleRu: "Профессиональная гигиена полости рта и удаление зубных отложений (AirFlow + УЗ)",
		category: "hygiene",
		defaultDurationMinutes: 60,
		materials: [
			{
				sku: "MAT-POWD-01",
				nameRu: "Порошок для воздушно-абразивной полировки AirFlow (саше 40г, Glycine/Erythritol)",
				category: "Профгигиена",
				standardQuantity: 1,
				unitOfMeasure: "pack",
				estimatedUnitCostKopecks: 65000, // 650.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-PAST-01",
				nameRu: "Полировочная паста для финишной обработки (Cleanic Prophy Paste)",
				category: "Профгигиена",
				standardQuantity: 1,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 12000, // 120.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-CUP-01",
				nameRu: "Полировочная чашечка / щеточка абразивная угловая",
				category: "Профгигиена",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 4500, // 45.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-OPTR-01",
				nameRu: "Роторасширитель эластичный OptraGate (Ivoclar Vivadent)",
				category: "Изоляция",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 18500, // 185.00 ₽
				isOptional: false,
			},
		],
	},

	// 6. A16.07.004 — Восстановление зуба коронкой (Ортопедия)
	"A16.07.004": {
		code804n: "A16.07.004",
		procedureTitleRu: "Восстановление зуба коронкой (препарирование, ретракция и оттиск)",
		category: "ortho",
		defaultDurationMinutes: 60,
		materials: [
			{
				sku: "MAT-CORD-01",
				nameRu: "Ретракционная нить пропитанная гемостатиком (Ultrapak №00/0)",
				category: "Ортопедия",
				standardQuantity: 20,
				unitOfMeasure: "cm",
				estimatedUnitCostKopecks: 15000, // 150.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-IMPR-01",
				nameRu: "А-силиконовая оттискная масса корригирующий слой (Honigum/Express)",
				category: "Ортопедия",
				standardQuantity: 1,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 75000, // 750.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-TCEM-01",
				nameRu: "Безэвгенольный цемент для временной фиксации (Temp-Bond NE)",
				category: "Ортопедия",
				standardQuantity: 1,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 18000, // 180.00 ₽
				isOptional: false,
			},
		],
	},

	// 7. A16.07.082 — Шинирование подвижных зубов (Пародонтология)
	"A16.07.082": {
		code804n: "A16.07.082",
		procedureTitleRu: "Шинирование зубов при заболеваниях пародонта (стекловолокно Ribbond)",
		category: "perio",
		defaultDurationMinutes: 60,
		materials: [
			{
				sku: "MAT-RIBB-01",
				nameRu: "Стекловолоконная биосовместимая лента (Ribbond THM 2mm / GrandTEC)",
				category: "Пародонтология",
				standardQuantity: 10,
				unitOfMeasure: "cm",
				estimatedUnitCostKopecks: 180000, // 1 800.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-FLOW-01",
				nameRu: "Текучий светоотверждаемый нанокомпозит (Filtek Supreme Flowable, 0.5г)",
				category: "Пломбировочные материалы",
				standardQuantity: 0.5,
				unitOfMeasure: "gram",
				estimatedUnitCostKopecks: 65000, // 650.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-ETCH-01",
				nameRu: "Протравочный гель фосфорной кислоты 37% с индикатором",
				category: "Расходные материалы",
				standardQuantity: 1,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 6000, // 60.00 ₽
				isOptional: false,
			},
		],
	},

	// 8. A16.07.050 — Профессиональное отбеливание зубов (Клиническое отбеливание)
	"A16.07.050": {
		code804n: "A16.07.050",
		procedureTitleRu: "Профессиональное клиническое отбеливание зубов (Zoom / Opalescence Boost)",
		category: "whitening",
		defaultDurationMinutes: 90,
		materials: [
			{
				sku: "MAT-DAM-01",
				nameRu: "Жидкий коффердам светоотверждаемый светонепроницаемый (Liquid Dam)",
				category: "Отбеливание",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 55000, // 550.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-BLEACH-01",
				nameRu: "Гель для клинического отбеливания перекись водорода 38% (Opalescence Boost)",
				category: "Отбеливание",
				standardQuantity: 1,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 320000, // 3 200.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-VITE-01",
				nameRu: "Масляный раствор Витамина Е для нейтрализации и защиты губ",
				category: "Расходные материалы",
				standardQuantity: 2,
				unitOfMeasure: "dose",
				estimatedUnitCostKopecks: 3000, // 30.00 ₽
				isOptional: false,
			},
			{
				sku: "MAT-OPTR-01",
				nameRu: "Роторасширитель эластичный OptraGate (Ivoclar Vivadent)",
				category: "Изоляция",
				standardQuantity: 1,
				unitOfMeasure: "pcs",
				estimatedUnitCostKopecks: 18500, // 185.00 ₽
				isOptional: false,
			},
		],
	},
};

/**
 * Completed procedure input descriptor for calculating BOM deductions.
 */
export const completedProcedureInputSchema = z.object({
	procedureCode804n: z.string().min(1),
	procedureNameRu: z.string().optional(),
	quantity: z.number().int().positive().default(1),
	toothNumber: z.number().int().min(11).max(85).optional(),
	doctorId: z.string().optional(),
	cabinetId: z.string().optional(),
});

export type CompletedProcedureInput = z.infer<typeof completedProcedureInputSchema>;

/**
 * Cabinet stock item data contract for inventory checks.
 */
export const cabinetStockItemSchema = z.object({
	id: z.string().min(1),
	organizationId: z.string().min(1),
	cabinetId: z.string().min(1),
	sku: z.string().min(1),
	nameRu: z.string().min(1),
	currentQuantity: z.number().nonnegative(),
	minThresholdQuantity: z.number().nonnegative().default(5),
	unitOfMeasure: consumableUnitSchema,
	costKopecks: z.number().int().nonnegative().default(0),
});

export type CabinetStockItem = z.infer<typeof cabinetStockItemSchema>;

/**
 * Resolved material requirement item aggregated across all procedures.
 */
export interface ResolvedMaterialRequirement {
	readonly sku: string;
	readonly nameRu: string;
	readonly category: string;
	readonly totalQuantityRequired: number;
	readonly unitOfMeasure: ConsumableUnit;
	readonly totalEstimatedCostKopecks: number;
	readonly procedureBreakdown: readonly {
		readonly code804n: string;
		readonly procedureTitleRu: string;
		readonly quantity: number;
		readonly toothNumber?: number;
		readonly unitQuantity: number;
	}[];
	readonly isAvailableInStock: boolean;
	readonly currentStockQuantity: number;
	readonly shortfallQuantity: number;
}

/**
 * Complete summary of resolved materials for a treatment visit.
 */
export interface ResolvedMaterialRequirementSummary {
	readonly totalProceduresCount: number;
	readonly recognizedProceduresCount: number;
	readonly unrecognizedProceduresCount: number;
	readonly unrecognizedProcedureCodes: readonly string[];
	readonly totalEstimatedCostKopecks: number;
	readonly materials: readonly ResolvedMaterialRequirement[];
	readonly hasStockShortfall: boolean;
}

/**
 * Low stock warning alert item.
 */
export interface LowStockAlert {
	readonly sku: string;
	readonly nameRu: string;
	readonly cabinetId: string;
	readonly previousQuantity: number;
	readonly remainingQuantity: number;
	readonly minThresholdQuantity: number;
	readonly alertLevel: "warning_low_stock" | "critical_out_of_stock";
	readonly messageRu: string;
}

/**
 * Result of a stock deduction operation.
 */
export interface DeductionOperationResult {
	readonly success: boolean;
	readonly totalDeductionCostKopecks: number;
	readonly updatedStock: readonly CabinetStockItem[];
	readonly deductedItems: readonly {
		readonly sku: string;
		readonly nameRu: string;
		readonly deductedQuantity: number;
		readonly previousQuantity: number;
		readonly remainingQuantity: number;
		readonly unitOfMeasure: ConsumableUnit;
	}[];
	readonly lowStockAlerts: readonly LowStockAlert[];
	readonly hasShortfall: boolean;
}

/**
 * Retrieves the standard Bill of Materials (BOM) technological map for an 804n code.
 */
export function getStandardBOMForProcedure(code804n: string): ProcedureBomMap | undefined {
	const normalizedCode = code804n.trim().toUpperCase();
	return STANDARD_PROCEDURE_BOM_MAPS[normalizedCode];
}

/**
 * Pure function: Resolves total material requirements for a set of completed 804n procedures.
 * Cross-references with optional cabinet stock to detect shortfalls.
 */
export function resolveProcedureMaterials(
	procedures: readonly CompletedProcedureInput[],
	currentStock?: readonly CabinetStockItem[],
): ResolvedMaterialRequirementSummary {
	const stockMap = new Map<string, CabinetStockItem>();
	if (currentStock) {
		for (const item of currentStock) {
			stockMap.set(item.sku.trim().toUpperCase(), item);
		}
	}

	const materialMap = new Map<
		string,
		{
			sku: string;
			nameRu: string;
			category: string;
			totalQuantityRequired: number;
			unitOfMeasure: ConsumableUnit;
			totalEstimatedCostKopecks: number;
			procedureBreakdown: Array<{
				code804n: string;
				procedureTitleRu: string;
				quantity: number;
				toothNumber?: number;
				unitQuantity: number;
			}>;
		}
	>();

	let totalProceduresCount = 0;
	let recognizedProceduresCount = 0;
	const unrecognizedProcedureCodes: string[] = [];

	for (const proc of procedures) {
		totalProceduresCount += proc.quantity;
		const bom = getStandardBOMForProcedure(proc.procedureCode804n);

		if (!bom) {
			unrecognizedProcedureCodes.push(proc.procedureCode804n);
			continue;
		}

		recognizedProceduresCount += proc.quantity;

		for (const mat of bom.materials) {
			const skuKey = mat.sku.trim().toUpperCase();
			const qtyNeeded = Number((mat.standardQuantity * proc.quantity).toFixed(4));
			const costKopecks = Math.round(mat.estimatedUnitCostKopecks * proc.quantity * mat.standardQuantity);

			const existing = materialMap.get(skuKey);
			if (existing) {
				existing.totalQuantityRequired = Number((existing.totalQuantityRequired + qtyNeeded).toFixed(4));
				existing.totalEstimatedCostKopecks += costKopecks;
				existing.procedureBreakdown.push({
					code804n: bom.code804n,
					procedureTitleRu: bom.procedureTitleRu,
					quantity: proc.quantity,
					...(proc.toothNumber !== undefined ? { toothNumber: proc.toothNumber } : {}),
					unitQuantity: mat.standardQuantity,
				});
			} else {
				materialMap.set(skuKey, {
					sku: mat.sku,
					nameRu: mat.nameRu,
					category: mat.category,
					totalQuantityRequired: qtyNeeded,
					unitOfMeasure: mat.unitOfMeasure,
					totalEstimatedCostKopecks: costKopecks,
					procedureBreakdown: [
						{
							code804n: bom.code804n,
							procedureTitleRu: bom.procedureTitleRu,
							quantity: proc.quantity,
							...(proc.toothNumber !== undefined ? { toothNumber: proc.toothNumber } : {}),
							unitQuantity: mat.standardQuantity,
						},
					],
				});
			}
		}
	}

	let grandTotalCostKopecks = 0;
	let hasStockShortfall = false;

	const resolvedMaterials: ResolvedMaterialRequirement[] = Array.from(materialMap.values()).map((item) => {
		grandTotalCostKopecks += item.totalEstimatedCostKopecks;
		const stockItem = stockMap.get(item.sku.trim().toUpperCase());
		const currentStockQty = stockItem ? stockItem.currentQuantity : 0;
		const shortfall = Math.max(0, Number((item.totalQuantityRequired - currentStockQty).toFixed(4)));

		if (stockItem && shortfall > 0) {
			hasStockShortfall = true;
		}

		return {
			sku: item.sku,
			nameRu: item.nameRu,
			category: item.category,
			totalQuantityRequired: item.totalQuantityRequired,
			unitOfMeasure: item.unitOfMeasure,
			totalEstimatedCostKopecks: item.totalEstimatedCostKopecks,
			procedureBreakdown: item.procedureBreakdown,
			isAvailableInStock: shortfall === 0,
			currentStockQuantity: currentStockQty,
			shortfallQuantity: shortfall,
		};
	});

	return {
		totalProceduresCount,
		recognizedProceduresCount,
		unrecognizedProceduresCount: unrecognizedProcedureCodes.length,
		unrecognizedProcedureCodes,
		totalEstimatedCostKopecks: grandTotalCostKopecks,
		materials: resolvedMaterials,
		hasStockShortfall,
	};
}

/**
 * Pure function: Decrements cabinet inventory and alerts if stock falls below minimum reorder threshold.
 */
export function deductMaterialsFromCabinetStock(
	stock: readonly CabinetStockItem[],
	requirements: readonly ResolvedMaterialRequirement[],
): DeductionOperationResult {
	const stockCopy: CabinetStockItem[] = stock.map((s) => ({ ...s }));
	const stockMap = new Map<string, CabinetStockItem>();

	for (const s of stockCopy) {
		stockMap.set(s.sku.trim().toUpperCase(), s);
	}

	const deductedItems: Array<{
		sku: string;
		nameRu: string;
		deductedQuantity: number;
		previousQuantity: number;
		remainingQuantity: number;
		unitOfMeasure: ConsumableUnit;
	}> = [];

	const lowStockAlerts: LowStockAlert[] = [];
	let totalDeductionCostKopecks = 0;
	let hasShortfall = false;

	for (const req of requirements) {
		const skuKey = req.sku.trim().toUpperCase();
		const stockItem = stockMap.get(skuKey);

		if (!stockItem) {
			hasShortfall = true;
			continue;
		}

		const prevQty = stockItem.currentQuantity;
		const deductQty = req.totalQuantityRequired;
		const newQty = Math.max(0, Number((prevQty - deductQty).toFixed(4)));

		if (prevQty < deductQty) {
			hasShortfall = true;
		}

		stockItem.currentQuantity = newQty;
		totalDeductionCostKopecks += req.totalEstimatedCostKopecks;

		deductedItems.push({
			sku: req.sku,
			nameRu: req.nameRu,
			deductedQuantity: deductQty,
			previousQuantity: prevQty,
			remainingQuantity: newQty,
			unitOfMeasure: req.unitOfMeasure,
		});

		// Check if threshold breached
		if (newQty === 0) {
			lowStockAlerts.push({
				sku: req.sku,
				nameRu: req.nameRu,
				cabinetId: stockItem.cabinetId,
				previousQuantity: prevQty,
				remainingQuantity: newQty,
				minThresholdQuantity: stockItem.minThresholdQuantity,
				alertLevel: "critical_out_of_stock",
				messageRu: `Критический остаток: «${req.nameRu}» полностью израсходован в кабинете #${stockItem.cabinetId} (Остаток: 0 ${req.unitOfMeasure})!`,
			});
		} else if (newQty <= stockItem.minThresholdQuantity) {
			lowStockAlerts.push({
				sku: req.sku,
				nameRu: req.nameRu,
				cabinetId: stockItem.cabinetId,
				previousQuantity: prevQty,
				remainingQuantity: newQty,
				minThresholdQuantity: stockItem.minThresholdQuantity,
				alertLevel: "warning_low_stock",
				messageRu: `Низкий остаток: «${req.nameRu}» в кабинете #${stockItem.cabinetId} составляет ${newQty} ${req.unitOfMeasure} (порог перезаказа: ${stockItem.minThresholdQuantity} ${req.unitOfMeasure}).`,
			});
		}
	}

	return {
		success: !hasShortfall,
		totalDeductionCostKopecks,
		updatedStock: stockCopy,
		deductedItems,
		lowStockAlerts,
		hasShortfall,
	};
}

/**
 * Pure helper: Calculates the material cost and items breakdown for a specific 804n procedure.
 */
export function calculateProcedureMaterialsCost(
	procedureCode804n: string,
	quantity = 1,
): {
	totalCostKopecks: number;
	materials: Array<{ nameRu: string; qty: number; unit: ConsumableUnit; costKopecks: number }>;
} {
	const bom = getStandardBOMForProcedure(procedureCode804n);
	if (!bom) {
		return { totalCostKopecks: 0, materials: [] };
	}

	let total = 0;
	const mats = bom.materials.map((m) => {
		const itemQty = Number((m.standardQuantity * quantity).toFixed(4));
		const itemCost = Math.round(m.estimatedUnitCostKopecks * quantity * m.standardQuantity);
		total += itemCost;
		return {
			nameRu: m.nameRu,
			qty: itemQty,
			unit: m.unitOfMeasure,
			costKopecks: itemCost,
		};
	});

	return {
		totalCostKopecks: total,
		materials: mats,
	};
}
