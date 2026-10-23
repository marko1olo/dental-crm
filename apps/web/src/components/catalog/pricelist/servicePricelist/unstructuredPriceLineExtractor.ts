/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Unstructured Price Text: Line Filtering, Code Extraction, Price Extraction & Title Cleaning
 */

export function isSkippablePriceLine(line: string): boolean {
	if (!line || line.length < 3) return true;
	if (
		/^(?:прейскурант|прайс|каталог|утверждаю|главный\s*врач|лицензия|ооо|зао|ип)(?:\s|$|:)/i.test(
			line,
		)
	) {
		return true;
	}
	if (/(?:202\d|199\d)\s*(?:г|года|г\.)(?:\s|$|[.,;])/i.test(line)) {
		return true;
	}
	if (
		/^(?:наименование|услуга|цена|стоимость|код|№|разделы?|раздел|стр\.?|-+|=+|\*+)$/i.test(
			line,
		)
	) {
		return true;
	}
	return false;
}

export function extractCodeFromLine(line: string): string | null {
	const codeMatch = line.match(
		/\b([AB]\d{2}\.\d{2}\.\d{3}(?:\.\d{3})?|[AB]\d{2}\.\d{3}(?:\.\d{3})?)\b/i,
	);
	return codeMatch?.[1] ? codeMatch[1].toUpperCase() : null;
}

export function extractPriceFromLine(line: string): { priceRub: number; lineWithoutPrice: string } {
	let priceRub = 0;
	let lineWithoutPrice = line;

	const priceRegexEnd =
		/(?:[-:=–—\t]|\s+)(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(?:руб|р|₽|rub)?\.?\s*$/i;
	const priceRegexMid = /\b(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(?:руб|р|₽)\b/i;

	const endMatch = line.match(priceRegexEnd);
	if (endMatch?.[1]) {
		const cleanDigits = endMatch[1].replace(/\s+/g, "").replace(",", ".");
		const parsed = parseFloat(cleanDigits);
		if (Number.isFinite(parsed) && parsed > 0 && parsed <= 5000000) {
			priceRub = Math.round(parsed);
			lineWithoutPrice = line.slice(0, endMatch.index).trim();
			return { priceRub, lineWithoutPrice };
		}
	}

	const midMatch = line.match(priceRegexMid);
	if (midMatch?.[1]) {
		const cleanDigits = midMatch[1].replace(/\s+/g, "").replace(",", ".");
		const parsed = parseFloat(cleanDigits);
		if (Number.isFinite(parsed) && parsed > 0 && parsed <= 5000000) {
			priceRub = Math.round(parsed);
			lineWithoutPrice = line.replace(midMatch[0], " ").trim();
			return { priceRub, lineWithoutPrice };
		}
	}

	const fallbackNumMatch = line.match(/\s+(\d{2,7})\s*$/);
	if (fallbackNumMatch?.[1]) {
		const parsed = parseInt(fallbackNumMatch[1], 10);
		if (parsed >= 50 && parsed <= 5000000) {
			priceRub = parsed;
			lineWithoutPrice = line.slice(0, fallbackNumMatch.index).trim();
		}
	}

	return { priceRub, lineWithoutPrice };
}

export function cleanCommercialTitle(lineWithoutPrice: string, detectedCode: string | null): string {
	let title = lineWithoutPrice;
	if (detectedCode) {
		title = title.replace(
			new RegExp(`\\b${detectedCode.replace(".", "\\.")}\\b`, "i"),
			" ",
		);
	}
	return title
		.replace(/^[\d.)\-–—\s]+/, "")
		.replace(/[-–—:=]+$/, "")
		.trim();
}
