/**
 * DENTE Dental CRM — Universal Intelligent Multi-Format Price Scanner & 804n Matcher
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z:
 * 1. Multi-format ingestion:
 *    - Excel 2D row matrices (.xlsx, .xls, .ods, Google Sheets)
 *    - CSV / TSV text (semicolon, comma, tab delimited)
 *    - Unstructured plain text / clipboard pastes / OCR scans with bullets & row numbers
 * 2. Automatic structure detection:
 *    - Preamble header skipping (clinic names, addresses, dates)
 *    - Vendor signature recognition (IDENT, DentalPRO, iStom, 1C:Медицина, Generic)
 *    - Fuzzy column auto-mapping (title, code, price, category, duration, cost, warranty)
 * 3. Kopeck-exact price normalization (ZERO MOCKS):
 *    - "1 500,50 руб", "1500.50 ₽", "1 500-00", "от 2500 руб"
 *    - "бесплатно", "по гарантии", "0" -> 0.00 ₽
 *    - "договорная", negative, NaN -> flagged with clear Russian error messages
 * 4. 2-Tier Minzdrav Order 804n matching:
 *    - Tier 1: Explicit statutory code regex extraction (A16.07.002, B01.065.001)
 *    - Tier 2: Weighted clinical stem semantic matching & confidence scoring
 * 5. Deduplication & cross-referencing against existing clinic catalog.
 */

import { z } from "zod";
import type { DentalSpecialty, ServiceCatalogItem, ServiceCategory } from "../index.js";
import {
	autoMapColumns,
	type ColumnMappingConfig,
	crossReferenceTabularRow,
	detectVendorSignature,
	findHeaderRowIndex,
	normalizeDoctorSpecialtyName,
	normalizePricelistPrice,
	normalizeServiceCategoryName,
	PRICELIST_VENDOR_LABELS,
	type PricelistVendorSignature,
	type PriceParseResult,
	STATUTORY_CATEGORY_DURATIONS_MAP,
} from "../clinical/pricelistBatchImport.js";
import {
	type MatchConfidenceKind,
	matchOrder804nNomenclature,
	normalizeStatutoryCode,
} from "./matcher804n.js";
import { formatKopecksToRubles, parseKopecks } from "../money.js";

// =============================================================================
// 1. DATA TYPES & CONTRACTS
// =============================================================================

export type ScannedInputFormat = "tabular_excel" | "tabular_csv" | "unstructured_text";

export interface ScannedPriceItem {
	readonly id: string;
	readonly rowNumber: number; // 1-based
	readonly rawInput: string;
	readonly cleanedTitle: string;
	readonly code?: string | undefined;
	readonly code804n: string;
	readonly statutoryTitle804n: string;
	readonly category: ServiceCategory;
	readonly specialty: DentalSpecialty;
	readonly priceRub: number;
	readonly priceKopecks: number;
	readonly costRub?: number | undefined;
	readonly durationMinutes: number;
	readonly warrantyMonths?: number | undefined;
	readonly confidence: number;
	readonly confidenceKind: MatchConfidenceKind;
	readonly validationStatus: "valid" | "warning" | "error";
	readonly validationMessage?: string | undefined;
	readonly suggestedAction: "create_new" | "update_existing" | "identical";
	readonly matchedExistingServiceId?: string | null | undefined;
	readonly matchedExistingTitle?: string | null | undefined;
	readonly matchedExistingPriceRub?: number | null | undefined;
	isApproved: boolean;
}

export interface ScannedPricelistValidationError {
	readonly rowNumber: number;
	readonly field: string;
	readonly message: string;
	readonly rawInput?: string | undefined;
}

export interface ScannedPricelistSummary {
	readonly formatDetected: ScannedInputFormat;
	readonly vendorSignature?: PricelistVendorSignature | undefined;
	readonly vendorLabel?: string | undefined;
	readonly detectedMapping?: ColumnMappingConfig | undefined;
	readonly totalLinesOrRows: number;
	readonly recognizedItemsCount: number;
	readonly validItemsCount: number;
	readonly errorItemsCount: number;
	readonly exactCodesCount: number;
	readonly averageConfidence: number;
	readonly priceAccuracyRate: number; // 0..100%
	readonly categoryAccuracyRate: number; // 0..100%
	readonly stats: {
		readonly newCount: number;
		readonly updateCount: number;
		readonly identicalCount: number;
	};
}

