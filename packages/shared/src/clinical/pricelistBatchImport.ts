/**
 * DENTE Dental CRM — Universal Tabular Price List Import, Auto-Mapping & Deduplication Engine
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8m, 8n, 8s, 8t, 8z:
 * 1. Native format signatures: IDENT, DentalPRO, iStom, 1C:Медицина, arbitrary solo-doctor sheets.
 * 2. Intelligent column auto-mapping: clinic code, Minzdrav 804n code, commercial title,
 *    category/specialty, price in rubles & kopecks, consumables/lab costs, duration, warranty.
 * 3. Kopeck-exact price extraction & normalization:
 *    - "1 500,50 руб", "1500.50 ₽", "1 500-00", "от 2500 руб"
 *    - "бесплатно", "по гарантии", "0" -> 0.00 ₽
 *    - "договорная", negative, NaN -> flagged with actionable human Russian errors
 * 4. Deduplication & Collision Strategies:
 *    - "update_existing" (Обновить цены существующих)
 *    - "skip_duplicates" (Пропустить дубликаты)
 *    - "create_new" (Создать новую позицию)
 * 5. Statutory Minzdrav Order 804n nomenclature matching:
 *    - ZERO MOCKS: never emits fake codes like A16.07.999.xxx!
 *    - Uses real statutory codes (A16.07.002, A16.07.004, B01.065.001, etc.).
 * 6. Actionable error reporting with row numbers and exact problem description.
 */

import { z } from "zod";
import type { DentalSpecialty, ServiceCatalogItem, ServiceCategory } from "../index.js";
import { parseKopecks } from "../money.js";

// =============================================================================
// 1. DATA CONTRACTS & TYPES
// =============================================================================

export type PricelistVendorSignature =
	| "ident"
	| "dentalpro"
	| "istom"
	| "1c_medicina"
	| "generic_table";

export const PRICELIST_VENDOR_LABELS: Record<PricelistVendorSignature, string> = {
	ident: "IDENT",
	dentalpro: "DentalPRO",
	istom: "iStom",
	"1c_medicina": "1С:Медицина",
	generic_table: "Таблица Excel / CSV",
};

export type PricelistCollisionStrategy =
	| "update_existing"
	| "skip_duplicates"
	| "create_new";

export const PRICELIST_COLLISION_STRATEGY_LABELS: Record<
	PricelistCollisionStrategy,
	string
> = {
	update_existing: "Обновить цены существующих услуг (Рекомендуется)",
	skip_duplicates: "Пропустить существующие услуги (без перезаписи)",
	create_new: "Создать все позиции как новые",
};

export type PricelistColumnTargetKey =
	| "code"
	| "order804nCode"
	| "title"
	| "category"
	| "specialty"
	| "priceRub"
	| "costRub"
	| "durationMinutes"
	| "warrantyMonths"
	| "ignore";

export const PRICELIST_COLUMN_TARGET_LABELS: Record<
	PricelistColumnTargetKey,
	string
> = {
	code: "Артикул / Код клиники",
	order804nCode: "Код номенклатуры 804н",
	title: "Наименование услуги",
	category: "Раздел / Группа",
	specialty: "Специализация врача",
	priceRub: "Цена (руб)",
	costRub: "Себестоимость / Расход",
	durationMinutes: "Длительность (мин)",
	warrantyMonths: "Гарантия (мес)",
	ignore: "Не импортировать",
};

export interface ColumnMappingConfig {
	codeCol?: number | undefined;
	order804nCol?: number | undefined;
	titleCol: number;
	categoryCol?: number | undefined;
	specialtyCol?: number | undefined;
	priceCol: number;
	costCol?: number | undefined;
	durationCol?: number | undefined;
	warrantyCol?: number | undefined;
}

