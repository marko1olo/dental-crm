/**
 * DENTE CRM — Hardware Printing Types & Options
 *
 * Semantic options for A4 documents (Medical record, Consents, Acts),
 * thermal cash receipts (58mm/80mm), and sterilization barcode labels.
 */

export interface A4PrintOptions {
	title?: string | undefined;
	onBeforePrint?: (() => void) | undefined;
	onAfterPrint?: (() => void) | undefined;
	cleanupDelayMs?: number | undefined;
	silent?: boolean | undefined;
	printerName?: string | undefined;
}

export interface UniversalThermalReceiptOptions {
	paperWidthMm?: 58 | 80;
	silent?: boolean;
	printerName?: string;
	copies?: number;
	/** Direct hardware connection type for KKT / thermal printer */
	connection?: "lan" | "usb" | "com" | "os_queue" | "auto";
	/** Fiscal printer protocol */
	protocol?: "atol" | "shtrih" | "escpos" | "os_printer";
	/** IP address or hostname for direct LAN socket printing (e.g. 192.168.1.150 or 127.0.0.1) */
	kktHost?: string;
	/** Port for LAN socket (Atol default 16732 or 5555, Shtrikh default 5555, ESC/POS raw 9100) */
	kktPort?: number;
	/** Raw ESC/POS text or base64 binary buffer */
	rawEscPos?: string;
	/** Cut paper after receipt print (default: true) */
	cutPaper?: boolean;
}

export interface UniversalLabelOptions {
	format?: "html" | "tspl" | "zpl" | "escpos";
	widthMm?: number;
	heightMm?: number;
	silent?: boolean;
	printerName?: string;
	copies?: number;
	/** Direct IP for raw socket label printing (default ESC/POS / TSPL port 9100) */
	kktHost?: string;
	kktPort?: number;
	rawPayload?: string;
}

/** Backward compatibility alias */
export type UniversalSanpinLabelOptions = UniversalLabelOptions;

export interface UniversalPrintResult {
	success: boolean;
	method: "desktop_silent" | "mobile_native" | "browser_dialog" | "iframe_silent" | "download";
	error?: string;
	fiscalSign?: string;
	fiscalDocNum?: string;
	kktSerialNumber?: string;
}
