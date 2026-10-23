import {
	looksLikeZipContainer,
	parseOds,
	parseXlsx,
} from "../../migration/parsers/spreadsheet.js";
import { parseCsvToMatrix } from "./csvMatrixParser.js";

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