export interface ParsedTabularRow {
	rowNumber: number; // 1-based (Excel row index)
	rawCells: string[];
	code?: string | undefined;
	order804nCode?: string | undefined;
	commercialTitle: string;
	category: ServiceCategory;
	specialty: DentalSpecialty;
	priceRub: number;
	priceKopecks: number;
	costRub?: number | undefined;
	durationMinutes: number;
	warrantyMonths?: number | undefined;
	validationStatus: "valid" | "warning" | "error";
	validationMessage?: string | undefined;
	suggestedAction: "create_new" | "update_existing" | "identical";
	matchedExistingServiceId?: string | null | undefined;
	matchedExistingTitle?: string | null | undefined;
	matchedExistingPriceRub?: number | null | undefined;
}

export interface TabularRowValidationError {
	rowNumber: number;
	field: string;
	message: string;
	rawCell?: string | undefined;
}

export interface TabularImportAnalysis {
	vendorSignature: PricelistVendorSignature;
	vendorLabel: string;
	detectedMapping: ColumnMappingConfig;
	headerRowIndex: number;
	headers: string[];
	previewRows: ParsedTabularRow[];
	allRows: ParsedTabularRow[];
	totalRows: number;
	validRowsCount: number;
	errorRowsCount: number;
	stats: {
		newCount: number;
		updateCount: number;
		identicalCount: number;
	};
	errors: TabularRowValidationError[];
}

// =============================================================================
// 2. CANONICAL STATUTORY 804N FALLBACKS (ZERO MOCKS)
// =============================================================================

export const STATUTORY_CATEGORY_CODES_MAP: Record<ServiceCategory, string> = {
	therapy: "A16.07.002", // Восстановление зуба пломбой
	prosthetics: "A16.07.004", // Восстановление зуба коронкой
	surgery: "A16.07.001", // Удаление зуба
	orthodontics: "A16.07.048", // Ортодонтическая коррекция
	hygiene: "A16.07.051", // Профессиональная гигиена полости рта
	periodontology: "A16.07.018", // Пособие при пародонтологических вмешательствах
	imaging: "A06.07.007", // Внутриротовая прицельная рентгенография
	consultation: "B01.065.001", // Прием (осмотр, консультация) врача-стоматолога
	documents: "B01.065.001", // Официальные медицинские документы
	other: "A16.07.002",
};

export const STATUTORY_CATEGORY_DURATIONS_MAP: Record<ServiceCategory, number> = {
	therapy: 45,
	prosthetics: 60,
	surgery: 45,
	orthodontics: 30,
	hygiene: 60,
	periodontology: 45,
	imaging: 15,
	consultation: 30,
	documents: 15,
	other: 30,
};

// =============================================================================
// 3. ROBUST PRICE NORMALIZER (WITH EXACT KOPECKS)
// =============================================================================

export interface PriceParseResult {
	success: boolean;
	priceRub: number;
	priceKopecks: number;
	isWarrantyOrFree: boolean;
	error?: string | undefined;
}

/**
 * Normalizes dirty clinic price representations into exact rubles & kopecks.
 * Catches negative, NaN, "договорная", "бесплатно", "1500-00", "от 2500 руб".
 */
