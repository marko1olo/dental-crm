import type { ServiceCatalogItem } from "../index.js";
import { parseDelimitedTextToMatrix, isTabularText } from "./priceScannerMatrixParser.js";
import { scanTabularMatrix } from "./priceScannerTabular.js";
import type {
	ScannedInputFormat,
	ScannedPricelistResult,
	ScanPricelistOptions,
} from "./priceScannerTypes.js";
import { scanUnstructuredText } from "./priceScannerUnstructuredScan.js";

export * from "./priceScannerTypes.js";
export * from "./priceScannerMatrixParser.js";
export * from "./priceScannerUnstructured.js";
export * from "./priceScannerTabular.js";
export * from "./priceScannerUnstructuredScan.js";

/**
 * Universal scanner that ingests 2D Excel matrix, CSV string, or unstructured text dump,
 * normalizes prices with exact kopecks, classifies Order 804n nomenclature, and cross-references.
 */
export function scanPriceList(
	input: string | (string | number | null | undefined)[][],
	options?: ScanPricelistOptions,
): ScannedPricelistResult {
	const existingCatalog = options?.existingCatalog || [];
	const customMapping = options?.customMapping;

	let matrix: string[][] = [];
	let isTabular = false;
	let formatDetected: ScannedInputFormat = "unstructured_text";

	if (Array.isArray(input)) {
		isTabular = true;
		formatDetected = "tabular_excel";
		matrix = input.map((row) =>
			(Array.isArray(row) ? row : []).map((c) => (c === null || c === undefined ? "" : String(c).trim())),
		);
	} else if (typeof input === "string") {
		if (options?.forceFormat === "tabular_csv" || isTabularText(input)) {
			isTabular = true;
			formatDetected = "tabular_csv";
			matrix = parseDelimitedTextToMatrix(input);
		} else {
			isTabular = false;
			formatDetected = "unstructured_text";
		}
	}

	if (isTabular && matrix.length > 0) {
		return scanTabularMatrix(matrix, formatDetected, existingCatalog, customMapping);
	}

	const rawText = typeof input === "string" ? input : "";
	return scanUnstructuredText(rawText, existingCatalog);
}
