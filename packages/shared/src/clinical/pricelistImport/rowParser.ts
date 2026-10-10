/**
 * packages/shared/src/clinical/pricelistImport/rowParser.ts
 *
 * Tabular row parsing, vendor signature detection, column header heuristics,
 * and exact kopeck price normalization.
 */

import type {
	ColumnMappingConfig,
	PriceParseResult,
	PricelistVendorSignature,
} from "./types.js";

// =============================================================================
// ROBUST PRICE NORMALIZER (WITH EXACT KOPECKS)
// =============================================================================

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
// VENDOR SIGNATURE DETECTOR & COLUMN AUTO-MAPPER
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