export function normalizePricelistPrice(raw: unknown): PriceParseResult {
	if (raw === null || raw === undefined) {
		return {
			success: false,
			priceRub: 0,
			priceKopecks: 0,
			isWarrantyOrFree: false,
			error: "Цена не указана",
		};
	}

	const str = String(raw).trim();
	if (!str) {
		return {
			success: false,
			priceRub: 0,
			priceKopecks: 0,
			isWarrantyOrFree: false,
			error: "Цена пустая",
		};
	}

	const lower = str.toLowerCase();

	// Free / warranty cases
	if (
		lower === "бесплатно" ||
		lower === "по гарантии" ||
		lower === "гарантия" ||
		lower === "0" ||
		lower === "0.00" ||
		lower === "0-00" ||
		lower === "0 руб" ||
		lower === "0 руб." ||
		lower === "0 ₽"
	) {
		return {
			success: true,
			priceRub: 0,
			priceKopecks: 0,
			isWarrantyOrFree: true,
		};
	}

	// Contract / variable price
	if (
		lower.includes("договор") ||
		lower.includes("индивидуальн") ||
		lower.includes("расчет") ||
		lower.includes("расчёт") ||
		lower.includes("по факту")
	) {
		return {
			success: false,
			priceRub: 0,
			priceKopecks: 0,
			isWarrantyOrFree: false,
			error: "Цена договорная: укажите фиксированную сумму в рублях",
		};
	}

	// Negative prices are strictly prohibited
	if (/^-\s*\d/.test(str)) {
		return {
			success: false,
			priceRub: 0,
			priceKopecks: 0,
			isWarrantyOrFree: false,
			error: "Цена не может быть отрицательной",
		};
	}

	// Clean currency symbols, "от", whitespace, non-breaking spaces
	let cleaned = str
		.replace(/^от\s+/i, "")
		.replace(/руб(?:л(?:ей|я)|ь)?\.?|р\.?|₽/gi, "")
		.replace(/\s+/g, "")
		.replace(/\u00A0/g, "");

	// Handle Soviet/Russian accounting notation: "1500-00" -> "1500.00"
	cleaned = cleaned.replace(/-00$/, ".00");
	// Handle comma decimals: "1500,50" -> "1500.50"
	cleaned = cleaned.replace(/,/g, ".");

	const num = parseFloat(cleaned);
	if (!Number.isFinite(num) || Number.isNaN(num)) {
		return {
			success: false,
			priceRub: 0,
			priceKopecks: 0,
			isWarrantyOrFree: false,
			error: `Не удалось распознать цену: "${str}"`,
		};
	}

	if (num < 0) {
		return {
			success: false,
			priceRub: 0,
			priceKopecks: 0,
			isWarrantyOrFree: false,
			error: "Цена не может быть отрицательной",
		};
	}

	if (num > 10_000_000) {
		return {
			success: false,
			priceRub: 0,
			priceKopecks: 0,
			isWarrantyOrFree: false,
			error: "Цена превышает предельное значение (10 000 000 руб)",
		};
	}

	const priceKopecks = Math.round(num * 100);
	const priceRub = Math.round(num * 100) / 100;

	return {
		success: true,
		priceRub,
		priceKopecks,
		isWarrantyOrFree: priceRub === 0,
	};
}

// =============================================================================
// 4. CATEGORY & SPECIALTY NORMALIZERS
// =============================================================================

export function normalizeServiceCategoryName(cat: string): ServiceCategory {
	const c = (cat || "").toLowerCase().trim();
	if (
		c === "therapy" ||
		c === "терапия" ||
		c.includes("кариес") ||
		c.includes("пульпит") ||
		c.includes("эндодонт") ||
		c.includes("реставрац") ||
		c.includes("пломб")
	) {
		return "therapy";
	}
	if (
		c === "surgery" ||
		c === "хирургия" ||
		c.includes("удален") ||
		c.includes("имплант") ||
		c.includes("синус") ||
		c.includes("костн")
	) {
		return "surgery";
	}
	if (
		c === "orthopedics" ||
		c === "prosthetics" ||
		c === "ортопедия" ||
		c === "протезирование" ||
		c.includes("корон") ||
		c.includes("винир") ||
		c.includes("протез") ||
		c.includes("вкладк") ||
		c.includes("зуботехническ")
	) {
		return "prosthetics";
	}
	if (
		c === "orthodontics" ||
		c === "ортодонтия" ||
		c.includes("брекет") ||
		c.includes("элайн") ||
		c.includes("прикус")
	) {
		return "orthodontics";
	}
	if (
		c === "hygiene" ||
		c === "гигиена" ||
		c.includes("чистк") ||
		c.includes("air-flow") ||
		c.includes("отбел") ||
		c.includes("профгигиен")
	) {
		return "hygiene";
	}
	if (
		c === "periodontology" ||
		c === "пародонтология" ||
		c.includes("пародонт") ||
		c.includes("десн") ||
		c.includes("кюретаж")
	) {
		return "periodontology";
	}
	if (
		c === "diagnostics" ||
		c === "imaging" ||
		c === "диагностика" ||
		c.includes("рентген") ||
		c.includes("сним") ||
		c.includes("оптг") ||
		c.includes("кт") ||
		c.includes("клкт") ||
		c.includes("визиограф")
	) {
		return "imaging";
	}
	if (
		c === "consultation" ||
		c === "консультация" ||
		c.includes("консульт") ||
		c.includes("осмотр") ||
		c.includes("прием") ||
		c.includes("приём")
	) {
		return "consultation";
	}
	if (
		c === "documents" ||
		c === "документы" ||
		c.includes("справк") ||
		c.includes("вычет")
	) {
		return "documents";
	}
	return "other";
}

