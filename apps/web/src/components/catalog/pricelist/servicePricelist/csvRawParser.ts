/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * RFC 4180 CSV Raw Text Parser
 */

import { UTF8_BOM } from "./csvExport";

/**
 * Parses raw RFC 4180 CSV text into structured table records.
 */
export function parseRawCsvText(
	csvText: string,
	delimiter?: ";" | ",",
): string[][] {
	let cleanText = csvText;
	if (cleanText.startsWith(UTF8_BOM)) {
		cleanText = cleanText.slice(UTF8_BOM.length);
	}

	// Auto-detect delimiter if not explicitly provided
	const delim =
		delimiter ?? (cleanText.split("\n")[0]?.includes(";") ? ";" : ",");

	const rows: string[][] = [];
	let currentRow: string[] = [];
	let currentCell = "";
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
			currentCell = "";
			i++;
			continue;
		}

		if (!insideQuotes && (char === "\r" || char === "\n")) {
			if (char === "\r" && nextChar === "\n") {
				i++;
			}
			currentRow.push(currentCell.trim());
			if (currentRow.some((c) => c.length > 0)) {
				rows.push(currentRow);
			}
			currentRow = [];
			currentCell = "";
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
