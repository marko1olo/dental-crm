import type { ServiceCatalogItem } from "../index.js";
import {
	crossReferenceTabularRow,
	STATUTORY_CATEGORY_DURATIONS_MAP,
} from "../clinical/pricelistBatchImport.js";
import { matchOrder804nNomenclature } from "./matcher804n.js";
import type {
	ScannedPriceItem,
	ScannedPricelistResult,
	ScannedPricelistValidationError,
} from "./priceScannerTypes.js";
import { extractFromUnstructuredLine } from "./priceScannerUnstructured.js";

export function scanUnstructuredText(
	rawText: string,
	existingCatalog: readonly ServiceCatalogItem[],
): ScannedPricelistResult {
	const clean = rawText
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");

	const rawLines = clean.split("\n");
	const items: ScannedPriceItem[] = [];
	const errors: ScannedPricelistValidationError[] = [];
	const warnings: string[] = [];
	let newCount = 0;
	let updateCount = 0;
	let identicalCount = 0;
	let exactCodesCount = 0;
	let totalConfidence = 0;
	let priceSuccessCount = 0;
	let categorySuccessCount = 0;

	const headerFooterRegex =
		/^(?:прейскурант|прайс[-\s]?лист|стоматологическ|ооо|зао|пао|ип\s+[а-я]|лицензи|утв\.|утвержд|генеральн|главн.*врач|страниц|стр\.\s*\d+|действует\s+с|раздел|глава)/i;

	let rowNumber = 0;
	for (const rawLine of rawLines) {
		rowNumber++;
		const trimmed = rawLine.trim();
		if (trimmed.length < 3) continue;
		if (/^[-=_*~#\s|+]{4,}$/.test(trimmed)) continue;

		const trimmedWithoutYears = trimmed.replace(/\b(?:19\d\d|20\d\d)\s*(?:г\.?|года)?\b/gi, "");
		if (headerFooterRegex.test(trimmed) && !/\d{2,}/.test(trimmedWithoutYears)) {
			continue;
		}

		const extract = extractFromUnstructuredLine(trimmed);
		if (!extract.cleanedTitle || extract.cleanedTitle.length < 2) continue;

		if (extract.priceResult.success) priceSuccessCount++;
		else errors.push({ rowNumber, field: "price", message: extract.priceResult.error || "Не удалось распознать цену", rawInput: trimmed });

		const matchResult = matchOrder804nNomenclature(trimmed, { codeHint: extract.explicitCode });
		if (matchResult.confidenceKind === "exact_code") exactCodesCount++;
		if (matchResult.category !== "other" && matchResult.category !== "documents") categorySuccessCount++;
		totalConfidence += matchResult.confidence;

		const durationMinutes = STATUTORY_CATEGORY_DURATIONS_MAP[matchResult.category] || 30;
		const crossRef = crossReferenceTabularRow(extract.explicitCode || matchResult.code804n, extract.cleanedTitle, extract.priceResult.priceKopecks, existingCatalog);

		if (crossRef.action === "create_new") newCount++;
		else if (crossRef.action === "update_existing") updateCount++;
		else if (crossRef.action === "identical") identicalCount++;

		const validationStatus = extract.priceResult.success ? "valid" : "error";
		items.push({
			id: `unstructured-line-${rowNumber}-${Date.now().toString(36)}`,
			rowNumber,
			rawInput: trimmed,
			cleanedTitle: extract.cleanedTitle,
			code: extract.explicitCode,
			code804n: matchResult.code804n,
			statutoryTitle804n: matchResult.statutoryTitle804n,
			category: matchResult.category,
			specialty: matchResult.specialty,
			priceRub: extract.priceResult.priceRub,
			priceKopecks: extract.priceResult.priceKopecks,
			durationMinutes,
			confidence: matchResult.confidence,
			confidenceKind: matchResult.confidenceKind,
			validationStatus,
			validationMessage: extract.priceResult.error,
			suggestedAction: crossRef.action,
			matchedExistingServiceId: crossRef.matchedId,
			matchedExistingTitle: crossRef.matchedTitle,
			matchedExistingPriceRub: crossRef.matchedPriceRub,
			isApproved: validationStatus === "valid",
		});
	}

	const recognizedCount = items.length;
	const validCount = items.filter((i) => i.validationStatus === "valid").length;
	const errorCount = items.filter((i) => i.validationStatus === "error").length;

	return {
		success: items.length > 0 && validCount > 0,
		items,
		summary: {
			formatDetected: "unstructured_text",
			totalLinesOrRows: rawLines.length,
			recognizedItemsCount: recognizedCount,
			validItemsCount: validCount,
			errorItemsCount: errorCount,
			exactCodesCount,
			averageConfidence: recognizedCount > 0 ? Math.round((totalConfidence / recognizedCount) * 100) / 100 : 0,
			priceAccuracyRate: recognizedCount > 0 ? Math.round((priceSuccessCount / recognizedCount) * 1000) / 10 : 0,
			categoryAccuracyRate: recognizedCount > 0 ? Math.round((categorySuccessCount / recognizedCount) * 1000) / 10 : 0,
			stats: { newCount, updateCount, identicalCount },
		},
		errors,
		warnings,
	};
}