export function normalizeDoctorSpecialtyName(spec: string): DentalSpecialty {
	const s = (spec || "").toLowerCase().trim();
	if (s.includes("терапевт") || s === "therapist") return "therapist";
	if (s.includes("ортопед") || s === "orthopedist") return "orthopedist";
	if (s.includes("хирург") || s === "surgeon") return "surgeon";
	if (s.includes("ортодонт") || s === "orthodontist") return "orthodontist";
	if (s.includes("пародонтолог") || s === "periodontist") return "periodontist";
	if (s.includes("гигиенист") || s === "hygienist") return "hygienist";
	if (s.includes("детск") || s === "pediatric") return "pediatric";
	if (s.includes("имплантолог") || s === "implantologist") return "implantologist";
	if (s.includes("рентгенолог") || s === "radiologist") return "radiologist";
	return "universal";
}

// =============================================================================
// 5. VENDOR SIGNATURE DETECTOR & COLUMN AUTO-MAPPER
// =============================================================================

export function detectVendorSignature(headers: readonly string[]): PricelistVendorSignature {
	const norm = headers.map((h) => (h || "").toLowerCase().trim());
	const has = (keyword: string) => norm.some((h) => h.includes(keyword));

	// 1. 1C:Медицина (КодНоменклатуры, Номенклатура, ГруппаНоменклатуры)
	if (
		has("кодноменклатуры") ||
		(has("номенклатура") && (has("группаноменклатуры") || has("родитель")))
	) {
		return "1c_medicina";
	}

	// 2. IDENT (Артикул, Группа, Наименование, Цена, Себестоимость)
	if (has("артикул") && (has("группа") || has("себестоимость"))) {
		return "ident";
	}

	// 3. DentalPRO (Код, Услуга, Категория, Стоимость, Время)
	if (has("услуга") && (has("стоимость") || has("время"))) {
		return "dentalpro";
	}

	// 4. iStom (Код услуги, Наименование услуги, Раздел, Тариф)
	if (has("тариф") && (has("раздел") || has("наименование услуги"))) {
		return "istom";
	}

	return "generic_table";
}

