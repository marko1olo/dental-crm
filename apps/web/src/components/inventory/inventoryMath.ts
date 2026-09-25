/**
 * inventoryMath.ts — Движок технологических карт стоматологических процедур,
 * точного расчета себестоимости материалов (копейки) и контроля складских остатков.
 *
 * СОДЕРЖИТ:
 * 1. Эталонные технологические карты (Bill of Materials) для ключевых процедур:
 *    - Базовый набор СИЗ и антисептики (СанПиН 3.3686-21)
 *    - Местная анестезия (Артикаин 1.7 мл, карпульные иглы 30G)
 *    - Пломбирование кариеса (Адгезив 7 пок., травильный гель, композит Filtek/Gradia, матричные системы)
 *    - Эндодонтия (Гипохлорит Na 3%, ЭДТА гель, эндолубрикант, силер AH Plus, гуттаперчевые штифты, бумажные пины)
 *    - Профессиональная гигиена (Air-Flow глицин, полировочная паста, щетки, фторлак, OptraGate)
 *    - Хирургическое удаление зуба (Гемостатическая губка, шовный материал PTFE, лезвие 15C)
 * 2. Копеечно-точный расчет себестоимости (Kopecks) без накопления ошибок округления.
 * 3. Мониторинг дефицита и критических остатков на складе (Low-Stock & Negative-Stock Alerts).
 * 4. Сопоставление номенклатуры техкарты с реальным складским каталогом (InventoryItem).
 */