export interface ScannedPricelistResult {
	readonly success: boolean;
	readonly items: ScannedPriceItem[];
	readonly summary: ScannedPricelistSummary;
	readonly errors: ScannedPricelistValidationError[];
	readonly warnings: string[];
}

export interface ScanPricelistOptions {
	readonly customMapping?: Partial<ColumnMappingConfig> | undefined;
	readonly existingCatalog?: readonly ServiceCatalogItem[] | undefined;
	readonly forceFormat?: ScannedInputFormat | undefined;
}

// =============================================================================
// 2. CSV / DELIMITER DETECTION & MATRIX PARSING
// =============================================================================

export function parseDelimitedTextToMatrix(rawText: string): string[][] {
	if (!rawText || typeof rawText !== "string") return [];

	const clean = rawText
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");

	const lines = clean.split("\n");
	const matrix: string[][] = [];

	// Detect predominant delimiter (semicolon, tab, or comma)
	let semicolonCount = 0;
	let tabCount = 0;
	let commaCount = 0;

	for (const line of lines.slice(0, 30)) {
		for (const ch of line) {
			if (ch === ";") semicolonCount++;
			else if (ch === "\t") tabCount++;
			else if (ch === ",") commaCount++;
		}
	}

	let delimiter = ";";
	if (tabCount > semicolonCount && tabCount > commaCount) {
		delimiter = "\t";
	} else if (commaCount > semicolonCount * 2 && commaCount > tabCount * 2) {
		delimiter = ",";
	}

	for (const line of lines) {
		if (!line.trim()) continue;

		// Simple RFC 4180 aware split
		const cells: string[] = [];
		let inQuotes = false;
		let currentCell = "";

		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"') {
				if (inQuotes && line[i + 1] === '"') {
					currentCell += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (char === delimiter && !inQuotes) {
				cells.push(currentCell.trim());
				currentCell = "";
			} else {
				currentCell += char;
			}
		}
		cells.push(currentCell.trim());

		if (cells.some((c) => Boolean(c.trim()))) {
			matrix.push(cells);
		}
	}

	return matrix;
}

/**
 * Checks whether text appears to be tabular (has consistent delimiters across rows).
 */
export function isTabularText(rawText: string): boolean {
	const clean = rawText
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");

	const lines = clean.split("\n").filter((l) => l.trim().length > 3);
	if (lines.length === 0) return false;

	let semicolonLines = 0;
	let tabLines = 0;

	for (const line of lines.slice(0, 20)) {
		if (line.includes(";")) semicolonLines++;
		if (line.includes("\t")) tabLines++;
	}

	return semicolonLines >= 3 || tabLines >= 3;
}

// =============================================================================
// 3. UNSTRUCTURED LINE EXTRACTOR & CLEANER
// =============================================================================

export interface UnstructuredPriceLineExtract {
	readonly rawPriceString: string;
	readonly priceResult: PriceParseResult;
	readonly cleanedTitle: string;
	readonly explicitCode?: string | undefined;
}

/**
 * Robustly extracts price and title from a messy single line of text.
 */