export function autoMapColumns(headers: readonly string[]): ColumnMappingConfig {
	const norm = headers.map((h) => (h || "").toLowerCase().trim());

	const findIndex = (regexes: readonly RegExp[]): number | undefined => {
		for (let i = 0; i < norm.length; i++) {
			const header = norm[i];
			if (!header) continue;
			for (const r of regexes) {
				if (r.test(header)) return i;
			}
		}
		return undefined;
	};

	// 804n code has priority over general code
	const order804nCol = findIndex([
		/^код\s*804/i,
		/^804н/i,
		/код\s*по\s*804/i,
		/номенклатурный\s*код/i,
	]);

	// General clinic code / SKU
	const codeCol = findIndex([
		/^артикул$/i,
		/^кодноменклатуры$/i,
		/^код\s*услуги$/i,
		/^код$/i,
		/^арт$/i,
		/^№\s*п\/?п$/i,
		/^номер$/i,
		/^id$/i,
	]);

	// Commercial Title
	let titleCol = findIndex([
		/^коммерческое\s*наименование/i,
		/^наименование\s*услуги/i,
		/^наименование/i,
		/^услуга/i,
		/^номенклатура/i,
		/^название/i,
		/^процедура/i,
	]);
	if (titleCol === undefined) {
		// Fallback: look for "описание" or any header with "услуг"
		titleCol = findIndex([/услуг/i, /наимен/i, /назван/i]);
	}
	if (titleCol === undefined) {
		titleCol = 1; // standard Excel fallback
	}

	// Category
	const categoryCol = findIndex([
		/^группаноменклатуры/i,
		/^группа/i,
		/^категория/i,
		/^раздел/i,
		/^папка/i,
		/^направление/i,
		/^отделение/i,
	]);

	// Doctor Specialty
	const specialtyCol = findIndex([
		/^специализация/i,
		/^специальность/i,
		/^врач/i,
		/^доктор/i,
	]);

	// Price (Rubles)
	let priceCol = findIndex([
		/^цена\s*стандарт/i,
		/^базовая\s*цена/i,
		/^цена\s*\(?руб\)?/i,
		/^стоимость\s*\(?руб\)?/i,
		/^цена/i,
		/^стоимость/i,
		/^тариф/i,
		/^прайс/i,
		/^руб/i,
	]);
	if (priceCol === undefined) {
		priceCol = findIndex([/цен/i, /стоим/i, /тариф/i]);
	}
	if (priceCol === undefined) {
		priceCol = Math.min(2, headers.length - 1);
	}

	// Consumables / Cost
	const costCol = findIndex([
		/^себестоимость/i,
		/^материалы/i,
		/^расходные/i,
		/^расход/i,
		/^лаборатория/i,
	]);

	// Duration (minutes)
	const durationCol = findIndex([
		/^длительность/i,
		/^время/i,
		/^минут/i,
		/^хронометраж/i,
	]);

	// Warranty (months)
	const warrantyCol = findIndex([
		/^срок\s*гарантии/i,
		/^гарантия/i,
		/^гарантия\s*\(?мес\)?/i,
	]);

	return {
		codeCol,
		order804nCol,
		titleCol,
		categoryCol,
		specialtyCol,
		priceCol,
		costCol,
		durationCol,
		warrantyCol,
	};
}

/**
 * Searches the first 10 rows of a sheet to locate the true header row.
 * Skips preamble rows (e.g. Clinic name, address, empty rows).
 */
export function findHeaderRowIndex(rows: readonly string[][]): number {
	const headerKeywords = [
		/наименование/i,
		/услуга/i,
		/номенклатура/i,
		/цена/i,
		/стоимость/i,
		/тариф/i,
		/код/i,
		/артикул/i,
		/раздел/i,
		/категория/i,
		/группа/i,
	];

	let bestRowIndex = 0;
	let highestScore = 0;

	const scanLimit = Math.min(10, rows.length);
	for (let r = 0; r < scanLimit; r++) {
		const row = rows[r];
		if (!row || row.length === 0) continue;

		let score = 0;
		for (const cell of row) {
			const cellText = (cell || "").trim();
			if (!cellText) continue;
			for (const kw of headerKeywords) {
				if (kw.test(cellText)) {
					score += 10;
					break;
				}
			}
		}

		// Header row must have at least 2 matching header concepts (e.g. title + price)
		if (score > highestScore && score >= 20) {
			highestScore = score;
			bestRowIndex = r;
		}
	}

	return bestRowIndex;
}

// =============================================================================
// 6. DEDUPLICATION & CROSS-REFERENCING ENGINE
// =============================================================================

