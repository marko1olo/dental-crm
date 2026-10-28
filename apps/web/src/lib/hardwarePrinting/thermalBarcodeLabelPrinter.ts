/**
 * DENTE CRM — Thermal Barcode & Sterilization Label Printer
 *
 * Prints sterilization package labels and barcodes (58x40mm / 43x25mm).
 * Supports direct TSPL/ZPL/ESC-POS socket printing and browser fallback.
 */

import { printDesktopEscPosReceipt } from "../../native/desktopBridge.js";
import { dispatchThermalLabelPrint } from "../../native/hardwareDispatcher.js";
import { hardwarePrinter } from "../../services/hardware/HardwarePrinter.js";
import { isDesktopExecutable } from "../omniPlatformAdapter.js";
import type { UniversalLabelOptions, UniversalPrintResult } from "./printingTypes.js";

export async function printSterilizationLabel(
	labelHtml: string,
	options: UniversalLabelOptions = {},
): Promise<UniversalPrintResult> {
	const widthMm = options.widthMm ?? 58;
	const heightMm = options.heightMm ?? 40;

	if (isDesktopExecutable()) {
		if (options.kktHost || options.format === "escpos" || options.format === "tspl") {
			try {
				const res = await printDesktopEscPosReceipt({
					host: options.kktHost || "127.0.0.1",
					port: options.kktPort || 9100,
					printerName: options.printerName,
					text: options.rawPayload || labelHtml,
					silent: options.silent !== false,
					widthMm,
					copies: options.copies ?? 1,
				});
				if (res.success) return { success: true, method: "desktop_silent" };
			} catch {}
		}

		const res = await dispatchThermalLabelPrint({
			labelHtml: options.rawPayload || labelHtml,
			widthMm,
			heightMm,
			silent: options.silent !== false,
			printerName: options.printerName,
			copies: options.copies ?? 1,
		});

		return {
			success: res.success,
			method: "desktop_silent",
			...(res.error !== undefined ? { error: res.error } : {}),
		};
	}

	const res = await hardwarePrinter.printHtmlWithPopupFallback(labelHtml, {
		downloadFilename: `sterilization_label_${Date.now()}.html`,
	});

	return {
		success: res.success,
		method: res.interfaceUsed === "browser_dialog" ? "browser_dialog" : "iframe_silent",
		...(res.error !== undefined ? { error: res.error } : {}),
	};
}

/** Backward compatibility alias */
export const printSanpinLabel = printSterilizationLabel;
