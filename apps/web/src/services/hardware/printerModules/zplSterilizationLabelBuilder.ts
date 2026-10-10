/**
 * zplSterilizationLabelBuilder.ts — Thermal sterilization & kraft barcode label printing helpers.
 */

import type { BrowserPrintOptions, HardwarePrintResult } from "./types.js";

export const DEFAULT_THERMAL_LABEL_FILENAME = "kraft_label.html";

/**
 * Prepares normalized browser print options for thermal sterilization / kraft barcode labels.
 */
export function prepareThermalLabelPrintOptions(
	options: BrowserPrintOptions = {},
): BrowserPrintOptions {
	return {
		downloadFilename: DEFAULT_THERMAL_LABEL_FILENAME,
		...options,
	};
}

/**
 * Dispatches thermal label HTML (kraft barcodes, autoclave batches) through the browser print transport
 * with popup-blocker resilience.
 */
export async function printThermalLabelWithTransport(
	html: string,
	options: BrowserPrintOptions = {},
	transportPrintFn: (
		htmlContent: string,
		opts?: BrowserPrintOptions,
	) => Promise<HardwarePrintResult>,
): Promise<HardwarePrintResult> {
	return transportPrintFn(html, prepareThermalLabelPrintOptions(options));
}