function normalizeTitleForComparison(title: string): string {
	return title
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[«»""''„“]/g, '"')
		.replace(/[^a-zа-я0-9\s]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Fast Levenshtein distance similarity (0..1) for title deduplication.
 */
function titleSimilarity(s1: string, s2: string): number {
	if (s1 === s2) return 1.0;
	if (!s1 || !s2) return 0.0;
	if (s1.includes(s2) || s2.includes(s1)) {
		const minLen = Math.min(s1.length, s2.length);
		const maxLen = Math.max(s1.length, s2.length);
		return Math.max(0.85, minLen / maxLen);
	}

	const len1 = s1.length;
	const len2 = s2.length;
	if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.4) return 0.0;

	// Bounded matrix for short prefixes
	const d: number[][] = [];
	for (let i = 0; i <= len1; i++) d[i] = [i];
	// biome-ignore lint/style/noNonNullAssertion: safe 0-index initialization
	for (let j = 0; j <= len2; j++) d[0]![j] = j;

	for (let i = 1; i <= len1; i++) {
		for (let j = 1; j <= len2; j++) {
			const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
			// biome-ignore lint/style/noNonNullAssertion: bounded array
			d[i]![j] = Math.min(
				d[i - 1]![j]! + 1,
				d[i]![j - 1]! + 1,
				d[i - 1]![j - 1]! + cost,
			);
		}
	}

	// biome-ignore lint/style/noNonNullAssertion: bounded matrix access
	const dist = d[len1]![len2]!;
	const maxLen = Math.max(len1, len2);
	return 1 - dist / maxLen;
}

export function crossReferenceTabularRow(
	itemCode: string | undefined,
	itemTitle: string,
	priceKopecks: number,
	existingItems: readonly ServiceCatalogItem[],
): {
	action: "create_new" | "update_existing" | "identical";
	matchedId?: string | null | undefined;
	matchedTitle?: string | null | undefined;
	matchedPriceRub?: number | null | undefined;
} {
	if (!existingItems || existingItems.length === 0) {
		return { action: "create_new" };
	}

	const normCode = (itemCode || "").trim().toUpperCase();
	const normTitle = normalizeTitleForComparison(itemTitle);

	// 1. Exact Code Match
	if (normCode) {
		const matchByCode = existingItems.find(
			(e) => (e.code || "").trim().toUpperCase() === normCode,
		);
		if (matchByCode) {
			const existingKopecks = Math.round((matchByCode.basePriceRub ?? 0) * 100);
			const isSamePrice = existingKopecks === priceKopecks;
			return {
				action: isSamePrice ? "identical" : "update_existing",
				matchedId: matchByCode.id,
				matchedTitle: matchByCode.title,
				matchedPriceRub: matchByCode.basePriceRub,
			};
		}
	}

	// 2. Exact Normalized Title Match
	const matchByTitle = existingItems.find(
		(e) => normalizeTitleForComparison(e.title) === normTitle,
	);
	if (matchByTitle) {
		const existingKopecks = Math.round((matchByTitle.basePriceRub ?? 0) * 100);
		const isSamePrice = existingKopecks === priceKopecks;
		return {
			action: isSamePrice ? "identical" : "update_existing",
			matchedId: matchByTitle.id,
			matchedTitle: matchByTitle.title,
			matchedPriceRub: matchByTitle.basePriceRub,
		};
	}

	// 3. Fuzzy Title Match (Similarity >= 0.85)
	if (normTitle.length >= 8) {
		let bestMatch: ServiceCatalogItem | null = null;
		let bestSim = 0;

		for (const e of existingItems) {
			const sim = titleSimilarity(
				normTitle,
				normalizeTitleForComparison(e.title),
			);
			if (sim > bestSim && sim >= 0.85) {
				bestSim = sim;
				bestMatch = e;
			}
		}

		if (bestMatch) {
			const existingKopecks = Math.round((bestMatch.basePriceRub ?? 0) * 100);
			const isSamePrice = existingKopecks === priceKopecks;
			return {
				action: isSamePrice ? "identical" : "update_existing",
				matchedId: bestMatch.id,
				matchedTitle: bestMatch.title,
				matchedPriceRub: bestMatch.basePriceRub,
			};
		}
	}

	return { action: "create_new" };
}

