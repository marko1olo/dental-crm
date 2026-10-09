/**
 * DENTE Dental CRM — Multi-Format Line & Token Extractor & Price Parser
 * Layer 1: Pure Tabular & Document Text Parsing (0 side effects)
 */

import { parseKopecks, formatKopecksToRubles } from "@dental/shared";
import type { PriceListIngestSourceType, ExtractedPriceInfo } from "./types.js";

// =============================================================================
// MULTI-FORMAT LINE & TOKEN EXTRACTOR
// =============================================================================

/**
 * Normalizes input text across Word copies, PDF text extractions, CSVs, and OCR.
 */
export function extractLinesFromPriceList(rawContent: string, sourceType?: PriceListIngestSourceType): string[] {
	if (!rawContent || typeof rawContent !== "string") return [];

	// 1. Unify newlines and strip zero-width spaces, BOM, control characters
	const cleanedContent = rawContent
		.replace(/^\uFEFF/, "")
		.replace(/[\u200B-\u200D\uFEFF]/g, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");

	// 2. Format specific preprocessing
	let lines: string[] = [];

	if (sourceType === "csv" || (cleanedContent.includes(";") && cleanedContent.split("\n").some((l) => l.includes(";")))) {
		// CSV handling: split by newline, handle delimited columns
		const rawLines = cleanedContent.split("\n");
		for (const rawLine of rawLines) {
			const line = rawLine.trim();
			if (!line) continue;
			// Replace semicolon or tab delimiters with space, while preserving column order
			const parts = line.split(/[;\t]/).map((p) => p.replace(/^"|"$/g, "").trim()).filter(Boolean);
			if (parts.length > 0) {
				lines.push(parts.join("  "));
			}
		}
	} else {
		// Standard / Word / OCR / PDF text: split by lines
		lines = cleanedContent.split("\n");
	}

	// 3. Filter out obvious headers, clinic metadata, and page footers
	const filteredLines: string[] = [];
	const headerFooterRegex = /^(?:прейскурант|прайс[-\s]?лист|стоматологическ|ооо|зао|пао|ип\s+[а-я]|лицензи|утв\.|утвержд|генеральн|главн.*врач|страниц|стр\.\s*\d+|действует\s+с|раздел|глава|номенклатур|код\s+услуг|наименование\s+услуг|цена\s*,?\s*руб|стоимость\s*,?\s*руб)/i;

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.length < 3) continue;

		// Skip separator decoration lines: "====", "-------", "******"
		if (/^[-=_*~#\s|+]{4,}$/.test(trimmed)) continue;

		// Skip pure header lines without prices (ignoring year 19xx/20xx)
		const trimmedWithoutYears = trimmed.replace(/\b(?:19\d\d|20\d\d)\s*(?:г\.?|года)?\b/gi, "");
		if (headerFooterRegex.test(trimmed) && !/\d{2,}/.test(trimmedWithoutYears)) continue;

		filteredLines.push(trimmed);
	}

	return filteredLines;
}

// =============================================================================
// ROBUST PRICE EXTRACTION WITH KOPECKS
// =============================================================================

/**
 * Extracts exact price (with kopecks) from messy price list lines,
 * cleanly separating the price segment from the commercial title.
 */
export function extractPriceAndTitleFromLine(rawLine: string): ExtractedPriceInfo {
	let line = rawLine.trim();

	// Replace OCR artifacts: "|", double colons, trailing dashes
	line = line.replace(/^[|•*▪\-\—\–\s]+/, "").trim();

	let priceRub = 0;
	let priceKopecks = 0;
	let rawPriceString = "";
	let cleanTitle = line;

	// Regex 1: Explicit Rubles + Kopecks format at end of line (ReDoS safe, non-overlapping):
	// "4 500,50 руб", "1500.50 ₽", "1 500-00", "1500 руб. 00 коп."
	const endCurrencyKopecksRegex =
		/(?:от\s*)?(\d{1,3}(?: \d{3})*[.,]\d{2}|\d+[.,]\d{2}|\d{1,3}(?: \d{3})*-00|\d+-00)\s*(?:руб(?:л(?:ей|я)|ь)?\.?|р\.?|₽)?\s*$/i;

	// Regex 2: Standard integer number with mandatory currency at end of line:
	// "... 4 500 руб", "... 4500 ₽", "... 12500 р."
	const endCurrencyIntegerRegex =
		/(?:от\s*)?(\d{1,3}(?: \d{3})+|\d+)\s*(?:руб(?:л(?:ей|я)|ь)?\.?|р\b|₽)\s*$/i;

	// Regex 3: Plain digits at end of line preceded by spaces/tabs/delimiters:
	// "Лечение кариеса    4500" or "Коронка 18000"
	const endPlainNumberRegex =
		/(?:[\s\t;|])(\d{1,3}(?: \d{3})+|\d{2,7})(?:[.,]\d{2})?\s*$/;

	// Try Regex 1 (highest precision)
	const match1 = line.match(endCurrencyKopecksRegex);
	if (match1 && match1[1]) {
		const rawDigits = match1[1].replace(/\s+/g, "").replace("-00", ".00").replace(",", ".");
		try {
			const kopecks = parseKopecks(rawDigits);
			if (kopecks > 0 && kopecks <= 10_000_000 * 100) {
				priceKopecks = kopecks;
				priceRub = Number(formatKopecksToRubles(kopecks));
				rawPriceString = match1[0].trim();
				cleanTitle = line.slice(0, match1.index).trim();
			}
		} catch {
			// ignore parse failure, proceed to fallback regexes
		}
	}

	// Try Regex 2 if Regex 1 did not extract valid price
	if (priceRub === 0) {
		const match2 = line.match(endCurrencyIntegerRegex);
		if (match2 && match2[1]) {
			const rawDigits = match2[1].replace(/[\s\.]/g, "");
			const parsed = parseInt(rawDigits, 10);
			if (Number.isFinite(parsed) && parsed >= 50 && parsed <= 10_000_000) {
				priceRub = parsed;
				priceKopecks = parsed * 100;
				rawPriceString = match2[0].trim();
				cleanTitle = line.slice(0, match2.index).trim();
			}
		}
	}

	// Try Regex 3 if still not found (tabulated numbers without currency)
	if (priceRub === 0) {
		const match3 = line.match(endPlainNumberRegex);
		if (match3 && match3[1]) {
			const rawDigits = match3[1].replace(/\s+/g, "").replace(",", ".");
			try {
				const kopecks = parseKopecks(rawDigits);
				if (kopecks >= 50 * 100 && kopecks <= 10_000_000 * 100) {
					priceKopecks = kopecks;
					priceRub = Number(formatKopecksToRubles(kopecks));
					rawPriceString = match3[1].trim();
					cleanTitle = line.slice(0, match3.index).trim();
				}
			} catch {
				// ignore parse failure
			}
		}
	}

	// Clean remaining commercial title
	cleanTitle = cleanTitle
		.replace(/^[\d\.\)\-\—\–\s]+/, "") // Leading row numbering: "1.", "1.2.3", "12)"
		.replace(/[\-–—:=|]+$/, "")        // Trailing separator dashes/colons
		.replace(/\s{2,}/g, " ")           // Excess whitespace
		.trim();

	return {
		priceRub,
		priceKopecks,
		rawPriceString,
		cleanTitleWithoutPrice: cleanTitle,
	};
}
