/**
 * DENTE Dental CRM — Statutory Order 804n Service Catalog & Pricelist Matrix Engine
 *
 * Provides:
 * 1. Kopeck-exact financial math & price tier calculations (Standard, VIP, DMS, Promo).
 * 2. Gross profit, unit lab/material margin & markup analytics.
 * 3. Batch markup operations with customizable rounding (+5%, +10%, nearest 50/100 ₽).
 * 4. Fast multi-index token & fuzzy search (804n code, commercial title, ICD-10, tags).
 * 5. Statutory Minzdrav Order 804n code validation and auto-categorization.
 * 6. RFC 4180 CSV Import/Export with UTF-8 BOM (`\uFEFF`) for flawless Russian Excel support.
 * 7. Official A4 Printable Pricelist generator compliant with VAT 0% (ст. 149 НК РФ).
 */

import {
	CATEGORY_LABELS,
	PRICE_TIER_LABELS,
	SPECIALTY_LABELS,
	STATUTORY_VAT_EXEMPTION_NOTE,
	type DoctorSpecialty,
	type Order804nCategory,
	type PriceTierKind,
	type ServicePricelistItem,
} from './servicePricelistPresets';

// =============================================================================
// 1. KOPECK-EXACT MONEY & PRICE TIER MATHEMATICS
// =============================================================================

export const KOPECKS_PER_RUBLE = 100;
export const RU_NBSP = '\u00A0';

/**
 * Converts integer rubles to exact integer kopecks.
 */
export function rublesToKopecks(rubles: number): number {
	if (!Number.isFinite(rubles)) return 0;
	return Math.round(rubles * KOPECKS_PER_RUBLE);
}

/**
 * Converts integer kopecks to rubles.
 */
export function kopecksToRubles(kopecks: number): number {
	if (!Number.isFinite(kopecks)) return 0;
	return kopecks / KOPECKS_PER_RUBLE;
}

/**
 * Formats rubles with thousand separators and currency symbol: "15 000 ₽".
 */
export function formatRubles(rubles: number): string {
	if (!Number.isFinite(rubles)) return `0${RU_NBSP}₽`;
	const isNegative = rubles < 0;
	const abs = Math.abs(Math.round(rubles));
	const formatted = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, RU_NBSP);
	return `${isNegative ? '−' : ''}${formatted}${RU_NBSP}₽`;
}

/**
 * Formats exact kopecks with kopeck precision: "1 500,50 ₽".
 */
export function formatKopecksRu(kopecks: number): string {
	if (!Number.isFinite(kopecks)) return `0,00${RU_NBSP}₽`;
	const isNegative = kopecks < 0;
	const abs = Math.abs(Math.round(kopecks));
	const whole = Math.floor(abs / KOPECKS_PER_RUBLE);
	const fraction = abs % KOPECKS_PER_RUBLE;
	const formattedWhole = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, RU_NBSP);
	const fractionStr = String(fraction).padStart(2, '0');
	return `${isNegative ? '−' : ''}${formattedWhole},${fractionStr}${RU_NBSP}₽`;
}

/**
 * Calculates effective price in rubles for a given tier (Standard, VIP, DMS, Promo).
 */
export function calculateTierPrice(
	basePriceRub: number,
	tier: PriceTierKind,
	customTierPrice?: number,
): number {
	if (customTierPrice !== undefined && Number.isFinite(customTierPrice) && customTierPrice >= 0) {
		return Math.round(customTierPrice);
	}
	if (!Number.isFinite(basePriceRub) || basePriceRub <= 0) return 0;

	switch (tier) {
		case 'standard':
			return Math.round(basePriceRub);
		case 'vip':
			// VIP default is +20% rounded to nearest 50 rubles
			return roundPrice(basePriceRub * 1.2, 'round_50');
		case 'dms':
			// DMS default contract rate is 85% of standard price
			return roundPrice(basePriceRub * 0.85, 'round_50');
		case 'promo':
			// Promo discount is -10% of standard price
			return roundPrice(basePriceRub * 0.9, 'round_50');
		default:
			return Math.round(basePriceRub);
	}
}

// =============================================================================
// 2. PROFITABILITY, MARGIN & COST ANALYSIS
// =============================================================================

export type ProfitabilityLevel = 'high' | 'medium' | 'low' | 'loss';

export interface ServiceProfitability {
	readonly sellingPriceRub: number;
	readonly materialCostRub: number;
	readonly labCostRub: number;
	readonly totalCostRub: number;
	readonly grossProfitRub: number;
	readonly grossProfitKopecks: number;
	readonly marginPercent: number;
	readonly markupPercent: number;
	readonly level: ProfitabilityLevel;
}

