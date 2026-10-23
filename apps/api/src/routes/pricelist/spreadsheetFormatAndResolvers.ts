import { type ServiceCatalogItem } from "@dental/shared";
import { escapeCsvCell, parseCsvToMatrix } from "./csvMatrixParser.js";
import {
	extractScanInputFromBuffer,
	parseSpreadsheetBuffer,
	type ParsedSpreadsheetBook,
} from "./spreadsheetBufferParser.js";
import {
	SERVICE_CATEGORIES_METADATA,
	type ScanAndImportItem,
} from "./types.js";

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
	fileBase64?: string | undefined;
	rawContent?: string | undefined;
	rawText?: string | undefined;
	filename?: string | undefined;
	selectedSheetIndex?: number | undefined;
	commit?: boolean | undefined;
	approvedItems?: ScanAndImportItem[] | undefined;
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