// =============================================================================
// 7. FULL TABULAR ANALYSIS PIPELINE
// =============================================================================

export function analyzeTabularPricelist({
	rows,
	customMapping,
	existingCatalog = [],
}: {
	readonly rows: readonly string[][];
	readonly customMapping?: Partial<ColumnMappingConfig> | undefined;
	readonly existingCatalog?: readonly ServiceCatalogItem[] | undefined;
}): TabularImportAnalysis {
	if (!rows || rows.length === 0) {
		return {
			vendorSignature: "generic_table",
			vendorLabel: PRICELIST_VENDOR_LABELS.generic_table,
			detectedMapping: { titleCol: 0, priceCol: 1 },
			headerRowIndex: 0,
			headers: [],
			previewRows: [],
			allRows: [],
			totalRows: 0,
			validRowsCount: 0,
			errorRowsCount: 0,
			stats: { newCount: 0, updateCount: 0, identicalCount: 0 },
			errors: [{ rowNumber: 1, field: "file", message: "Файл не содержит строк данных" }],
		};
	}

	const headerRowIndex = findHeaderRowIndex(rows);
	const headers = (rows[headerRowIndex] || []).map((h) => (h || "").trim());

	const vendorSignature = detectVendorSignature(headers);
	const vendorLabel = PRICELIST_VENDOR_LABELS[vendorSignature];

	const autoMapping = autoMapColumns(headers);
	const effectiveMapping: ColumnMappingConfig = {
		...autoMapping,
		...customMapping,
		titleCol: customMapping?.titleCol ?? autoMapping.titleCol,
		priceCol: customMapping?.priceCol ?? autoMapping.priceCol,
	};

	const allRows: ParsedTabularRow[] = [];
	const errors: TabularRowValidationError[] = [];

	let newCount = 0;
	let updateCount = 0;
	let identicalCount = 0;
	let validRowsCount = 0;
	let errorRowsCount = 0;

	const startDataIndex = headerRowIndex + 1;

	for (let r = startDataIndex; r < rows.length; r++) {
		const rawRow = rows[r] || [];
		const rowNumber = r + 1; // 1-based row index for humans

		// Skip entirely empty rows
		if (rawRow.every((c) => !c || c.trim() === "")) {
			continue;
		}

		const titleRaw = (rawRow[effectiveMapping.titleCol] || "").trim();
		const priceRaw = (rawRow[effectiveMapping.priceCol] || "").trim();

		// Check if title is present
		if (!titleRaw) {
			errorRowsCount++;
			const err: TabularRowValidationError = {
				rowNumber,
				field: "title",
				message: "Отсутствует наименование услуги",
				rawCell: "",
			};
			errors.push(err);
			allRows.push({
				rowNumber,
				rawCells: rawRow,
				commercialTitle: "(без наименования)",
				category: "other",
				specialty: "universal",
				priceRub: 0,
				priceKopecks: 0,
				durationMinutes: 30,
				validationStatus: "error",
				validationMessage: err.message,
				suggestedAction: "create_new",
			});
			continue;
		}

		// Normalize price
		const priceResult = normalizePricelistPrice(priceRaw);
		if (!priceResult.success) {
			errorRowsCount++;
			const err: TabularRowValidationError = {
				rowNumber,
				field: "price",
				message: priceResult.error || "Некорректная цена услуги",
				rawCell: priceRaw,
			};
			errors.push(err);
			allRows.push({
				rowNumber,
				rawCells: rawRow,
				commercialTitle: titleRaw,
				category: "other",
				specialty: "universal",
				priceRub: 0,
				priceKopecks: 0,
				durationMinutes: 30,
				validationStatus: "error",
				validationMessage: err.message,
				suggestedAction: "create_new",
			});
			continue;
		}

		// Extract code and category
		const code =
			effectiveMapping.codeCol !== undefined
				? (rawRow[effectiveMapping.codeCol] || "").trim() || undefined
				: undefined;

		const explicit804n =
			effectiveMapping.order804nCol !== undefined
				? (rawRow[effectiveMapping.order804nCol] || "").trim() || undefined
				: undefined;

		const categoryRaw =
			effectiveMapping.categoryCol !== undefined
				? (rawRow[effectiveMapping.categoryCol] || "").trim()
				: "";
		const category = normalizeServiceCategoryName(categoryRaw || titleRaw);

		const specialtyRaw =
			effectiveMapping.specialtyCol !== undefined
				? (rawRow[effectiveMapping.specialtyCol] || "").trim()
				: "";
		const specialty = normalizeDoctorSpecialtyName(specialtyRaw || category);

		// Resolve 804n statutory code (ZERO MOCKS: no fake A16.07.999.xxx)
		let resolved804n = explicit804n;
		if (!resolved804n) {
			// Check if code matches 804n syntax (e.g. A16.07.002 or B01.065.001)
			if (code && /^[ABАВ]\d{2}\.\d{2}\.\d{3}/i.test(code)) {
				resolved804n = code.toUpperCase().replace(/^А/, "A").replace(/^В/, "B");
			} else {
				// Statutory category default
				resolved804n = STATUTORY_CATEGORY_CODES_MAP[category] || "A16.07.002";
			}
		}

		// Extract duration
		let durationMinutes = STATUTORY_CATEGORY_DURATIONS_MAP[category] || 30;
		if (effectiveMapping.durationCol !== undefined) {
			const durRaw = (rawRow[effectiveMapping.durationCol] || "").trim();
			const parsedDur = parseInt(durRaw.replace(/\D/g, ""), 10);
			if (Number.isFinite(parsedDur) && parsedDur > 0 && parsedDur <= 480) {
				durationMinutes = parsedDur;
			}
		}

		// Extract cost
		let costRub: number | undefined;
		if (effectiveMapping.costCol !== undefined) {
			const costRaw = (rawRow[effectiveMapping.costCol] || "").trim();
			const costRes = normalizePricelistPrice(costRaw);
			if (costRes.success) costRub = costRes.priceRub;
		}

		// Extract warranty
		let warrantyMonths: number | undefined;
		if (effectiveMapping.warrantyCol !== undefined) {
			const warRaw = (rawRow[effectiveMapping.warrantyCol] || "").trim();
			const parsedWar = parseInt(warRaw.replace(/\D/g, ""), 10);
			if (Number.isFinite(parsedWar) && parsedWar >= 0 && parsedWar <= 120) {
				warrantyMonths = parsedWar;
			}
		}

		// Cross-reference with existing catalog
		const crossRef = crossReferenceTabularRow(
			code,
			titleRaw,
			priceResult.priceKopecks,
			existingCatalog,
		);

		if (crossRef.action === "create_new") newCount++;
		else if (crossRef.action === "update_existing") updateCount++;
		else if (crossRef.action === "identical") identicalCount++;

		validRowsCount++;

		allRows.push({
			rowNumber,
			rawCells: rawRow,
			code,
			order804nCode: resolved804n,
			commercialTitle: titleRaw,
			category,
			specialty,
			priceRub: priceResult.priceRub,
			priceKopecks: priceResult.priceKopecks,
			costRub,
			durationMinutes,
			warrantyMonths,
			validationStatus: "valid",
			suggestedAction: crossRef.action,
			matchedExistingServiceId: crossRef.matchedId,
			matchedExistingTitle: crossRef.matchedTitle,
			matchedExistingPriceRub: crossRef.matchedPriceRub,
		});
	}

	return {
		vendorSignature,
		vendorLabel,
		detectedMapping: effectiveMapping,
		headerRowIndex,
		headers,
		previewRows: allRows.slice(0, 10),
		allRows,
		totalRows: allRows.length,
		validRowsCount,
		errorRowsCount,
		stats: {
			newCount,
			updateCount,
			identicalCount,
		},
		errors,
	};
}