export function extractFromUnstructuredLine(rawLine: string): UnstructuredPriceLineExtract {
	let line = (rawLine || "").trim();

	// Strip leading AND trailing OCR artifacts, bullets, dashes, pipes: "•", "|", "*", "1.", "1.2"
	line = line
		.replace(/^[|•*▪\-\—\–\s]+/, "")
		.replace(/[|•*▪\-\—\–\s]+$/, "")
		.trim();

	// Check if line starts with code (e.g. "A16.07.002", "1.1", "ТХ-01")
	let explicitCode: string | undefined;
	const leadingCodeMatch = line.match(/^([A-ZА-Я]\d{2}\.\d{2}\.\d{3}(?:\.\d{3})?|[A-ZА-Я0-9]{2,6}[-\/]\d{2,4})\b/i);
	if (leadingCodeMatch && leadingCodeMatch[1]) {
		explicitCode = leadingCodeMatch[1].toUpperCase();
		line = line.slice(leadingCodeMatch[0].length).replace(/^[\s\-–—:=.]+/, "").trim();
	}

	// 1. Check for free/warranty at line end or as whole line
	const lower = line.toLowerCase();
	if (
		lower.endsWith("бесплатно") ||
		lower.endsWith("по гарантии") ||
		lower.includes("бесплатно")
	) {
		const cleanTitle = line
			.replace(/[\s\-–—:=.]*(?:бесплатно|по\s+гарантии)\s*$/i, "")
			.replace(/^[\d\.\)\-\—\–\s]+/, "")
			.trim();
		return {
			rawPriceString: "0 руб",
			priceResult: {
				success: true,
				priceRub: 0,
				priceKopecks: 0,
				isWarrantyOrFree: true,
			},
			cleanedTitle: cleanTitle || line,
			explicitCode,
		};
	}

	// 2. Check for contractual price
	if (
		lower.includes("договорная") ||
		lower.includes("индивидуально") ||
		lower.includes("по факту")
	) {
		const cleanTitle = line
			.replace(/[\s\-–—:=.]*(?:договорная|индивидуально|по\s+факту)\s*$/i, "")
			.replace(/^[\d\.\)\-\—\–\s]+/, "")
			.trim();
		return {
			rawPriceString: "договорная",
			priceResult: {
				success: false,
				priceRub: 0,
				priceKopecks: 0,
				isWarrantyOrFree: false,
				error: "Цена договорная: укажите точную сумму",
			},
			cleanedTitle: cleanTitle || line,
			explicitCode,
		};
	}

	// 3. Extract price at end of line (rubles & kopecks, ruble symbols, or plain digits)
	// Regex A: explicitly formatted rubles + kopecks ("4 500,50 руб", "1 500-00", "1500.50 ₽")
	const regexKopecks =
		/(?:от\s*)?(\d{1,3}(?:[ \u00A0]\d{3})*[.,]\d{2}|\d+[.,]\d{2}|\d{1,3}(?:[ \u00A0]\d{3})*-00|\d+-00)\s*(?:руб(?:л(?:ей|я)|ь)?\.?|р\.?|₽)?\s*$/i;

	// Regex B: integer with currency ("... 4 500 руб", "... 4500 ₽", "... 12500 р", "... 4 500 р.")
	const regexCurrencyInt =
		/(?:от\s*)?(\d{1,3}(?:[ \u00A0]\d{3})+|\d+)\s*(?:руб(?:л(?:ей|я)|ь)?\.?|р\.?|₽)\s*$/i;

	// Regex C: trailing tabulated digits preceded by spaces/tabs/dots/dashes ("Лечение кариеса    4500", "Винир .... 32 000 руб")
	const regexTrailingDigits =
		/(?:[\s\t;|\-–—.:])(\d{1,3}(?:[ \u00A0]\d{3})+|\d{2,7})(?:[.,]\d{2})?\s*$/;

	let matchedPriceStr = "";
	let titleWithoutPrice = line;

	const matchA = line.match(regexKopecks);
	if (matchA && matchA[1]) {
		matchedPriceStr = matchA[0].trim();
		titleWithoutPrice = line.slice(0, matchA.index).trim();
	} else {
		const matchB = line.match(regexCurrencyInt);
		if (matchB && matchB[1]) {
			matchedPriceStr = matchB[0].trim();
			titleWithoutPrice = line.slice(0, matchB.index).trim();
		} else {
			const matchC = line.match(regexTrailingDigits);
			if (matchC && matchC[1]) {
				matchedPriceStr = matchC[1].trim();
				titleWithoutPrice = line.slice(0, matchC.index).trim();
			}
		}
	}

	const priceResult = normalizePricelistPrice(matchedPriceStr);

	const cleanedTitle = titleWithoutPrice
		.replace(/^[\d\.\)\-\—\–\s]+/, "")
		.replace(/[\-–—:=|.\s]+$/, "")
		.replace(/\s{2,}/g, " ")
		.trim();

	return {
		rawPriceString: matchedPriceStr,
		priceResult,
		cleanedTitle: cleanedTitle || line,
		explicitCode,
	};
}

// =============================================================================
// 4. CORE UNIVERSAL PRICE SCANNER
// =============================================================================

/**
 * Universal scanner that ingests 2D Excel matrix, CSV string, or unstructured text dump,
 * normalizes prices with exact kopecks, classifies Order 804n nomenclature, and cross-references.
 */
