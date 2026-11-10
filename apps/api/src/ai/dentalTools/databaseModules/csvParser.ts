/**
 * @file apps/api/src/ai/dentalTools/databaseModules/csvParser.ts
 * @description Facade delegating to universal CSV parser in services/imports/csvParser.
 * Mandates: 8bf (Single SSOT), 8b (<= 120 lines), 8n (solo-practice import).
 */

import {
	parseCsv,
	parseCsvTable,
	detectCsvDelimiter,
	normalizeCsvHeader,
	parseCsvLine,
	parseCsvRows as parseRawCsvRows,
	type CsvParseOptions,
	type CsvParseResult,
} from "../../../services/imports/csvParser.js";

export {
	detectCsvDelimiter,
	normalizeCsvHeader,
	parseCsvLine,
	parseRawCsvRows,
	parseCsvTable,
	parseCsv,
	type CsvParseOptions,
	type CsvParseResult,
};

/**
 * Parses CSV content into headers and row objects using the canonical universal parser.
 * Backward-compatible with dentalTools import tools.
 */
export function parseCsvRows(
	rawContent: string,
	explicitDelimiter?: string,
): { headers: string[]; rows: Record<string, string>[] } {
	return parseCsvTable(rawContent, explicitDelimiter);
}
