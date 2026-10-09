import {
	CATEGORY_LABELS,
	SPECIALTY_LABELS,
	STATUTORY_VAT_EXEMPTION_NOTE,
	type DoctorSpecialty,
	type Order804nCategory,
	type PriceTierKind,
	type ServicePricelistItem,
} from '../servicePricelistPresets';
import { calculateTierPrice, rublesToKopecks } from './currencyMath';
import { detectCategoryFrom804nCode } from './serviceCodesAndSynonyms';
import type { CsvExportOptions, CsvImportResult, CsvRowError } from './types';

// =============================================================================
// LAYER 2: RFC 4180 CSV IMPORT / EXPORT (WITH UTF-8 BOM FOR RUSSIAN EXCEL)
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

/**
 * Exports catalog items into standard RFC 4180 CSV with UTF-8 BOM for Microsoft Excel.
 */
export function exportPricelistToCsv(
	items: readonly ServicePricelistItem[],
	options?: CsvExportOptions | undefined,
): string {
	const delimiter = options?.delimiter ?? ';';
	const headers = [
		'Код услуги',
		'Коммерческое наименование',
		'Официальное наименование',
		'Категория',
		'Специальность',
		'Цена стандарт (руб)',
		'Цена VIP (руб)',
		'Цена ДМС (руб)',
		'Цена Промо (руб)',
		'Цена Ночной/Выходной (руб)',
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
			item.tierPrices?.night_weekend ?? calculateTierPrice(item.basePriceRub, 'night_weekend'),
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
	if (norm.includes('пакет') || norm.includes('комплекс') || norm.includes('сертификат') || norm.includes('капа')) return 'package';
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

	const headers = rawRows[0]!.map((h) => h.toLowerCase().trim());
	const findCol = (keys: string[]) =>
		headers.findIndex((h) => keys.some((k) => h.includes(k)));

	// Enhanced multi-vendor column recognition (IDENT, DentalPRO, iStom, 1C:Медицина, StomX, Order 804n)
	const colCode = findCol(['код 804', '804н', 'номенклатур', 'артикул', 'кодноменклатуры', 'код услуги', 'код', 'code', 'id', 'арт']);
	const colCommTitle = findCol(['коммерческое', 'наименование', 'услуга', 'номенклатура', 'название', 'процедура', 'title']);
	const colStatTitle = findCol(['официальное', 'номенклатур']);
	const colCat = findCol(['категория', 'раздел', 'группаноменклатуры', 'группа', 'папка', 'направление', 'отделение', 'category']);
	const colSpec = findCol(['специальность', 'специализация', 'врач', 'specialty']);
	const colPrice = findCol(['цена стандарт', 'базовая цена', 'стоимость', 'тариф', 'прайс', 'цена', 'price', 'руб']);
	const colVip = findCol(['vip', 'вип']);
	const colDms = findCol(['дмс', 'dms', 'страхов']);
	const colPromo = findCol(['промо', 'акци', 'promo']);
	const colNight = findCol(['ночной', 'выходной', 'night']);
	const colMatCost = findCol(['себестоимость', 'материал', 'расход']);
	const colLabCost = findCol(['лаборатор', 'зуботехническ', 'техник']);
	const colIcd = findCol(['мкб', 'icd']);
	const colDur = findCol(['длительность', 'минут', 'время', 'хронометраж']);

	const validItems: ServicePricelistItem[] = [];
	const invalidRows: CsvRowError[] = [];

	for (let rowIndex = 1; rowIndex < rawRows.length; rowIndex++) {
		const row = rawRows[rowIndex]!;
		if (row.length === 0 || row.every((c) => c === '')) continue;

		const rawCode = (colCode >= 0 ? row[colCode] : '')?.trim() || '';
		const commercialTitle = (colCommTitle >= 0 ? row[colCommTitle] : '')?.trim() || '';
		const statutoryTitle804n = (colStatTitle >= 0 ? row[colStatTitle] : '')?.trim() || commercialTitle;

		if (!commercialTitle) {
			invalidRows.push({
				rowIndex,
				code804n: rawCode,
				error: 'Отсутствует наименование услуги',
			});
			continue;
		}

		const rawPriceStr = (colPrice >= 0 ? row[colPrice] : '0')?.replace(/\s+/g, '').replace(',', '.') ?? '0';
		const basePriceRub = parseFloat(rawPriceStr);

		if (Number.isNaN(basePriceRub) || basePriceRub < 0) {
			invalidRows.push({
				rowIndex,
				code804n: rawCode,
				error: `Некорректная цена: "${rawPriceStr}"`,
				title: commercialTitle,
			});
			continue;
		}

		const category = colCat >= 0 && row[colCat] ? parseCategoryFromLabel(row[colCat]!) : detectCategoryFrom804nCode(rawCode);
		const specialty = colSpec >= 0 && row[colSpec] ? parseSpecialtyFromLabel(row[colSpec]!) : 'general';

		// ZERO MOCKS: never generate fake A16.07.999.xxx!
		// Use real Order 804n statutory nomenclature code:
		let code804n = rawCode;
		if (!code804n || !/^[ABАВ]\d{2}\.\d{2}\.\d{3}/i.test(code804n)) {
			// Canonical Minzdrav Order 804n category fallbacks:
			const categoryCodeMap: Record<string, string> = {
				therapy: 'A16.07.002',
				surgery: 'A16.07.001',
				orthopedics: 'A16.07.004',
				orthodontics: 'A16.07.048',
				hygiene: 'A16.07.051',
				periodontics: 'A16.07.018',
				radiology: 'A06.07.007',
				consultation: 'B01.065.001',
				pediatric: 'A16.07.002.009',
				anesthesia: 'B01.003.004.005',
			};
			code804n = categoryCodeMap[category] || 'A16.07.002';
		} else {
			code804n = code804n.toUpperCase().replace(/^А/, 'A').replace(/^В/, 'B');
		}

		const rawVip = colVip >= 0 ? parseFloat(row[colVip]?.replace(/\s+/g, '').replace(',', '.') || 'NaN') : NaN;
		const rawDms = colDms >= 0 ? parseFloat(row[colDms]?.replace(/\s+/g, '').replace(',', '.') || 'NaN') : NaN;
		const rawPromo = colPromo >= 0 ? parseFloat(row[colPromo]?.replace(/\s+/g, '').replace(',', '.') || 'NaN') : NaN;
		const rawNight = colNight >= 0 ? parseFloat(row[colNight]?.replace(/\s+/g, '').replace(',', '.') || 'NaN') : NaN;

		const rawMat = colMatCost >= 0 ? parseFloat(row[colMatCost]?.replace(/\s+/g, '').replace(',', '.') || '0') : 0;
		const rawLab = colLabCost >= 0 ? parseFloat(row[colLabCost]?.replace(/\s+/g, '').replace(',', '.') || '0') : 0;
		const rawDur = colDur >= 0 ? parseInt(row[colDur]?.replace(/\D/g, '') || '30', 10) : 30;

		const icdRaw = colIcd >= 0 && row[colIcd] ? row[colIcd]!.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : [];

		const tierPrices: Partial<Record<PriceTierKind, number>> = {};
		if (!Number.isNaN(rawVip)) tierPrices.vip = Math.round(rawVip * 100) / 100;
		if (!Number.isNaN(rawDms)) tierPrices.dms = Math.round(rawDms * 100) / 100;
		if (!Number.isNaN(rawPromo)) tierPrices.promo = Math.round(rawPromo * 100) / 100;
		if (!Number.isNaN(rawNight)) tierPrices.night_weekend = Math.round(rawNight * 100) / 100;

		const exactBasePriceRub = Math.round(basePriceRub * 100) / 100;
		const exactMatCostRub = !Number.isNaN(rawMat) && rawMat >= 0 ? Math.round(rawMat * 100) / 100 : 0;
		const exactLabCostRub = !Number.isNaN(rawLab) && rawLab >= 0 ? Math.round(rawLab * 100) / 100 : 0;

		const item: ServicePricelistItem = {
			id: `import-${Date.now()}-${rowIndex}`,
			code804n,
			commercialTitle,
			statutoryTitle804n,
			category,
			specialty,
			basePriceRub: exactBasePriceRub,
			basePriceKopecks: rublesToKopecks(exactBasePriceRub),
			materialCostRub: exactMatCostRub,
			labCostRub: exactLabCostRub,
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