export function scanPriceList(
	input: string | (string | number | null | undefined)[][],
	options?: ScanPricelistOptions,
): ScannedPricelistResult {
	const existingCatalog = options?.existingCatalog || [];
	const customMapping = options?.customMapping;

	// Determine format
	let matrix: string[][] = [];
	let isTabular = false;
	let formatDetected: ScannedInputFormat = "unstructured_text";

	if (Array.isArray(input)) {
		isTabular = true;
		formatDetected = "tabular_excel";
		matrix = input.map((row) =>
			(Array.isArray(row) ? row : []).map((c) => (c === null || c === undefined ? "" : String(c).trim())),
		);
	} else if (typeof input === "string") {
		if (options?.forceFormat === "tabular_csv" || isTabularText(input)) {
			isTabular = true;
			formatDetected = "tabular_csv";
			matrix = parseDelimitedTextToMatrix(input);
		} else {
			isTabular = false;
			formatDetected = "unstructured_text";
		}
	}

	if (isTabular && matrix.length > 0) {
		return scanTabularMatrix(matrix, formatDetected, existingCatalog, customMapping);
	}

	const rawText = typeof input === "string" ? input : "";
	return scanUnstructuredText(rawText, existingCatalog);
}

// ─── TABULAR MATRIX SCANNER ──────────────────────────────────────────────────

