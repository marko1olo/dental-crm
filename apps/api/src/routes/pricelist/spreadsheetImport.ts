import {
	type ServiceCatalogItem,
} from "@dental/shared";
import {
	looksLikeZipContainer,
	parseOds,
	parseXlsx,
} from "../../migration/parsers/spreadsheet.js";
import {
	SERVICE_CATEGORIES_METADATA,
	type ScanAndImportItem,
} from "./types.js";

/**
 * Escapes a cell value for RFC 4180 CSV compliance.
 */
export function escapeCsvCell(value: unknown, delimiter = ";"): string {
	if (value === null || value === undefined) return "";
	const str = String(value);
	if (
		str.includes(delimiter) ||
		str.includes('"') ||
		str.includes("\n") ||
		str.includes("\r")
	) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Universal CSV / TSV text to matrix parser (RFC 4180 compliant with UTF-8 BOM stripping).
 */
export function parseCsvToMatrix(text: string): string[][] {
	const cleaned = text
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");
	const lines = cleaned.split("\n");
	if (lines.length === 0) return [];

	const sample = lines.slice(0, 10).join("\n");
	const semicolonCount = (sample.match(/;/g) || []).length;
	const commaCount = (sample.match(/,/g) || []).length;
	const tabCount = (sample.match(/\t/g) || []).length;

	let delimiter = ";";
	if (tabCount > semicolonCount && tabCount > commaCount) delimiter = "\t";
	else if (commaCount > semicolonCount && commaCount > tabCount) delimiter = ",";

	const result: string[][] = [];
	for (const line of lines) {
		if (!line.trim()) continue;
		const row: string[] = [];
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
				row.push(currentCell.trim());
				currentCell = "";
			} else {
				currentCell += char;
			}
		}
		row.push(currentCell.trim());
		result.push(row);
	}
	return result;
}

export interface ParsedSpreadsheetBook {
	rows: string[][];
	sheets: string[];
	selectedSheetIndex: number;
}

/**
 * Parses XLSX / ODS buffer or CSV buffer into sheet matrix.
 */
export function parseSpreadsheetBuffer(
	buffer: Buffer,
	filename: string,
	selectedSheetIndex = 0,
): ParsedSpreadsheetBook {
	const lowerName = filename.toLowerCase();
	let sheets: string[] = ["Лист 1"];
	let rows: string[][] = [];

	if (
		lowerName.endsWith(".xlsx") ||
		lowerName.endsWith(".ods") ||
		looksLikeZipContainer(buffer)
	) {
		const isOds = lowerName.endsWith(".ods");
		const parsedBook = isOds ? parseOds(buffer) : parseXlsx(buffer);
		if (parsedBook.sheets.length > 0) {
			sheets = parsedBook.sheets.map((s) => s.name);
			const sheetIdx = Math.min(
				selectedSheetIndex,
				parsedBook.sheets.length - 1,
			);
			rows = parsedBook.sheets[sheetIdx]?.rows ?? [];
			return {
				rows,
				sheets,
				selectedSheetIndex: sheetIdx,
			};
		}
	} else {
		const text = buffer.toString("utf8");
		rows = parseCsvToMatrix(text);
	}

	return {
		rows,
		sheets,
		selectedSheetIndex: Math.min(selectedSheetIndex, sheets.length - 1),
	};
}

/**
 * Extracts raw text or matrix rows from buffer for scan-and-import.
 */
export function extractScanInputFromBuffer(
	buffer: Buffer,
	filename: string,
	selectedSheetIndex = 0,
): string | string[][] {
	const lowerName = (filename || "").toLowerCase();
	if (
		lowerName.endsWith(".xlsx") ||
		lowerName.endsWith(".ods") ||
		looksLikeZipContainer(buffer)
	) {
		const isOds = lowerName.endsWith(".ods");
		const parsedBook = isOds ? parseOds(buffer) : parseXlsx(buffer);
		if (parsedBook.sheets.length > 0) {
			const sheetIdx = Math.min(
				selectedSheetIndex,
				parsedBook.sheets.length - 1,
			);
			return parsedBook.sheets[sheetIdx]?.rows ?? [];
		}
		return [];
	}
	return buffer.toString("utf8");
}

/**
 * Formats clinical catalog items to RFC 4180 CSV with UTF-8 BOM.
 */
export function formatPricelistToCsv(items: ServiceCatalogItem[]): string {
	const delimiter = ";";
	const headers = [
		"Код услуги",
		"Коммерческое наименование",
		"Раздел",
		"Специальность",
		"Цена (руб)",
		"Длительность (мин)",
		"НДС",
		"Налоговый вычет",
		"Статус",
	];

	const rows: string[] = [
		headers.map((h) => escapeCsvCell(h, delimiter)).join(delimiter),
	];

	for (const item of items) {
		const categoryMeta = SERVICE_CATEGORIES_METADATA.find(
			(m) => m.id === item.category,
		);
		const categoryTitle = categoryMeta?.shortLabel || item.category;
		const row = [
			item.code,
			item.title,
			categoryTitle,
			item.specialty,
			item.basePriceRub,
			item.durationMinutes,
			"НДС не облагается (ст. 149 НК РФ)",
			item.taxDeductible ? "Да" : "Нет",
			item.active ? "Активна" : "В архиве",
		];
		rows.push(row.map((val) => escapeCsvCell(val, delimiter)).join(delimiter));
	}

	const UTF8_BOM = "\uFEFF";
	return UTF8_BOM + rows.join("\r\n");
}

/**
 * Resolves spreadsheet rows and sheet list from base64 or raw text.
 */
export function resolveSpreadsheetRowsAndSheets(
	fileBase64?: string,
	rawText?: string,
	filename = "pricelist.csv",
	selectedSheetIndex = 0,
): ParsedSpreadsheetBook {
	if (fileBase64) {
		const buffer = Buffer.from(fileBase64, "base64");
		return parseSpreadsheetBuffer(buffer, filename, selectedSheetIndex);
	}
	if (rawText) {
		return {
			rows: parseCsvToMatrix(rawText),
			sheets: ["Лист 1"],
			selectedSheetIndex: 0,
		};
	}
	throw new Error(
		"Передайте содержимое файла (fileBase64) или текст (rawText).",
	);
}

/**
 * Resolves input for price list scanning from file or raw text.
 */
export function resolveSpreadsheetScanInput(params: {
	fileBase64?: string;
	rawContent?: string;
	rawText?: string;
	filename?: string;
	selectedSheetIndex?: number;
	commit?: boolean;
	approvedItems?: ScanAndImportItem[];
}): string | string[][] {
	const {
		fileBase64,
		rawContent,
		rawText,
		filename = "pricelist.txt",
		selectedSheetIndex = 0,
		commit,
		approvedItems,
	} = params;

	if (fileBase64) {
		const buffer = Buffer.from(fileBase64, "base64");
		return extractScanInputFromBuffer(buffer, filename, selectedSheetIndex);
	}
	if (rawContent || rawText) {
		return rawContent || rawText || "";
	}
	if (commit && approvedItems && approvedItems.length > 0) {
		return "";
	}
	throw new Error("Передайте файл (fileBase64) или текст (rawContent / rawText).");
}
