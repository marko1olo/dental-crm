/**
 * apps/api/src/services/import/streaming/spreadsheetMatrixParser.ts
 *
 * Universal Matrix Parser for CSV, TSV, XLSX, and ODS.
 * RFC 4180 Delimited Text Parser with Delimiter Auto-Detection and Quoted Multiline Handling.
 */

import {
	looksLikeZipContainer,
	parseOds,
	parseXlsx,
} from "../../../migration/parsers/spreadsheet.js";

export interface ParsedSpreadsheetData {
	rows: string[][];
	sheetNames: string[];
}

/**
 * Universal Matrix Parser for CSV, TSV, XLSX, and ODS.
 */
export function parseSpreadsheetBufferToMatrix(
	buffer: Buffer,
	filename: string,
	sheetIndex = 0,
): ParsedSpreadsheetData {
	const lower = filename.toLowerCase();

	if (lower.endsWith(".xlsx") || lower.endsWith(".ods") || looksLikeZipContainer(buffer)) {
		const isOds = lower.endsWith(".ods");
		const book = isOds ? parseOds(buffer) : parseXlsx(buffer);
		if (book.sheets.length > 0) {
			const idx = Math.min(sheetIndex, book.sheets.length - 1);
			return {
				rows: book.sheets[idx]?.rows ?? [],
				sheetNames: book.sheets.map((s) => s.name),
			};
		}
	}

	// Plain text CSV / TSV
	const text = buffer.toString("utf8");
	return {
		rows: parseDelimitedTextToMatrix(text),
		sheetNames: ["Лист 1"],
	};
}

/**
 * RFC 4180 Delimited Text Parser with Delimiter Auto-Detection and Quoted Multiline Handling.
 */
export function parseDelimitedTextToMatrix(text: string): string[][] {
	const cleaned = text
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");
	if (!cleaned.trim()) return [];

	// Detect delimiter from sample
	const sample = cleaned.slice(0, 1000);
	const semicolons = (sample.match(/;/g) || []).length;
	const commas = (sample.match(/,/g) || []).length;
	const tabs = (sample.match(/\t/g) || []).length;

	let delimiter = ";";
	if (tabs > semicolons && tabs > commas) delimiter = "\t";
	else if (commas > semicolons && commas > tabs) delimiter = ",";

	const matrix: string[][] = [];
	let currentRow: string[] = [];
	let currentCell = "";
	let inQuotes = false;

	for (let i = 0; i < cleaned.length; i++) {
		const char = cleaned[i];
		if (char === '"') {
			if (inQuotes && cleaned[i + 1] === '"') {
				currentCell += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === delimiter && !inQuotes) {
			currentRow.push(currentCell.trim());
			currentCell = "";
		} else if (char === "\n" && !inQuotes) {
			currentRow.push(currentCell.trim());
			currentCell = "";
			if (currentRow.some((c) => c.length > 0)) {
				matrix.push(currentRow);
			}
			currentRow = [];
		} else {
			currentCell += char;
		}
	}

	if (currentCell.length > 0 || currentRow.length > 0) {
		currentRow.push(currentCell.trim());
		if (currentRow.some((c) => c.length > 0)) {
			matrix.push(currentRow);
		}
	}

	return matrix;
}