function scanTabularMatrix(
	matrix: string[][],
	formatDetected: ScannedInputFormat,
	existingCatalog: readonly ServiceCatalogItem[],
	customMapping?: Partial<ColumnMappingConfig> | undefined,
): ScannedPricelistResult {
	const headerRowIndex = findHeaderRowIndex(matrix);
	const headers = (matrix[headerRowIndex] || []).map((h) => (h || "").trim());

	const vendorSignature = detectVendorSignature(headers);
	const vendorLabel = PRICELIST_VENDOR_LABELS[vendorSignature];

	const autoMapping = autoMapColumns(headers);
	const effectiveMapping: ColumnMappingConfig = {
		...autoMapping,
		...customMapping,
		titleCol: customMapping?.titleCol ?? autoMapping.titleCol,
		priceCol: customMapping?.priceCol ?? autoMapping.priceCol,
	};

	const items: ScannedPriceItem[] = [];
	const errors: ScannedPricelistValidationError[] = [];
	const warnings: string[] = [];

	let newCount = 0;
	let updateCount = 0;
	let identicalCount = 0;
	let exactCodesCount = 0;
	let totalConfidence = 0;
	let priceSuccessCount = 0;
	let categorySuccessCount = 0;

	const startDataIndex = headerRowIndex + 1;

	for (let r = startDataIndex; r < matrix.length; r++) {
		const rawRow = matrix[r] || [];
		const rowNumber = r + 1; // 1-based

		if (rawRow.every((c) => !c || c.trim() === "")) {
			continue;
		}

		const titleRaw = (rawRow[effectiveMapping.titleCol] || "").trim();
		const priceRaw = (rawRow[effectiveMapping.priceCol] || "").trim();

		if (!titleRaw) {
			const err: ScannedPricelistValidationError = {
				rowNumber,
				field: "title",
				message: "Отсутствует наименование услуги",
				rawInput: rawRow.join(" | "),
			};
			errors.push(err);
			continue;
		}

		const priceResult = normalizePricelistPrice(priceRaw);
		if (priceResult.success) {
			priceSuccessCount++;
		} else {
			errors.push({
				rowNumber,
				field: "price",
				message: priceResult.error || "Некорректная цена услуги",
				rawInput: priceRaw,
			});
		}

		// Extract code & hints
		const explicitCode =
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

		// 2-Tier 804n matching
		const matchResult = matchOrder804nNomenclature(titleRaw, {
			codeHint: explicit804n || explicitCode,
			categoryHint: categoryRaw || category,
			specialtyHint: specialtyRaw || specialty,
		});

		if (matchResult.confidenceKind === "exact_code") exactCodesCount++;
		if (matchResult.category !== "other" && matchResult.category !== "documents") {
			categorySuccessCount++;
		}
		totalConfidence += matchResult.confidence;

		// Extract duration, cost, warranty
		let durationMinutes = STATUTORY_CATEGORY_DURATIONS_MAP[matchResult.category] || 30;
		if (effectiveMapping.durationCol !== undefined) {
			const durRaw = (rawRow[effectiveMapping.durationCol] || "").trim();
			const parsed = parseInt(durRaw.replace(/\D/g, ""), 10);
			if (Number.isFinite(parsed) && parsed > 0 && parsed <= 480) {
				durationMinutes = parsed;
			}
		}

		let costRub: number | undefined;
		if (effectiveMapping.costCol !== undefined) {
			const costRaw = (rawRow[effectiveMapping.costCol] || "").trim();
			const costRes = normalizePricelistPrice(costRaw);
			if (costRes.success) costRub = costRes.priceRub;
		}

		let warrantyMonths: number | undefined;
		if (effectiveMapping.warrantyCol !== undefined) {
			const warRaw = (rawRow[effectiveMapping.warrantyCol] || "").trim();
			const parsed = parseInt(warRaw.replace(/\D/g, ""), 10);
			if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 120) {
				warrantyMonths = parsed;
			}
		}

		// Cross-reference with existing catalog
		const crossRef = crossReferenceTabularRow(
			explicitCode || matchResult.code804n,
			titleRaw,
			priceResult.priceKopecks,
			existingCatalog,
		);

		if (crossRef.action === "create_new") newCount++;
		else if (crossRef.action === "update_existing") updateCount++;
		else if (crossRef.action === "identical") identicalCount++;

		const validationStatus = priceResult.success ? "valid" : "error";

		items.push({
			id: `item-row-${rowNumber}-${Date.now().toString(36)}`,
			rowNumber,
			rawInput: rawRow.join(" | "),
			cleanedTitle: matchResult.cleanedTitle || titleRaw,
			code: explicitCode,
			code804n: matchResult.code804n,
			statutoryTitle804n: matchResult.statutoryTitle804n,
			category: matchResult.category,
			specialty: matchResult.specialty,
			priceRub: priceResult.priceRub,
			priceKopecks: priceResult.priceKopecks,
			costRub,
			durationMinutes,
			warrantyMonths,
			confidence: matchResult.confidence,
			confidenceKind: matchResult.confidenceKind,
			validationStatus,
			validationMessage: priceResult.error,
			suggestedAction: crossRef.action,
			matchedExistingServiceId: crossRef.matchedId,
			matchedExistingTitle: crossRef.matchedTitle,
			matchedExistingPriceRub: crossRef.matchedPriceRub,
			isApproved: validationStatus === "valid",
		});
	}

	const recognizedCount = items.length;
	const validCount = items.filter((i) => i.validationStatus === "valid").length;
	const errorCount = items.filter((i) => i.validationStatus === "error").length;

	const priceAccuracyRate = recognizedCount > 0
		? Math.round((priceSuccessCount / recognizedCount) * 1000) / 10
		: 0;
	const categoryAccuracyRate = recognizedCount > 0
		? Math.round((categorySuccessCount / recognizedCount) * 1000) / 10
		: 0;
	const averageConfidence = recognizedCount > 0
		? Math.round((totalConfidence / recognizedCount) * 100) / 100
		: 0;

	return {
		success: items.length > 0 && validCount > 0,
		items,
		summary: {
			formatDetected,
			vendorSignature,
			vendorLabel,
			detectedMapping: effectiveMapping,
			totalLinesOrRows: matrix.length - startDataIndex,
			recognizedItemsCount: recognizedCount,
			validItemsCount: validCount,
			errorItemsCount: errorCount,
			exactCodesCount,
			averageConfidence,
			priceAccuracyRate,
			categoryAccuracyRate,
			stats: {
				newCount,
				updateCount,
				identicalCount,
			},
		},
		errors,
		warnings,
	};
}

// ─── UNSTRUCTURED TEXT SCANNER ───────────────────────────────────────────────

