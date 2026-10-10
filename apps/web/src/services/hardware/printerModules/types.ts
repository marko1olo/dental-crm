/**
 * types.ts — Hardware Printer configuration, browser print options, and protocol types.
 */

import type {
	BluetoothPrinterDevice,
	EscPosAppointmentTicketPayload,
	HardwarePrinterConfig,
	HardwarePrintResult,
	PrinterInterface,
} from "@dental/shared";
import type {
	FiscalReceiptLineItem,
	FiscalReceiptPrintPayload,
	FiscalReceiptPrintResult,
} from "../hardwareTypes.js";

export type {
	BluetoothPrinterDevice,
	EscPosAppointmentTicketPayload,
	FiscalReceiptLineItem,
	FiscalReceiptPrintPayload,
	FiscalReceiptPrintResult,
	HardwarePrinterConfig,
	HardwarePrintResult,
	PrinterInterface,
};

export interface BrowserPrintOptions {
	title?: string;
	fallbackMode?: "iframe" | "download" | "both";
	downloadFilename?: string;
	jobName?: string;
	onSuccess?: () => void;
	onPopupBlocked?: () => void;
	onFallbackExecuted?: (fallbackType: "iframe" | "download") => void;
}

export interface BluetoothDispatchResult {
	success: boolean;
	error?: string;
}

export const DEFAULT_PRINTER_CONFIG: HardwarePrinterConfig = {
	preferredInterface: "browser_dialog",
	paperWidthMm: 58,
	characterEncoding: "CP866",
	autoCut: true,
	printCopies: 1,
};
