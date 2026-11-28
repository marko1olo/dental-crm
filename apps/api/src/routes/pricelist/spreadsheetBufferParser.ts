import {
	looksLikeZipContainer,
	parseOds,
	readXlsxSheetNames,
	streamXlsxSheetBatches,
} from "../../migration/parsers/spreadsheet.js";
import { parseCsvToMatrix } from "./csvMatrixParser.js";

export interface ParsedSpreadsheetBook {
	rows: string[][];
	sheets: string[];
	selectedSheetIndex: number;
}

const MAX_SPREADSHEET_PREVIEW_ROWS = 50_000;

async function readXlsxSingleSheetRows(
	buffer: Buffer,
	sheetIndex: number,
): Promise<string[][]> {
	const rows: string[][] = [];
	let headerCaptured = false;
	for await (const batch of streamXlsxSheetBatches(buffer, {
		sheetIndex,
		batchRows: 2000,
		maxRowsPerSheet: MAX_SPREADSHEET_PREVIEW_ROWS,
	})) {
		if (!headerCaptured && batch.columns.length > 0) {
			rows.push(batch.columns);
			headerCaptured = true;
		}
		for (const row of batch.rows) {
			rows.push(row);
		}
	}
	return rows;
}

/**
 * Parses XLSX / ODS buffer or CSV buffer into sheet matrix.
 * For XLSX, streams ONLY the selected sheet instead of loading all sheets into RAM.
 */
export async function parseSpreadsheetBuffer(
	buffer: Buffer,
	filename: string,
	selectedSheetIndex = 0,
): Promise<ParsedSpreadsheetBook> {
	const lowerName = filename.toLowerCase();
	let sheets: string[] = ["Лист 1"];
	let rows: string[][] = [];

	if (
		lowerName.endsWith(".xlsx") ||
		lowerName.endsWith(".ods") ||
		looksLikeZipContainer(buffer)
	) {
		const isOds = lowerName.endsWith(".ods");
		if (isOds) {
			const parsedBook = await parseOds(buffer, {
				maxRowsPerSheet: MAX_SPREADSHEET_PREVIEW_ROWS,
				selectedSheetIndex,
			});
			if (parsedBook.sheets.length > 0) {
				sheets = parsedBook.sheets.map((s) => s.name);
				const sheetIdx = Math.max(
					0,
					Math.min(selectedSheetIndex, parsedBook.sheets.length - 1),
				);
				const targetSheet = parsedBook.sheets[sheetIdx];
				if (targetSheet && targetSheet.rows.length > 0) {
					rows = targetSheet.rows;
				} else if (sheetIdx !== selectedSheetIndex) {
					const reParsed = await parseOds(buffer, {
						maxRowsPerSheet: MAX_SPREADSHEET_PREVIEW_ROWS,
						selectedSheetIndex: sheetIdx,
					});
					rows = reParsed.sheets[sheetIdx]?.rows ?? [];
				}
				return {
					rows,
					sheets,
					selectedSheetIndex: sheetIdx,
				};
			}
		} else {
			const sheetNames = await readXlsxSheetNames(buffer);
			if (sheetNames.length > 0) {
				sheets = sheetNames;
				const sheetIdx = Math.max(
					0,
					Math.min(selectedSheetIndex, sheetNames.length - 1),
				);
				rows = await readXlsxSingleSheetRows(buffer, sheetIdx);
				return {
					rows,
					sheets,
					selectedSheetIndex: sheetIdx,
				};
			}
		}
	} else {
		const text = buffer.toString("utf8");
		rows = parseCsvToMatrix(text);
	}

	return {
		rows,
		sheets,
		selectedSheetIndex: Math.max(0, Math.min(selectedSheetIndex, sheets.length - 1)),
	};
}

/**
 * Extracts raw text or matrix rows from buffer for scan-and-import.
 */
export async function extractScanInputFromBuffer(
	buffer: Buffer,
	filename: string,
	selectedSheetIndex = 0,
): Promise<string | string[][]> {
	const lowerName = (filename || "").toLowerCase();
	if (
		lowerName.endsWith(".xlsx") ||
		lowerName.endsWith(".ods") ||
		looksLikeZipContainer(buffer)
	) {
		const parsed = await parseSpreadsheetBuffer(
			buffer,
			filename,
			selectedSheetIndex,
		);
		return parsed.rows;
	}
	return buffer.toString("utf8");
}