import {
	type Kopecks,
	formatKopecksRu,
	multiplyKopecks,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import type { InventoryItem } from "./useInventoryLogic";

export type TechMapCategory =
	| "ppe"
	| "anesthesia"
	| "caries"
	| "endo"
	| "hygiene"
	| "surgery"
	| "other";

export const TECH_MAP_CATEGORY_LABELS: Record<TechMapCategory, string> = {
	ppe: "СИЗ и расходники",
	anesthesia: "Анестезия",
	caries: "Терапия (кариес)",
	endo: "Эндодонтия",
	hygiene: "Профгигиена",
	surgery: "Хирургия",
	other: "Прочие материалы",
};

export const TECH_MAP_CATEGORY_COLORS: Record<
	TechMapCategory,
	{ bg: string; text: string; border: string }
> = {
	ppe: {
		bg: "rgba(59, 130, 246, 0.12)",
		text: "#2563eb",
		border: "rgba(59, 130, 246, 0.3)",
	},
	anesthesia: {
		bg: "rgba(245, 158, 11, 0.12)",
		text: "#d97706",
		border: "rgba(245, 158, 11, 0.3)",
	},
	caries: {
		bg: "rgba(13, 148, 136, 0.12)",
		text: "#0d9488",
		border: "rgba(13, 148, 136, 0.3)",
	},
	endo: {
		bg: "rgba(168, 85, 247, 0.12)",
		text: "#9333ea",
		border: "rgba(168, 85, 247, 0.3)",
	},
	hygiene: {
		bg: "rgba(16, 185, 129, 0.12)",
		text: "#059669",
		border: "rgba(16, 185, 129, 0.3)",
	},
	surgery: {
		bg: "rgba(239, 68, 68, 0.12)",
		text: "#dc2626",
		border: "rgba(239, 68, 68, 0.3)",
	},
	other: {
		bg: "rgba(107, 114, 128, 0.12)",
		text: "#4b5563",
		border: "rgba(107, 114, 128, 0.3)",
	},
};

export interface ProcedureTechMapItem {
	readonly id: string;
	readonly materialName: string;
	readonly category: TechMapCategory;
	readonly unit: string;
	readonly standardQuantity: number;
	readonly defaultUnitCostKopecks: Kopecks;
	readonly lotTrackingRequired?: boolean;
	readonly description?: string;
	readonly order804nCode?: string;
	readonly mandatory?: boolean;
}

export interface ProcedureTechMap {
	readonly id: string;
	readonly code: string;
	readonly title: string;
	readonly specialty: string;
	readonly description: string;
	readonly items: readonly ProcedureTechMapItem[];
}


export * from "./inventoryTechMaps.js";
export * from "./inventorySupplierOrders.js";
import { ALL_PROCEDURE_TECH_MAPS } from "./inventoryTechMaps.js";

/**
 * Клинический пакет списания материалов (1 клик).
 * Объединяет стандартный набор СИЗ, крафт-пакеты стерилизации, анестезию
 * и специализированные материалы процедуры.
 * Мандаты 8e (автономия врача), 8k (CRM != тренажер/симулятор), 8n (соло-врач).
 */
export interface ClinicalTechMapPackage {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly codes: readonly string[];
}

export const CLINICAL_PROCEDURE_PACKAGES: readonly ClinicalTechMapPackage[] = [
	{
		id: "pkg-therapy",
		title: "Пакет Терапия",
		description: "СИЗ + Крафт + Анестезия + Кариес",
		codes: ["SANPIN_PPE", "SANPIN_KRAFT", "A16.07.004", "A16.07.002.001"],
	},
	{
		id: "pkg-endo",
		title: "Пакет Эндодонтия",
		description: "СИЗ + Крафт + Анестезия + Эндо 1 кан.",
		codes: ["SANPIN_PPE", "SANPIN_KRAFT", "A16.07.004", "A16.07.030.001"],
	},
	{
		id: "pkg-hygiene",
		title: "Пакет Гигиена",
		description: "СИЗ + Крафт + Профгигиена",
		codes: ["SANPIN_PPE", "SANPIN_KRAFT", "A16.07.051"],
	},
	{
		id: "pkg-surgery",
		title: "Пакет Хирургия",
		description: "СИЗ + Крафт + Анестезия + Удаление",
		codes: ["SANPIN_PPE", "SANPIN_KRAFT", "A16.07.004", "A16.07.001.001"],
	},
	{
		id: "pkg-implant",
		title: "Пакет Имплантация",
		description: "СИЗ + Крафт + Анестезия + Имплантация",
		codes: ["SANPIN_PPE", "SANPIN_KRAFT", "A16.07.004", "A16.07.054"],
	},
];

/**
 * Позиция списания в текущем сеансе приема
 */
export interface DeductionLineItem {
	readonly id: string;
	readonly materialName: string;
	readonly category: TechMapCategory;
	readonly unit: string;
	quantity: number;
	readonly standardQuantity: number;
	unitCostKopecks: Kopecks;
	stockQuantity: number;
	criticalThreshold: number;
	inventoryItemId?: string | undefined;
	lotNumber?: string | undefined;
	expirationDate?: string | undefined;
	lotTrackingRequired?: boolean | undefined;
	source: "tech_map" | "manual" | "preset";
	techMapCode?: string | undefined;
	mandatory?: boolean | undefined;
}

export interface DeductionStockStatus {
	readonly severity: "ok" | "warning" | "critical";
	readonly remainingStock: number;
	readonly deficit: number;
	readonly message: string;
}

export interface DeductionSummary {
	readonly totalLines: number;
	readonly totalQuantity: number;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostFormatted: string;
	readonly criticalCount: number;
	readonly warningCount: number;
	readonly hasDeficit: boolean;
	readonly categoryBreakdown: Record<
		TechMapCategory,
		{ count: number; costKopecks: Kopecks; costFormatted: string }
	>;
}

/**
 * Расчет стоимости одной строки списания в копейках без потерь плавающей точки.
 */
export function calculateLineCostKopecks(
	unitCostKopecks: Kopecks,
	quantity: number,
): Kopecks {
	if (!Number.isFinite(quantity) || quantity <= 0) return 0;
	if (Number.isInteger(quantity)) {
		return multiplyKopecks(unitCostKopecks, quantity);
	}
	// Дробное количество (например, 0.4 г или 0.1 мл):
	// Точный расчет в копейках с округлением до ближайшей целой копейки
	return Math.round(unitCostKopecks * quantity);
}

/**
 * Расчет суммарной стоимости всех позиций в копейках
 */
export function calculateTotalDeductionCostKopecks(
	lines: readonly { unitCostKopecks: Kopecks; quantity: number }[],
): Kopecks {
	const lineCosts = lines.map((l) =>
		calculateLineCostKopecks(l.unitCostKopecks, l.quantity),
	);
	return sumKopecks(lineCosts);
}

/**
 * Склонение русского слова по числовому количеству (1, 2, 5).
 */
export function pluralizeRussian(
	quantity: number,
	one: string,
	few: string,
	many: string,
): string {
	const abs = Math.abs(quantity);
	if (!Number.isInteger(abs)) {
		return few;
	}
	const mod100 = abs % 100;
	const mod10 = abs % 10;
	if (mod100 >= 11 && mod100 <= 19) {
		return many;
	}
	if (mod10 === 1) {
		return one;
	}
	if (mod10 >= 2 && mod10 <= 4) {
		return few;
	}
	return many;
}

/**
 * Правильное русское склонение единицы измерения в зависимости от количества:
 * - 0 пар, 1 пара, 2 пары, 5 пар, 21 пара
 * - 0 шт., 1 шт., 2 шт., 5 шт.
 * - 0.2 мл, 1 мл, 15 мл
 * - 0.4 г, 1 г, 25 г
 * - 1 карп., 2 карп.
 */
export function declineUnitRu(quantity: number, unit: string): string {
	if (!unit) return "";
	const clean = unit.trim().toLowerCase();

	if (clean === "пары" || clean === "пара" || clean === "пар") {
		return pluralizeRussian(quantity, "пара", "пары", "пар");
	}
	if (clean === "штука" || clean === "штуки" || clean === "штук") {
		return pluralizeRussian(quantity, "штука", "штуки", "штук");
	}
	if (clean === "доза" || clean === "дозы" || clean === "доз") {
		return pluralizeRussian(quantity, "доза", "дозы", "доз");
	}
	if (clean === "карпула" || clean === "карпулы" || clean === "карпул") {
		return pluralizeRussian(quantity, "карпула", "карпулы", "карпул");
	}
	if (clean === "упаковка" || clean === "упаковки" || clean === "упаковок") {
		return pluralizeRussian(quantity, "упаковка", "упаковки", "упаковок");
	}
	if (clean === "комплект" || clean === "комплекта" || clean === "комплектов") {
		return pluralizeRussian(quantity, "комплект", "комплекта", "комплектов");
	}
	if (clean === "тюбик" || clean === "тюбика" || clean === "тюбиков") {
		return pluralizeRussian(quantity, "тюбик", "тюбика", "тюбиков");
	}

	// Стандартные медицинские сокращения (не изменяются): шт., мл, г, карп., упак., компл., флак.
	return unit.trim();
}

/**
 * Форматирование числа и единицы с правильным русским склонением:
 * "2 пары", "1 пара", "0 пар", "5 пар", "0.4 г", "1 карп.", "6 шт."
 */
export function formatQuantityWithUnitRu(quantity: number, unit: string): string {
	const declined = declineUnitRu(quantity, unit);
	return `${quantity} ${declined}`.trim();
}

/**
 * Единичная форма единицы измерения для корректного вывода цен (цена за единицу):
 * "35,00 ₽ / пара" (вместо "35,00 ₽ / пары")
 * "1300,00 ₽ / г"
 * "220,00 ₽ / карп."
 * "15,00 ₽ / шт."
 */
export function formatUnitPriceUnitRu(unit: string): string {
	if (!unit) return "";
	const clean = unit.trim().toLowerCase();

	if (clean === "пары" || clean === "пар" || clean === "пара") {
		return "пара";
	}
	if (clean === "штуки" || clean === "штук" || clean === "штука") {
		return "шт.";
	}
	if (clean === "карпулы" || clean === "карпул" || clean === "карпула") {
		return "карп.";
	}
	if (clean === "упаковки" || clean === "упаковок" || clean === "упаковка") {
		return "упак.";
	}
	if (clean === "комплекты" || clean === "комплектов" || clean === "комплект") {
		return "компл.";
	}
	if (clean === "дозы" || clean === "доз" || clean === "доза") {
		return "доза";
	}

	return unit.trim();
}

/**
 * Оценка статуса складского остатка при планируемом списании:
 * - "critical": отрицательный остаток (дефицит материала на складе)
 * - "warning": остаток после списания упадет ниже критического порога
 * - "ok": остаток достаточен
 */
export function evaluateStockStatus(
	stockQuantity: number,
	quantityToDeduct: number,
	criticalThreshold: number = 0,
	unit: string = "шт.",
): DeductionStockStatus {
	const current = Number.isFinite(stockQuantity) ? stockQuantity : 0;
	const deduct = Number.isFinite(quantityToDeduct) ? quantityToDeduct : 0;
	const threshold = Number.isFinite(criticalThreshold) ? criticalThreshold : 0;

	const remainingStock = Number((current - deduct).toFixed(4));

	if (current <= 0 || remainingStock < 0) {
		const deficit = Math.abs(remainingStock);
		return {
			severity: "critical",
			remainingStock,
			deficit,
			message: `Дефицит на складе! В наличии: ${formatQuantityWithUnitRu(current, unit)}, требуется: ${formatQuantityWithUnitRu(deduct, unit)}, нехватка: ${formatQuantityWithUnitRu(deficit, unit)}`,
		};
	}

	if (remainingStock <= threshold) {
		return {
			severity: "warning",
			remainingStock,
			deficit: 0,
			message: `Низкий остаток! После списания останется ${formatQuantityWithUnitRu(remainingStock, unit)} (порог: ${formatQuantityWithUnitRu(threshold, unit)})`,
		};
	}

	return {
		severity: "ok",
		remainingStock,
		deficit: 0,
		message: `В наличии: ${formatQuantityWithUnitRu(current, unit)} (после списания: ${formatQuantityWithUnitRu(remainingStock, unit)})`,
	};
}

/**
 * Сопоставление наименования материала с реальной складской позицией.
 */
export function matchMaterialToWarehouse(
	materialName: string,
	warehouseItems: readonly InventoryItem[],
): InventoryItem | undefined {
	if (!materialName || !warehouseItems || warehouseItems.length === 0) {
		return undefined;
	}

	const cleanTarget = materialName.toLowerCase().trim();

	// 1. Точное совпадение
	const exact = warehouseItems.find(
		(w) => w.name.toLowerCase().trim() === cleanTarget,
	);
	if (exact) return exact;

	// 2. Поиск по ключевым маркам и паттернам
	const targetTokens = cleanTarget
		.replace(/[()[\]/\\,.-]/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 2);

	let bestMatch: InventoryItem | undefined;
	let maxTokenMatches = 0;

	for (const item of warehouseItems) {
		const itemNameLower = item.name.toLowerCase();
		let matches = 0;
		for (const token of targetTokens) {
			if (itemNameLower.includes(token)) {
				matches++;
			}
		}
		if (matches > maxTokenMatches && matches >= Math.min(2, targetTokens.length)) {
			maxTokenMatches = matches;
			bestMatch = item;
		}
	}

	return bestMatch;
}

/**
 * Построение набора строк списания по выбранным кодам технологических карт
 */
export function createDeductionLinesFromTechMaps(
	selectedMapCodes: readonly string[],
	warehouseItems: readonly InventoryItem[] = [],
	includeCommonPpe: boolean = false,
): DeductionLineItem[] {
	const codesToInclude = new Set<string>(selectedMapCodes);
	if (includeCommonPpe) {
		codesToInclude.add("SANPIN_PPE");
	}

	const lines: DeductionLineItem[] = [];
	const seenItemNames = new Set<string>();

	for (const techMap of ALL_PROCEDURE_TECH_MAPS) {
		if (!codesToInclude.has(techMap.code) && !codesToInclude.has(techMap.id)) {
			continue;
		}

		for (const specItem of techMap.items) {
			const normKey = specItem.materialName.toLowerCase().trim();
			if (seenItemNames.has(normKey)) {
				// Если материал уже есть в списке (например, анестетик), суммируем количество
				const existing = lines.find(
					(l) => l.materialName.toLowerCase().trim() === normKey,
				);
				if (existing) {
					existing.quantity = Number(
						(existing.quantity + specItem.standardQuantity).toFixed(4),
					);
				}
				continue;
			}
			seenItemNames.add(normKey);

			// Ищем соответствие на складе
			const matched = matchMaterialToWarehouse(specItem.materialName, warehouseItems);

			let unitCostKopecks = specItem.defaultUnitCostKopecks;
			let stockQty = 0;
			let criticalThreshold = 0;
			let lotNumber: string | undefined;
			let expirationDate: string | undefined;
			let inventoryItemId: string | undefined;

			if (matched) {
				inventoryItemId = matched.id;
				stockQty = matched.stockQuantity;
				criticalThreshold = matched.criticalThreshold;
				lotNumber = matched.lotNumber;
				expirationDate = matched.expirationDate;
				if (matched.unitCostRub !== undefined && matched.unitCostRub !== "") {
					try {
						unitCostKopecks = parseKopecks(matched.unitCostRub);
					} catch {
						unitCostKopecks = specItem.defaultUnitCostKopecks;
					}
				}
			}

			lines.push({
				id: `line-${specItem.id}-${Date.now()}-${(Date.now() % 100000).toString(36)}`,
				materialName: specItem.materialName,
				category: specItem.category,
				unit: specItem.unit,
				quantity: specItem.standardQuantity,
				standardQuantity: specItem.standardQuantity,
				unitCostKopecks,
				stockQuantity: stockQty,
				criticalThreshold,
				inventoryItemId,
				lotNumber,
				expirationDate,
				lotTrackingRequired: specItem.lotTrackingRequired,
				source: "tech_map",
				techMapCode: techMap.code,
				mandatory: specItem.mandatory,
			});
		}
	}

	return lines;
}

/**
 * Быстрое создание строк списания по клиническому пакету в 1 клик
 * (Мандаты 8e, 8k, 8n)
 */
export function createDeductionLinesFromPackage(
	pkg: ClinicalTechMapPackage | string,
	warehouseItems: readonly InventoryItem[] = [],
): DeductionLineItem[] {
	const targetPackage =
		typeof pkg === "string"
			? CLINICAL_PROCEDURE_PACKAGES.find(
					(p) => p.id === pkg || p.title === pkg,
				)
			: pkg;
	if (!targetPackage) {
		return [];
	}
	return createDeductionLinesFromTechMaps(
		targetPackage.codes,
		warehouseItems,
		true,
	);
}

/**
 * Быстрое добавление произвольного расходника без обязательного наличия в каталоге склада
 * (Solo Doctor & Empty Catalog Resilience, Mandate 8e, Mandate 8n)
 */
export function createQuickCustomLineItem(
	materialName: string,
	options?: {
		unit?: string;
		quantity?: number;
		warehouseItems?: readonly InventoryItem[];
		unitCostRub?: string | number;
	},
): DeductionLineItem {
	const trimmedName = materialName.trim();
	const unit = options?.unit?.trim() || "шт.";
	const qty =
		options?.quantity !== undefined && options.quantity > 0
			? options.quantity
			: 1;
	const warehouseItems = options?.warehouseItems || [];
	const matched = matchMaterialToWarehouse(trimmedName, warehouseItems);

	let unitCostKopecks = 0;
	if (options?.unitCostRub !== undefined) {
		try {
			unitCostKopecks =
				typeof options.unitCostRub === "number"
					? Math.round(options.unitCostRub * 100)
					: parseKopecks(options.unitCostRub);
		} catch {
			unitCostKopecks = 0;
		}
	} else if (matched?.unitCostRub !== undefined && matched.unitCostRub !== "") {
		try {
			unitCostKopecks = parseKopecks(matched.unitCostRub);
		} catch {
			unitCostKopecks = 0;
		}
	}

	return {
		id: `custom-quick-${Date.now()}-${(Date.now() % 100000).toString(36)}`,
		materialName: trimmedName,
		category: "other",
		unit,
		quantity: qty,
		standardQuantity: qty,
		unitCostKopecks,
		stockQuantity: matched?.stockQuantity ?? 0,
		criticalThreshold: matched?.criticalThreshold ?? 0,
		inventoryItemId: matched?.id,
		lotNumber: matched?.lotNumber,
		expirationDate: matched?.expirationDate,
		source: "manual",
		mandatory: false,
	};
}

/**
 * Полный расчет сводки списания по всем позициям и категориям
 */
export function calculateDeductionSummary(
	lines: readonly DeductionLineItem[],
): DeductionSummary {
	let totalQty = 0;
	let totalCostKopecks: Kopecks = 0;
	let criticalCount = 0;
	let warningCount = 0;

	const categoryMap: Record<
		TechMapCategory,
		{ count: number; costKopecks: Kopecks }
	> = {
		ppe: { count: 0, costKopecks: 0 },
		anesthesia: { count: 0, costKopecks: 0 },
		caries: { count: 0, costKopecks: 0 },
		endo: { count: 0, costKopecks: 0 },
		hygiene: { count: 0, costKopecks: 0 },
		surgery: { count: 0, costKopecks: 0 },
		other: { count: 0, costKopecks: 0 },
	};

	for (const line of lines) {
		const qty = Number.isFinite(line.quantity) ? line.quantity : 0;
		totalQty += qty;

		const lineCost = calculateLineCostKopecks(line.unitCostKopecks, qty);
		totalCostKopecks += lineCost;

		const stockStatus = evaluateStockStatus(
			line.stockQuantity,
			qty,
			line.criticalThreshold,
			line.unit,
		);

		if (stockStatus.severity === "critical") {
			criticalCount++;
		} else if (stockStatus.severity === "warning") {
			warningCount++;
		}

		const cat = categoryMap[line.category] ?? categoryMap.other;
		cat.count++;
		cat.costKopecks += lineCost;
	}

	const categoryBreakdown = {} as DeductionSummary["categoryBreakdown"];
	for (const [key, val] of Object.entries(categoryMap) as [
		TechMapCategory,
		{ count: number; costKopecks: Kopecks },
	][]) {
		categoryBreakdown[key] = {
			count: val.count,
			costKopecks: val.costKopecks,
			costFormatted: formatKopecksRu(val.costKopecks),
		};
	}

	return {
		totalLines: lines.length,
		totalQuantity: Number(totalQty.toFixed(4)),
		totalCostKopecks,
		totalCostFormatted: formatKopecksRu(totalCostKopecks),
		criticalCount,
		warningCount,
		hasDeficit: criticalCount > 0,
		categoryBreakdown,
	};
}