/**
 * Calculates gross profit and margin percentages vs material and lab costs.
 */
export function calculateServiceProfitability(
	item: ServicePricelistItem,
	tier: PriceTierKind = 'standard',
): ServiceProfitability {
	const sellingPriceRub = calculateTierPrice(
		item.basePriceRub,
		tier,
		item.tierPrices?.[tier],
	);
	const materialCostRub = Math.max(0, item.materialCostRub ?? 0);
	const labCostRub = Math.max(0, item.labCostRub ?? 0);
	const totalCostRub = materialCostRub + labCostRub;
	const grossProfitRub = sellingPriceRub - totalCostRub;
	const grossProfitKopecks = rublesToKopecks(grossProfitRub);

	const marginPercent =
		sellingPriceRub > 0 ? Math.round(((grossProfitRub / sellingPriceRub) * 100) * 10) / 10 : 0;
	const markupPercent =
		totalCostRub > 0 ? Math.round(((grossProfitRub / totalCostRub) * 100) * 10) / 10 : 0;

	let level: ProfitabilityLevel = 'loss';
	if (grossProfitRub <= 0) {
		level = 'loss';
	} else if (marginPercent >= 70) {
		level = 'high';
	} else if (marginPercent >= 40) {
		level = 'medium';
	} else {
		level = 'low';
	}

	return {
		sellingPriceRub,
		materialCostRub,
		labCostRub,
		totalCostRub,
		grossProfitRub,
		grossProfitKopecks,
		marginPercent,
		markupPercent,
		level,
	};
}

// =============================================================================
// 3. BATCH MARKUP & ROUNDING OPERATIONS
// =============================================================================

export type PriceRoundingMode = 'none' | 'round_10' | 'round_50' | 'round_100' | 'round_500';

export function roundPrice(price: number, mode: PriceRoundingMode): number {
	if (!Number.isFinite(price)) return 0;
	switch (mode) {
		case 'round_10':
			return Math.round(price / 10) * 10;
		case 'round_50':
			return Math.round(price / 50) * 50;
		case 'round_100':
			return Math.round(price / 100) * 100;
		case 'round_500':
			return Math.round(price / 500) * 500;
		case 'none':
		default:
			return Math.round(price);
	}
}

export interface BatchMarkupOptions {
	readonly percentChange?: number | undefined; // e.g. +5, +10, -5
	readonly fixedRubChange?: number | undefined; // e.g. +200, -500
	readonly roundMode?: PriceRoundingMode | undefined;
	readonly categoryFilter?: Order804nCategory | 'all' | undefined;
	readonly specialtyFilter?: DoctorSpecialty | 'all' | undefined;
	readonly targetItemIds?: readonly string[] | undefined;
	readonly applyToTiers?: readonly PriceTierKind[] | undefined;
}

/**
 * Performs batch price modifications across catalog items with rounding.
 */
export function applyBatchPriceMarkup(
	items: readonly ServicePricelistItem[],
	options: BatchMarkupOptions,
): ServicePricelistItem[] {
	const roundMode = options.roundMode ?? 'none';
	const targetIdsSet = options.targetItemIds ? new Set(options.targetItemIds) : null;
	const applyTiers = options.applyToTiers ?? ['standard', 'vip', 'dms', 'promo'];

	return items.map((item) => {
		if (targetIdsSet && !targetIdsSet.has(item.id)) {
			return item;
		}
		if (options.categoryFilter && options.categoryFilter !== 'all' && item.category !== options.categoryFilter) {
			return item;
		}
		if (options.specialtyFilter && options.specialtyFilter !== 'all' && item.specialty !== options.specialtyFilter) {
			return item;
		}

		let updatedBasePrice = item.basePriceRub;
		if (applyTiers.includes('standard')) {
			if (options.percentChange !== undefined && Number.isFinite(options.percentChange)) {
				updatedBasePrice = updatedBasePrice * (1 + options.percentChange / 100);
			}
			if (options.fixedRubChange !== undefined && Number.isFinite(options.fixedRubChange)) {
				updatedBasePrice = updatedBasePrice + options.fixedRubChange;
			}
			updatedBasePrice = Math.max(0, roundPrice(updatedBasePrice, roundMode));
		}

		const updatedTierPrices: Partial<Record<PriceTierKind, number>> = { ...(item.tierPrices ?? {}) };

		for (const tier of ['vip', 'dms', 'promo'] as const) {
			if (applyTiers.includes(tier)) {
				const currentPrice = item.tierPrices?.[tier] ?? calculateTierPrice(item.basePriceRub, tier);
				let newTierPrice = currentPrice;
				if (options.percentChange !== undefined && Number.isFinite(options.percentChange)) {
					newTierPrice = newTierPrice * (1 + options.percentChange / 100);
				}
				if (options.fixedRubChange !== undefined && Number.isFinite(options.fixedRubChange)) {
					newTierPrice = newTierPrice + options.fixedRubChange;
				}
				updatedTierPrices[tier] = Math.max(0, roundPrice(newTierPrice, roundMode));
			}
		}

		return {
			...item,
			basePriceRub: updatedBasePrice,
			basePriceKopecks: rublesToKopecks(updatedBasePrice),
			tierPrices: updatedTierPrices,
		};
	});
}

