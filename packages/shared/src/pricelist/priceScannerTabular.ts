import type { ServiceCatalogItem } from "../index.js";
import {
	autoMapColumns,
	type ColumnMappingConfig,
	detectVendorSignature,
	findHeaderRowIndex,
	PRICELIST_VENDOR_LABELS,
} from "../clinical/pricelistBatchImport.js";
import type {
	ScannedInputFormat,
	ScannedPriceItem,
	ScannedPricelistResult,
	ScannedPricelistValidationError,
} from "./priceScannerTypes.js";
import { parseTabularRow } from "./priceScannerTabularRow.js";

export function scanTabularMatrix(
	matrix: string[][],
	formatDetected: ScannedInputFormat,
	existingCatalog: readonly ServiceCatalogItem[],
	customMapping?: Partial<ColumnMappingConfig> | undefined,
): ScannedPricelistResult {
	const headerRowIndex = findHeaderRowIndex(matrix);
	const headers = (matrix[headerRowIndex] || []).map((h) => (h || "").trim());
	const vendorSignature = detectVendorSignature(headers);
	const vendorLabel = PRICELIST_VENDOR_LABELS[vendorSignature];
	const autoMapping = autoMapColumns(headers);
	const effectiveMapping: ColumnMappingConfig = {
		...autoMapping,
		...customMapping,
		titleCol: customMapping?.titleCol ?? autoMapping.titleCol,
		priceCol: customMapping?.priceCol ?? autoMapping.priceCol,
	};

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
	const startDataIndex = headerRowIndex + 1;

	for (let r = startDataIndex; r < matrix.length; r++) {
		const rawRow = matrix[r] || [];
		const rowNumber = r + 1;
		const parsed = parseTabularRow({ rawRow, rowNumber, effectiveMapping, existingCatalog });
		if (!parsed) continue;

		if (parsed.error) {
			errors.push({ rowNumber, field: parsed.error.field, message: parsed.error.message, rawInput: parsed.error.rawInput });
		}
		if (parsed.item) {
			items.push(parsed.item);
			if (parsed.item.validationStatus === "valid") priceSuccessCount++;
		}
		if (parsed.isNew) newCount++;
		if (parsed.isUpdate) updateCount++;
		if (parsed.isIdentical) identicalCount++;
		if (parsed.isExactCode) exactCodesCount++;
		if (parsed.isCategoryRecognized) categorySuccessCount++;
		totalConfidence += parsed.confidence;
	}

	const recognizedCount = items.length;
	const validCount = items.filter((i) => i.validationStatus === "valid").length;
	const errorCount = items.filter((i) => i.validationStatus === "error").length;

	return {
		success: items.length > 0 && validCount > 0,
		items,
		summary: {
			formatDetected,
			vendorSignature,
			vendorLabel,
			detectedMapping: effectiveMapping,
			totalLinesOrRows: matrix.length - startDataIndex,
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