function scanUnstructuredText(
	rawText: string,
	existingCatalog: readonly ServiceCatalogItem[],
): ScannedPricelistResult {
	const clean = rawText
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");

	const rawLines = clean.split("\n");
	const items: ScannedPriceItem[] = [];
	const errors: ScannedPricelistValidationError[] = [];
	const warnings: string[] = [];

	let newCount = 0;
	let updateCount = 0;
	let identicalCount = 0;
	let exactCodesCount = 0;
	let totalConfidence = 0;
	let priceSuccessCount = 0;
	let categorySuccessCount = 0;

	const headerFooterRegex =
		/^(?:прейскурант|прайс[-\s]?лист|стоматологическ|ооо|зао|пао|ип\s+[а-я]|лицензи|утв\.|утвержд|генеральн|главн.*врач|страниц|стр\.\s*\d+|действует\s+с|раздел|глава)/i;

	let rowNumber = 0;

	for (const rawLine of rawLines) {
		rowNumber++;
		const trimmed = rawLine.trim();
		if (trimmed.length < 3) continue;

		// Skip separator decoration lines: "====", "-------", "******"
		if (/^[-=_*~#\s|+]{4,}$/.test(trimmed)) continue;

		// Skip pure header lines without prices (ignoring 4-digit years 19xx/20xx)
		const trimmedWithoutYears = trimmed.replace(/\b(?:19\d\d|20\d\d)\s*(?:г\.?|года)?\b/gi, "");
		if (headerFooterRegex.test(trimmed) && !/\d{2,}/.test(trimmedWithoutYears)) {
			continue;
		}

		// Extract price & title
		const extract = extractFromUnstructuredLine(trimmed);
		if (!extract.cleanedTitle || extract.cleanedTitle.length < 2) {
			continue;
		}

		if (extract.priceResult.success) {
			priceSuccessCount++;
		} else {
			errors.push({
				rowNumber,
				field: "price",
				message: extract.priceResult.error || "Не удалось распознать цену",
				rawInput: trimmed,
			});
		}

		// 2-tier 804n matching
		const matchResult = matchOrder804nNomenclature(trimmed, {
			codeHint: extract.explicitCode,
		});

		if (matchResult.confidenceKind === "exact_code") exactCodesCount++;
		if (matchResult.category !== "other" && matchResult.category !== "documents") {
			categorySuccessCount++;
		}
		totalConfidence += matchResult.confidence;

		const durationMinutes = STATUTORY_CATEGORY_DURATIONS_MAP[matchResult.category] || 30;

		// Cross-reference with existing catalog
		const crossRef = crossReferenceTabularRow(
			extract.explicitCode || matchResult.code804n,
			extract.cleanedTitle,
			extract.priceResult.priceKopecks,
			existingCatalog,
		);

		if (crossRef.action === "create_new") newCount++;
		else if (crossRef.action === "update_existing") updateCount++;
		else if (crossRef.action === "identical") identicalCount++;

		const validationStatus = extract.priceResult.success ? "valid" : "error";

		items.push({
			id: `unstructured-line-${rowNumber}-${Date.now().toString(36)}`,
			rowNumber,
			rawInput: trimmed,
			cleanedTitle: extract.cleanedTitle,
			code: extract.explicitCode,
			code804n: matchResult.code804n,
			statutoryTitle804n: matchResult.statutoryTitle804n,
			category: matchResult.category,
			specialty: matchResult.specialty,
			priceRub: extract.priceResult.priceRub,
			priceKopecks: extract.priceResult.priceKopecks,
			durationMinutes,
			confidence: matchResult.confidence,
			confidenceKind: matchResult.confidenceKind,
			validationStatus,
			validationMessage: extract.priceResult.error,
			suggestedAction: crossRef.action,
			matchedExistingServiceId: crossRef.matchedId,
			matchedExistingTitle: crossRef.matchedTitle,
			matchedExistingPriceRub: crossRef.matchedPriceRub,
			isApproved: validationStatus === "valid",
		});
	}

	const recognizedCount = items.length;
	const validCount = items.filter((i) => i.validationStatus === "valid").length;
	const errorCount = items.filter((i) => i.validationStatus === "error").length;

	const priceAccuracyRate = recognizedCount > 0
		? Math.round((priceSuccessCount / recognizedCount) * 1000) / 10
		: 0;
	const categoryAccuracyRate = recognizedCount > 0
		? Math.round((categorySuccessCount / recognizedCount) * 1000) / 10
		: 0;
	const averageConfidence = recognizedCount > 0
		? Math.round((totalConfidence / recognizedCount) * 100) / 100
		: 0;

	return {
		success: items.length > 0 && validCount > 0,
		items,
		summary: {
			formatDetected: "unstructured_text",
			totalLinesOrRows: rawLines.length,
			recognizedItemsCount: recognizedCount,
			validItemsCount: validCount,
			errorItemsCount: errorCount,
			exactCodesCount,
			averageConfidence,
			priceAccuracyRate,
			categoryAccuracyRate,
			stats: {
				newCount,
				updateCount,
				identicalCount,
			},
		},
		errors,
		warnings,
	};
}
