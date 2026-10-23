import { normalizePricelistPrice, type PriceParseResult } from "../clinical/pricelistBatchImport.js";

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

	line = line
		.replace(/^[|•*▪\-\—\–\s]+/, "")
		.replace(/[|•*▪\-\—\–\s]+$/, "")
		.trim();

	let explicitCode: string | undefined;
	const leadingCodeMatch = line.match(/^([A-ZА-Я]\d{2}\.\d{2}\.\d{3}(?:\.\d{3})?|\d{1,4}\.?(?:\d{1,3})?|[A-ZА-Я]{1,4}-\d{1,4})\s*[:\-\—\–.]?\s+(.+)$/i);
	if (leadingCodeMatch && leadingCodeMatch[1] && leadingCodeMatch[2]) {
		explicitCode = leadingCodeMatch[1].trim();
		line = leadingCodeMatch[2].trim();
	}

	const trailingPriceRegex =
		/(?:^|\s+|[;,\t|—–\-])(?:(?:от|до)\s*)?((?:\d{1,3}(?:[\s\u00A0]\d{3})*|\d+)(?:[.,]\d{2})?)\s*(?:₽|руб\.?|р\.?|rur|rub)?(?:\s*[-—–]\s*00)?\s*$/i;

	const inlinePriceRegex =
		/\b(?:цена|стоимость|стоим\.?)\s*[:=–—\-]?\s*((?:\d{1,3}(?:[\s\u00A0]\d{3})*|\d+)(?:[.,]\d{2})?)\s*(?:₽|руб\.?|р\.?)?/i;

	let rawPriceString = "";
	let cleanedTitle = line;

	const trailingMatch = line.match(trailingPriceRegex);
	if (trailingMatch && trailingMatch[1]) {
		rawPriceString = trailingMatch[1].trim();
		const matchIndex = line.lastIndexOf(trailingMatch[0]);
		if (matchIndex > 0) {
			cleanedTitle = line.slice(0, matchIndex).trim();
		}
	} else {
		const inlineMatch = line.match(inlinePriceRegex);
		if (inlineMatch && inlineMatch[1]) {
			rawPriceString = inlineMatch[1].trim();
			cleanedTitle = line.replace(inlinePriceRegex, "").trim();
		}
	}

	if (!rawPriceString) {
		const zeroRegex = /\b(бесплатно|по гарантии|включено|0(?:\.00)?\s*(?:₽|руб)?)\b/i;
		if (zeroRegex.test(line)) {
			rawPriceString = "0";
			cleanedTitle = line.replace(zeroRegex, "").trim();
		}
	}

	cleanedTitle = cleanedTitle
		.replace(/^[|•*▪\-\—\–\s]+/, "")
		.replace(/[|•*▪\-\—\–\s:=.]+\s*$/, "")
		.trim();

	const priceResult = normalizePricelistPrice(rawPriceString);

	return {
		rawPriceString,
		priceResult,
		cleanedTitle: cleanedTitle || line,
		explicitCode,
	};
}