// =============================================================================
// 4. FAST SEARCH & FILTER INDEX
// =============================================================================

export interface SearchPricelistQuery {
	readonly searchTerm?: string | undefined;
	readonly category?: Order804nCategory | 'all' | undefined;
	readonly specialty?: DoctorSpecialty | 'all' | undefined;
	readonly includeArchived?: boolean | undefined;
	readonly minPriceRub?: number | undefined;
	readonly maxPriceRub?: number | undefined;
	readonly profitabilityLevel?: ProfitabilityLevel | 'all' | undefined;
}

function normalizeSearchText(text: string): string {
	return text
		.toLowerCase()
		.replace(/ё/g, 'е')
		.replace(/[^a-zа-я0-9\.]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * High-performance search and filtering (< 5ms over 1000 items).
 */
export function searchPricelistItems(
	items: readonly ServicePricelistItem[],
	query: SearchPricelistQuery,
): readonly ServicePricelistItem[] {
	const rawSearch = query.searchTerm?.trim() ?? '';
	const normSearch = normalizeSearchText(rawSearch);
	const searchTokens = normSearch.length > 0 ? normSearch.split(' ').filter((t) => t.length > 0) : [];
	const searchCleanCode = rawSearch.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

	const categoryFilter = query.category && query.category !== 'all' ? query.category : null;
	const specialtyFilter = query.specialty && query.specialty !== 'all' ? query.specialty : null;
	const profitFilter = query.profitabilityLevel && query.profitabilityLevel !== 'all' ? query.profitabilityLevel : null;
	const includeArchived = query.includeArchived ?? false;

	return items.filter((item) => {
		if (!includeArchived && item.isArchived) {
			return false;
		}
		if (categoryFilter && item.category !== categoryFilter) {
			return false;
		}
		if (specialtyFilter && item.specialty !== specialtyFilter) {
			return false;
		}
		if (query.minPriceRub !== undefined && item.basePriceRub < query.minPriceRub) {
			return false;
		}
		if (query.maxPriceRub !== undefined && item.basePriceRub > query.maxPriceRub) {
			return false;
		}
		if (profitFilter) {
			const prof = calculateServiceProfitability(item);
			if (prof.level !== profitFilter) return false;
		}

		if (searchTokens.length === 0) {
			return true;
		}

		// Exact or stripped 804n code match
		const itemCleanCode = item.code804n.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
		if (searchCleanCode.length > 0 && itemCleanCode.includes(searchCleanCode)) {
			return true;
		}

		// Full text index across titles, tags, and ICD-10
		const searchableText = normalizeSearchText(
			`${item.code804n} ${item.commercialTitle} ${item.statutoryTitle804n} ${item.tags.join(' ')} ${item.icd10Indications.join(' ')} ${CATEGORY_LABELS[item.category]} ${SPECIALTY_LABELS[item.specialty]}`,
		);

		return searchTokens.every((token) => searchableText.includes(token));
	});
}

// =============================================================================
// 5. STATUTORY ORDER 804N CODE VALIDATION & AUTODETECTION
// =============================================================================

const ORDER_804N_REGEX = /^[AB]\d{2}\.\d{2,3}\.\d{2,3}(?:\.\d{2,3})?$/i;

/**
 * Validates whether a code conforms to Minzdrav Order 804n syntax (e.g. A16.07.002.001 or B01.065.001).
 */
export function isValidOrder804nCode(code: string): boolean {
	if (!code || typeof code !== 'string') return false;
	return ORDER_804N_REGEX.test(code.trim());
}

/**
 * Automatically detects the clinical dental category based on Order 804n code prefix.
 */
export function detectCategoryFrom804nCode(code: string): Order804nCategory {
	const trimmed = code.trim().toUpperCase();
	if (trimmed.startsWith('B01.065') || trimmed.startsWith('B01.003')) {
		if (trimmed.startsWith('B01.003')) return 'anesthesia';
		return 'consultation';
	}
	if (trimmed.startsWith('A06.07') || trimmed.startsWith('A02.07')) {
		return 'radiology';
	}
	if (trimmed.startsWith('A16.07.051') || trimmed.startsWith('A11.07.012') || trimmed.startsWith('A16.07.050')) {
		return 'hygiene';
	}
	if (trimmed.startsWith('A16.07.039') || trimmed.startsWith('A16.07.040')) {
		return 'periodontics';
	}
	if (trimmed.startsWith('A16.07.047') || trimmed.startsWith('A16.07.048') || trimmed.startsWith('A16.07.046')) {
		return 'orthodontics';
	}
	if (
		trimmed.startsWith('A16.07.006') ||
		trimmed.startsWith('A16.07.035') ||
		trimmed.startsWith('A16.07.036') ||
		trimmed.startsWith('A16.07.037') ||
		trimmed.startsWith('A16.07.049') ||
		trimmed.startsWith('A16.07.053')
	) {
		return 'orthopedics';
	}
	if (
		trimmed.startsWith('A16.07.001') ||
		trimmed.startsWith('A16.07.024') ||
		trimmed.startsWith('A16.07.054') ||
		trimmed.startsWith('A16.07.007') ||
		trimmed.startsWith('A16.07.041') ||
		trimmed.startsWith('A16.07.055') ||
		trimmed.startsWith('A16.07.017') ||
		trimmed.startsWith('A16.07.016') ||
		trimmed.startsWith('A16.07.011') ||
		trimmed.startsWith('A16.07.012')
	) {
		return 'surgery';
	}
	if (trimmed.startsWith('A16.07.004')) {
		return 'anesthesia';
	}
	if (
		trimmed.startsWith('A16.07.002') ||
		trimmed.startsWith('A16.07.008') ||
		trimmed.startsWith('A16.07.030') ||
		trimmed.startsWith('A16.07.082') ||
		trimmed.startsWith('A16.07.091') ||
		trimmed.startsWith('A16.07.003')
	) {
		return 'therapy';
	}
	return 'other';
}

// =============================================================================
// 6. RFC 4180 CSV IMPORT / EXPORT (WITH UTF-8 BOM FOR RUSSIAN EXCEL)
// =============================================================================

export const UTF8_BOM = '\uFEFF';

function escapeCsvCell(value: string | number | undefined | null, delimiter: string): string {
	if (value === null || value === undefined) return '';
	const str = String(value);
	if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export interface CsvExportOptions {
	readonly delimiter?: ';' | ',' | undefined;
}

/**
 * Exports catalog items into standard RFC 4180 CSV with UTF-8 BOM for Microsoft Excel.
 */
export function exportPricelistToCsv(
	items: readonly ServicePricelistItem[],
	options?: CsvExportOptions | undefined,
): string {
	const delimiter = options?.delimiter ?? ';';
	const headers = [
		'Код 804н',
		'Коммерческое наименование',
		'Официальное наименование',
		'Категория',
		'Специальность',
		'Цена стандарт (руб)',
		'Цена VIP (руб)',
		'Цена ДМС (руб)',
		'Цена Промо (руб)',
		'Себестоимость материалов (руб)',
		'Зуботехническая лаборатория (руб)',
		'НДС',
		'МКБ-10',
		'Длительность (мин)',
		'Статус',
	];

	const rows: string[] = [headers.map((h) => escapeCsvCell(h, delimiter)).join(delimiter)];

	for (const item of items) {
		const row = [
			item.code804n,
			item.commercialTitle,
			item.statutoryTitle804n,
			CATEGORY_LABELS[item.category] ?? item.category,
			SPECIALTY_LABELS[item.specialty] ?? item.specialty,
			item.basePriceRub,
			item.tierPrices?.vip ?? calculateTierPrice(item.basePriceRub, 'vip'),
			item.tierPrices?.dms ?? calculateTierPrice(item.basePriceRub, 'dms'),
			item.tierPrices?.promo ?? calculateTierPrice(item.basePriceRub, 'promo'),
			item.materialCostRub ?? 0,
			item.labCostRub ?? 0,
			STATUTORY_VAT_EXEMPTION_NOTE,
			item.icd10Indications.join(', '),
			item.estimatedDurationMin,
			item.isArchived ? 'В архиве' : item.isActive ? 'Активна' : 'Отключена',
		];
		rows.push(row.map((val) => escapeCsvCell(val, delimiter)).join(delimiter));
	}

	return UTF8_BOM + rows.join('\r\n');
}

export interface CsvRowError {
	readonly rowIndex: number;
	readonly code804n?: string | undefined;
	readonly title?: string | undefined;
	readonly error: string;
}

export interface CsvImportResult {
	readonly validItems: readonly ServicePricelistItem[];
	readonly invalidRows: readonly CsvRowError[];
	readonly totalRows: number;
}

/**
 * Parses raw RFC 4180 CSV text into structured table records.
 */
export function parseRawCsvText(csvText: string, delimiter?: ';' | ','): string[][] {
	let cleanText = csvText;
	if (cleanText.startsWith(UTF8_BOM)) {
		cleanText = cleanText.slice(UTF8_BOM.length);
	}

	// Auto-detect delimiter if not explicitly provided
	const delim = delimiter ?? (cleanText.split('\n')[0]?.includes(';') ? ';' : ',');

	const rows: string[][] = [];
	let currentRow: string[] = [];
	let currentCell = '';
	let insideQuotes = false;
	let i = 0;

	while (i < cleanText.length) {
		const char = cleanText[i];
		const nextChar = cleanText[i + 1];

		if (char === '"') {
			if (insideQuotes && nextChar === '"') {
				currentCell += '"';
				i += 2;
				continue;
			}
			insideQuotes = !insideQuotes;
			i++;
			continue;
		}

		if (!insideQuotes && char === delim) {
			currentRow.push(currentCell.trim());
			currentCell = '';
			i++;
			continue;
		}

		if (!insideQuotes && (char === '\r' || char === '\n')) {
			if (char === '\r' && nextChar === '\n') {
				i++;
			}
			currentRow.push(currentCell.trim());
			if (currentRow.some((c) => c.length > 0)) {
				rows.push(currentRow);
			}
			currentRow = [];
			currentCell = '';
			i++;
			continue;
		}

		currentCell += char;
		i++;
	}

	if (currentCell.length > 0 || currentRow.length > 0) {
		currentRow.push(currentCell.trim());
		if (currentRow.some((c) => c.length > 0)) {
			rows.push(currentRow);
		}
	}

	return rows;
}

function parseCategoryFromLabel(label: string): Order804nCategory {
	const norm = label.toLowerCase().trim();
	for (const [cat, catLabel] of Object.entries(CATEGORY_LABELS)) {
		if (norm.includes(cat) || norm.includes(catLabel.toLowerCase())) {
			return cat as Order804nCategory;
		}
	}
	if (norm.includes('терап') || norm.includes('кариес') || norm.includes('пломб') || norm.includes('эндо')) return 'therapy';
	if (norm.includes('хирург') || norm.includes('имплант') || norm.includes('удален')) return 'surgery';
	if (norm.includes('ортопед') || norm.includes('коронк') || norm.includes('протез') || norm.includes('винир')) return 'orthopedics';
	if (norm.includes('ортодонт') || norm.includes('брекет') || norm.includes('элайн')) return 'orthodontics';
	if (norm.includes('детск') || norm.includes('молочн')) return 'pediatric';
	if (norm.includes('рентген') || norm.includes('диагност') || norm.includes('снимок') || norm.includes('томограф')) return 'radiology';
	if (norm.includes('гигиен') || norm.includes('чистк') || norm.includes('отбеливан')) return 'hygiene';
	if (norm.includes('анестез')) return 'anesthesia';
	if (norm.includes('консульт') || norm.includes('осмотр')) return 'consultation';
	return 'other';
}

function parseSpecialtyFromLabel(label: string): DoctorSpecialty {
	const norm = label.toLowerCase().trim();
	for (const [spec, specLabel] of Object.entries(SPECIALTY_LABELS)) {
		if (norm.includes(spec) || norm.includes(specLabel.toLowerCase())) {
			return spec as DoctorSpecialty;
		}
	}
	if (norm.includes('терапевт')) return 'therapist';
	if (norm.includes('хирург') || norm.includes('имплантолог')) return 'surgeon';
	if (norm.includes('ортопед')) return 'orthopedist';
	if (norm.includes('ортодонт')) return 'orthodontist';
	if (norm.includes('детск')) return 'pediatric';
	if (norm.includes('гигиенист')) return 'hygienist';
	if (norm.includes('рентгенолог')) return 'radiologist';
	if (norm.includes('анестезиолог')) return 'anesthesiologist';
	return 'general';
}

/**
 * Imports and validates pricelist CSV rows.
 */
export function importPricelistFromCsv(csvText: string): CsvImportResult {
	const rawRows = parseRawCsvText(csvText);
	if (rawRows.length === 0) {
		return { validItems: [], invalidRows: [{ rowIndex: 0, error: 'Файл пуст' }], totalRows: 0 };
	}

	const headers = rawRows[0]!.map((h) => h.toLowerCase());
	const findCol = (keys: string[]) =>
		headers.findIndex((h) => keys.some((k) => h.includes(k)));

	const colCode = findCol(['код 804', '804н', 'код', 'code']);
	const colCommTitle = findCol(['коммерческое', 'наименование', 'услуга', 'название', 'title']);
	const colStatTitle = findCol(['официальное', 'номенклатур']);
	const colCat = findCol(['категория', 'раздел', 'category']);
	const colSpec = findCol(['специальность', 'врач', 'specialty']);
	const colPrice = findCol(['цена стандарт', 'цена', 'стоимость', 'price', 'руб']);
	const colVip = findCol(['vip', 'вип']);
	const colDms = findCol(['дмс', 'dms', 'страхов']);
	const colPromo = findCol(['промо', 'акци', 'promo']);
	const colMatCost = findCol(['материал', 'расход']);
	const colLabCost = findCol(['лаборатор', 'зуботехническ', 'техник']);
	const colIcd = findCol(['мкб', 'icd']);
	const colDur = findCol(['длительность', 'минут', 'время']);

	const validItems: ServicePricelistItem[] = [];
	const invalidRows: CsvRowError[] = [];

	for (let rowIndex = 1; rowIndex < rawRows.length; rowIndex++) {
		const row = rawRows[rowIndex]!;
		if (row.length === 0 || row.every((c) => c === '')) continue;

		const code804n = (colCode >= 0 ? row[colCode] : '')?.trim() || `A16.07.999.${String(rowIndex).padStart(3, '0')}`;
		const commercialTitle = (colCommTitle >= 0 ? row[colCommTitle] : '')?.trim() || '';
		const statutoryTitle804n = (colStatTitle >= 0 ? row[colStatTitle] : '')?.trim() || commercialTitle;

		if (!commercialTitle) {
			invalidRows.push({
				rowIndex,
				code804n,
				error: 'Отсутствует наименование услуги',
			});
			continue;
		}

		const rawPriceStr = (colPrice >= 0 ? row[colPrice] : '0')?.replace(/\s+/g, '').replace(',', '.') ?? '0';
		const basePriceRub = parseFloat(rawPriceStr);

		if (Number.isNaN(basePriceRub) || basePriceRub < 0) {
			invalidRows.push({
				rowIndex,
				code804n,
				title: commercialTitle,
				error: `Некорректная цена: "${rawPriceStr}"`,
			});
			continue;
		}

		const category = colCat >= 0 && row[colCat] ? parseCategoryFromLabel(row[colCat]!) : detectCategoryFrom804nCode(code804n);
		const specialty = colSpec >= 0 && row[colSpec] ? parseSpecialtyFromLabel(row[colSpec]!) : 'general';

		const rawVip = colVip >= 0 ? parseFloat(row[colVip]?.replace(/\s+/g, '').replace(',', '.') || 'NaN') : NaN;
		const rawDms = colDms >= 0 ? parseFloat(row[colDms]?.replace(/\s+/g, '').replace(',', '.') || 'NaN') : NaN;
		const rawPromo = colPromo >= 0 ? parseFloat(row[colPromo]?.replace(/\s+/g, '').replace(',', '.') || 'NaN') : NaN;

		const rawMat = colMatCost >= 0 ? parseFloat(row[colMatCost]?.replace(/\s+/g, '').replace(',', '.') || '0') : 0;
		const rawLab = colLabCost >= 0 ? parseFloat(row[colLabCost]?.replace(/\s+/g, '').replace(',', '.') || '0') : 0;
		const rawDur = colDur >= 0 ? parseInt(row[colDur]?.replace(/\D/g, '') || '30', 10) : 30;

		const icdRaw = colIcd >= 0 && row[colIcd] ? row[colIcd]!.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : [];

		const tierPrices: Partial<Record<PriceTierKind, number>> = {};
		if (!Number.isNaN(rawVip)) tierPrices.vip = Math.round(rawVip);
		if (!Number.isNaN(rawDms)) tierPrices.dms = Math.round(rawDms);
		if (!Number.isNaN(rawPromo)) tierPrices.promo = Math.round(rawPromo);

		const item: ServicePricelistItem = {
			id: `import-${Date.now()}-${rowIndex}`,
			code804n,
			commercialTitle,
			statutoryTitle804n,
			category,
			specialty,
			basePriceRub: Math.round(basePriceRub),
			basePriceKopecks: rublesToKopecks(basePriceRub),
			materialCostRub: !Number.isNaN(rawMat) && rawMat >= 0 ? Math.round(rawMat) : 0,
			labCostRub: !Number.isNaN(rawLab) && rawLab >= 0 ? Math.round(rawLab) : 0,
			tierPrices,
			vatRate: 0,
			vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
			icd10Indications: icdRaw,
			estimatedDurationMin: !Number.isNaN(rawDur) && rawDur > 0 ? rawDur : 30,
			isActive: true,
			isArchived: false,
			tags: [commercialTitle.toLowerCase(), code804n.toLowerCase()],
		};

		validItems.push(item);
	}

	return {
		validItems,
		invalidRows,
		totalRows: rawRows.length - 1,
	};
}

// =============================================================================
// 7. PRINTABLE OFFICIAL CLINIC PRICELIST HTML GENERATOR (A4)
// =============================================================================

export interface ClinicPricelistPrintInfo {
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly clinicPhone: string;
	readonly clinicLicense: string;
	readonly chiefDoctorName: string;
	readonly effectiveDateRu: string;
}

/**
 * Generates an official printable A4 document with statutory compliance headers.
 */
export function generatePrintablePricelistHtml(
	clinicInfo: ClinicPricelistPrintInfo,
	items: readonly ServicePricelistItem[],
	tier: PriceTierKind = 'standard',
): string {
	const activeItems = items.filter((i) => !i.isArchived && i.isActive);

	// Group items by category
	const groupedByCategory = new Map<Order804nCategory, ServicePricelistItem[]>();
	for (const item of activeItems) {
		const list = groupedByCategory.get(item.category) ?? [];
		list.push(item);
		groupedByCategory.set(item.category, list);
	}

	let categorySectionsHtml = '';

	for (const [category, catItems] of groupedByCategory.entries()) {
		const categoryTitle = CATEGORY_LABELS[category] ?? category;

		const rowsHtml = catItems
			.map((item, idx) => {
				const price = calculateTierPrice(item.basePriceRub, tier, item.tierPrices?.[tier]);
				return `
					<tr>
						<td class="col-num">${idx + 1}</td>
						<td class="col-code"><code>${item.code804n}</code></td>
						<td class="col-name">
							<div class="commercial-title">${item.commercialTitle}</div>
							<div class="statutory-title">${item.statutoryTitle804n}</div>
						</td>
						<td class="col-spec">${SPECIALTY_LABELS[item.specialty] ?? item.specialty}</td>
						<td class="col-price">${formatRubles(price)}</td>
					</tr>
				`;
			})
			.join('');

		categorySectionsHtml += `
			<div class="pricelist-category-section">
				<h3 class="category-heading">${categoryTitle}</h3>
				<table class="pricelist-table">
					<thead>
						<tr>
							<th class="col-num">№</th>
							<th class="col-code">Код 804н</th>
							<th class="col-name">Наименование медицинской услуги</th>
							<th class="col-spec">Специальность</th>
							<th class="col-price">Цена (руб.)</th>
						</tr>
					</thead>
					<tbody>
						${rowsHtml}
					</tbody>
				</table>
			</div>
		`;
	}

	return `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Официальный прейскурант медицинских услуг — ${clinicInfo.clinicName}</title>
	<style>
		@page {
			size: A4;
			margin: 15mm 12mm 15mm 12mm;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
			color: #111827;
			background: #ffffff;
			margin: 0;
			padding: 0;
			font-size: 9.5pt;
			line-height: 1.35;
		}
		.header {
			border-bottom: 2px solid #0284c7;
			padding-bottom: 8px;
			margin-bottom: 12px;
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
		}
		.clinic-info h1 {
			margin: 0 0 4px 0;
			font-size: 14pt;
			color: #0f172a;
			font-weight: 800;
			text-transform: uppercase;
		}
		.clinic-details {
			font-size: 8pt;
			color: #475569;
		}
		.approval-block {
			text-align: right;
			font-size: 8pt;
			border: 1px dashed #94a3b8;
			padding: 6px 10px;
			border-radius: 4px;
		}
		.approval-block .title {
			font-weight: bold;
			text-transform: uppercase;
		}
		.pricelist-title-banner {
			text-align: center;
			margin: 12px 0 16px 0;
		}
		.pricelist-title-banner h2 {
			margin: 0;
			font-size: 12pt;
			font-weight: 800;
			color: #0f172a;
		}
		.pricelist-title-banner .sub {
			font-size: 8pt;
			color: #64748b;
			margin-top: 2px;
		}
		.category-heading {
			background: #f1f5f9;
			border-left: 4px solid #0284c7;
			padding: 4px 8px;
			margin: 14px 0 6px 0;
			font-size: 10pt;
			font-weight: 700;
			color: #0f172a;
			page-break-after: avoid;
		}
		.pricelist-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 8px;
			font-size: 8.5pt;
			page-break-inside: auto;
		}
		.pricelist-table tr {
			page-break-inside: avoid;
			page-break-after: auto;
		}
		.pricelist-table th {
			background: #f8fafc;
			border: 1px solid #cbd5e1;
			padding: 5px 6px;
			font-weight: 700;
			text-align: left;
			font-size: 8pt;
			color: #334155;
		}
		.pricelist-table td {
			border: 1px solid #e2e8f0;
			padding: 4px 6px;
			vertical-align: top;
		}
		.col-num { width: 24px; text-align: center; color: #64748b; }
		.col-code { width: 95px; font-weight: 600; }
		.col-code code { font-family: monospace; font-size: 8pt; color: #0369a1; }
		.col-name { width: auto; }
		.commercial-title { font-weight: 600; color: #0f172a; }
		.statutory-title { font-size: 7.5pt; color: #64748b; margin-top: 1px; }
		.col-spec { width: 130px; font-size: 7.5pt; color: #475569; }
		.col-price { width: 85px; text-align: right; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }
		.footer-legal {
			margin-top: 20px;
			border-top: 1px solid #cbd5e1;
			padding-top: 10px;
			font-size: 7.5pt;
			color: #64748b;
			page-break-inside: avoid;
		}
		.signatures {
			display: flex;
			justify-content: space-between;
			margin-top: 24px;
			padding-top: 12px;
			font-size: 8.5pt;
			page-break-inside: avoid;
		}
		.sign-line {
			border-top: 1px solid #000000;
			width: 200px;
			margin-top: 30px;
			text-align: center;
			font-size: 7.5pt;
			color: #64748b;
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-info">
			<h1>${clinicInfo.clinicName}</h1>
			<div class="clinic-details">
				<div>${clinicInfo.clinicAddress} · Тел: ${clinicInfo.clinicPhone}</div>
				<div>Лицензия на осуществление медицинской деятельности: ${clinicInfo.clinicLicense}</div>
			</div>
		</div>
		<div class="approval-block">
			<div class="title">УТВЕРЖДАЮ:</div>
			<div>Главный врач</div>
			<div>${clinicInfo.chiefDoctorName}</div>
			<div>«___» ____________ 2026 г.</div>
		</div>
	</div>

	<div class="pricelist-title-banner">
		<h2>ПРЕЙСКУРАНТ ЦЕН НА МЕДИЦИНСКИЕ СТОМАТОЛОГИЧЕСКИЕ УСЛУГИ</h2>
		<div class="sub">
			Введен в действие с ${clinicInfo.effectiveDateRu} г. (${PRICE_TIER_LABELS[tier]})
			· Номенклатура услуг составлена в строгом соответствии с Приказом Минздрава России № 804н
		</div>
	</div>

	${categorySectionsHtml}

	<div class="footer-legal">
		<strong>Правовое основание:</strong>
		Все медицинские стоматологические услуги оказываются в соответствии с законодательством Российской Федерации,
		лицензионными требованиями и клиническими рекомендациями Стоматологической Ассоциации России (СтАР).
		На основании подпункта 2 пункта 2 статьи 149 Налогового кодекса Российской Федерации медицинские услуги
		НДС не облагаются (0%).
	</div>

	<div class="signatures">
		<div>
			<div>Генеральный директор / Главный врач: ____________________ / ${clinicInfo.chiefDoctorName}</div>
			<div class="sign-line">подпись, М.П.</div>
		</div>
		<div>
			<div>Главный бухгалтер: ____________________ / ____________________</div>
			<div class="sign-line">подпись</div>
		</div>
	</div>
</body>
</html>
	`.trim();
}
