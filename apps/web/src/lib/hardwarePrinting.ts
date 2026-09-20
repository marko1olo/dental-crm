/**
 * DENTE CRM — Universal Hardware Printing Orchestrator
 *
 * Unified printing pipeline for all target environments:
 * 1) A4 Regulatory Documents (Form 043/u, Contracts, Consents, Treatment Acts, Lab Orders)
 * 2) Thermal Receipt Tapes (54-FZ FFD 1.2 fiscal receipts, 58mm / 80mm)
 * 3) Thermal Sterilization Stickers (SanPiN 3.3686-21 kraft barcodes, 58x40mm / 43x25mm)
 *
 * Automatic environment dispatch (Desktop EXE -> silent native; Android APK -> BT; Web/PWA -> print layer/popup).
 */

import {
	printDesktopAtol10FiscalReceipt,
	printDesktopEscPosReceipt,
	printDesktopFiscalReceiptTcp,
	printDesktopShtrihMFiscalReceipt,
	printDesktopThermalLabel,
	type DesktopEscPosPrintResult,
	type DesktopFiscalPrintResult,
	type DesktopFiscalReceiptPayload,
	type DesktopThermalPrintResult,
} from "../native/desktopBridge";
import {
	dispatchEscPosReceiptPrint,
	dispatchThermalLabelPrint,
} from "../native/hardwareDispatcher";
import type { HardwarePrintResult } from "@dental/shared";
import type { FiscalReceiptPrintPayload } from "../services/hardware/hardwareTypes";
import {
	hardwarePrinter,
	type BrowserPrintOptions,
} from "../services/hardware/HardwarePrinter";
import { isDesktopExecutable, isAndroidNativeApp } from "./omniPlatformAdapter";

export interface A4PrintOptions {
	title?: string;
	onBeforePrint?: () => void;
	onAfterPrint?: () => void;
	cleanupDelayMs?: number;
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

export interface UniversalSanpinLabelOptions {
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

export interface UniversalPrintResult {
	success: boolean;
	method: "desktop_silent" | "mobile_native" | "browser_dialog" | "iframe_silent" | "download";
	error?: string;
	fiscalSign?: string;
	fiscalDocNum?: string;
	kktSerialNumber?: string;
}

/**
 * Triggers standard A4 document print with isolated .print-layer DOM containment.
 */
export async function printA4Document(
	contentElementOrHtml: HTMLElement | string,
	options: A4PrintOptions = {},
): Promise<UniversalPrintResult> {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return { success: false, method: "browser_dialog", error: "Печать недоступна вне браузера" };
	}

	try {
		options.onBeforePrint?.();

		// If HTML string is passed, create a temporary isolated print layer
		if (typeof contentElementOrHtml === "string") {
			const existingLayer = document.getElementById("dente-dynamic-print-layer");
			if (existingLayer) {
				existingLayer.remove();
			}

			const printLayer = document.createElement("div");
			printLayer.id = "dente-dynamic-print-layer";
			printLayer.className = "print-layer";
			printLayer.innerHTML = contentElementOrHtml;
			document.body.appendChild(printLayer);

			// Trigger native browser print
			window.focus();
			window.print();

			// Clean up after print
			setTimeout(() => {
				printLayer.remove();
				options.onAfterPrint?.();
			}, options.cleanupDelayMs ?? 1000);

			return { success: true, method: "browser_dialog" };
		}

		// If element is already in DOM, ensure it has print-layer class
		const wasPrintLayer = contentElementOrHtml.classList.contains("print-layer");
		if (!wasPrintLayer) {
			contentElementOrHtml.classList.add("print-layer");
		}

		window.focus();
		window.print();

		if (!wasPrintLayer) {
			setTimeout(() => {
				contentElementOrHtml.classList.remove("print-layer");
				options.onAfterPrint?.();
			}, options.cleanupDelayMs ?? 500);
		} else {
			options.onAfterPrint?.();
		}

		return { success: true, method: "browser_dialog" };
	} catch (err) {
		const message = err instanceof Error ? err.message : "Ошибка вывода на печать";
		return { success: false, method: "browser_dialog", error: message };
	}
}

/**
 * Converts FiscalReceiptPrintPayload to DesktopFiscalReceiptPayload format.
 */
function toDesktopFiscalPayload(payload: FiscalReceiptPrintPayload): DesktopFiscalReceiptPayload {
	return {
		cashierName: payload.cashierFullName || "Администратор",
		items: (payload.items || []).map((item) => ({
			name: item.name,
			priceRub: item.priceRub,
			quantity: item.quantity,
			vatPercent: item.vatRate === "vat_20" ? 20 : item.vatRate === "vat_10" ? 10 : 0,
		})),
		totalRub: payload.totalRub,
		paymentType:
			payload.operationType === "income"
				? "card"
				: payload.operationType === "income_return"
					? "cash"
					: "card",
		patientEmailOrPhone: payload.customerContact,
	};
}

/**
 * Universal 54-FZ fiscal receipt printing (58mm or 80mm).
 * Supports direct COM/USB/LAN communication on Desktop EXE (ATOL, Shtrikh-M, ESC/POS)
 * and seamless fallback on Android APK and Web/PWA without popup blocker traps.
 */
export async function printThermalReceipt(
	payload: FiscalReceiptPrintPayload,
	options: UniversalThermalReceiptOptions = {},
): Promise<UniversalPrintResult> {
	const paperWidth = options.paperWidthMm ?? 58;

	// 1. Desktop EXE: direct silent hardware communication
	if (isDesktopExecutable()) {
		// 1A. Direct KKT via LAN / TCP (ATOL 10 / Shtrikh-M)
		if (options.protocol === "atol" || (options.kktHost && options.kktPort === 16732)) {
			try {
				const desktopPayload = toDesktopFiscalPayload(payload);
				const res: DesktopFiscalPrintResult = await printDesktopAtol10FiscalReceipt({
					host: options.kktHost || "127.0.0.1",
					port: options.kktPort || 16732,
					payload: desktopPayload,
				});
				if (res.success) {
					return {
						success: true,
						method: "desktop_silent",
						...(res.fiscalSign ? { fiscalSign: res.fiscalSign } : {}),
						...(res.fiscalDocNum ? { fiscalDocNum: res.fiscalDocNum } : {}),
						...(res.kktSerialNumber ? { kktSerialNumber: res.kktSerialNumber } : {}),
					};
				}
			} catch {
				// Fall through to other desktop methods
			}
		} else if (options.protocol === "shtrih" || (options.kktHost && options.kktPort === 5555)) {
			try {
				const desktopPayload = toDesktopFiscalPayload(payload);
				const res: DesktopFiscalPrintResult = await printDesktopShtrihMFiscalReceipt({
					host: options.kktHost || "127.0.0.1",
					port: options.kktPort || 5555,
					payload: desktopPayload,
				});
				if (res.success) {
					return {
						success: true,
						method: "desktop_silent",
						...(res.fiscalSign ? { fiscalSign: res.fiscalSign } : {}),
						...(res.fiscalDocNum ? { fiscalDocNum: res.fiscalDocNum } : {}),
						...(res.kktSerialNumber ? { kktSerialNumber: res.kktSerialNumber } : {}),
					};
				}
			} catch {
				// Fall through
			}
		}

		// 1B. Direct ESC/POS printing over LAN (socket 9100) or OS queue without Windows print dialog
		if (options.protocol === "escpos" || options.rawEscPos || options.kktHost) {
			try {
				const res: DesktopEscPosPrintResult = await printDesktopEscPosReceipt({
					host: options.kktHost || "127.0.0.1",
					port: options.kktPort || 9100,
					printerName: options.printerName,
					rawEscPosBase64: options.rawEscPos ? (typeof btoa === "function" ? btoa(options.rawEscPos) : undefined) : undefined,
					text: options.rawEscPos,
					silent: options.silent !== false,
					widthMm: paperWidth,
					cutPaper: options.cutPaper !== false,
					copies: options.copies ?? 1,
				});
				if (res.success) {
					return { success: true, method: "desktop_silent" };
				}
			} catch {
				// Fall through to label printing
			}
		}

		// 1C. Standard OS thermal printer queue (silent direct print)
		try {
			const html = hardwarePrinter.generatePrintableReceiptHtml({
				...payload,
			});

			const res: DesktopThermalPrintResult = await printDesktopThermalLabel({
				html,
				widthMm: paperWidth,
				silent: options.silent !== false,
				printerName: options.printerName,
				copies: options.copies ?? 1,
			});

			if (res.success) {
				return { success: true, method: "desktop_silent" };
			}
		} catch {
			// Fallback to dispatcher
		}
	}

	// 2. Android APK / Mobile Bridge
	if (isAndroidNativeApp()) {
		try {
			const res = await hardwarePrinter.printFiscalReceipt(payload);
			if (res.success) {
				return { success: true, method: "mobile_native" };
			}
		} catch {
			// Fallback to web
		}
	}

	// 3. Web Browser / PWA fallback with popup blocker resilience
	try {
		const html = hardwarePrinter.generatePrintableReceiptHtml(payload);
		const res: HardwarePrintResult = await hardwarePrinter.printHtmlWithPopupFallback(html, {
			downloadFilename: `fiscal_receipt_${Date.now()}.html`,
		});

		return {
			success: res.success,
			method: res.interfaceUsed === "browser_dialog" ? "browser_dialog" : "iframe_silent",
			...(res.error !== undefined ? { error: res.error } : {}),
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Ошибка печати чека";
		return { success: false, method: "browser_dialog", error: message };
	}
}

/**
 * Direct COM/USB/LAN Fiscal Register printer invoker (54-FZ ATOL / Shtrikh-M / ESC/POS).
 */
export async function printDirectFiscalReceipt(
	payload: FiscalReceiptPrintPayload,
	options: {
		host?: string;
		port?: number;
		protocol?: "atol" | "shtrih" | "escpos";
		silent?: boolean;
	} = {},
): Promise<UniversalPrintResult> {
	return printThermalReceipt(payload, {
		...(options.host ? { kktHost: options.host } : {}),
		...(options.port ? { kktPort: options.port } : {}),
		protocol: options.protocol ?? "atol",
		...(options.silent !== undefined ? { silent: options.silent } : {}),
		connection: options.host ? "lan" : "auto",
	});
}

/**
 * Universal SanPiN sterilization label printing (58x40mm or 43x25mm).
 */
export async function printSanpinLabel(
	labelHtml: string,
	options: UniversalSanpinLabelOptions = {},
): Promise<UniversalPrintResult> {
	const widthMm = options.widthMm ?? 58;
	const heightMm = options.heightMm ?? 40;

	// 1. Desktop EXE (Silent native printing, zero Windows print dialogs)
	if (isDesktopExecutable()) {
		// 1A. Direct raw socket printing (e.g. TSPL / ESC/POS barcode printer on port 9100)
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
				if (res.success) {
					return { success: true, method: "desktop_silent" };
				}
			} catch {
				// Fall through to OS thermal label driver
			}
		}

		// 1B. Direct thermal label dispatch via native driver
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

	// 2. Web / PWA
	const res = await hardwarePrinter.printHtmlWithPopupFallback(labelHtml, {
		downloadFilename: `sanpin_label_${Date.now()}.html`,
	});

	return {
		success: res.success,
		method: res.interfaceUsed === "browser_dialog" ? "browser_dialog" : "iframe_silent",
		...(res.error !== undefined ? { error: res.error } : {}),
	};
}

/**
 * Direct ESC/POS thermal printing to TCP socket (default port 9100) or OS print queue.
 * Strictly suppresses Windows print dialogs in Desktop EXE mode (Mandates 8c, 8e, 8n).
 * Falls back gracefully to browser print with popup blocker protection on Web/PWA.
 */
export async function printDirectEscPosSocket(
	textOrRawPayload: string,
	options: {
		host?: string;
		port?: number;
		printerName?: string;
		isBase64?: boolean;
		widthMm?: 58 | 80;
		cutPaper?: boolean;
		copies?: number;
		silent?: boolean;
	} = {},
): Promise<UniversalPrintResult> {
	const widthMm = options.widthMm ?? 80;

	// 1. Desktop EXE: direct socket communication on port 9100 without Windows dialog
	if (isDesktopExecutable()) {
		try {
			const res = await printDesktopEscPosReceipt({
				host: options.host || "127.0.0.1",
				port: options.port || 9100,
				printerName: options.printerName,
				rawEscPosBase64: options.isBase64
					? textOrRawPayload
					: typeof btoa === "function"
						? btoa(textOrRawPayload)
						: undefined,
				text: options.isBase64 ? undefined : textOrRawPayload,
				silent: options.silent !== false,
				widthMm,
				cutPaper: options.cutPaper !== false,
				copies: options.copies ?? 1,
			});
			if (res.success) {
				return { success: true, method: "desktop_silent" };
			}
			// If TCP 9100 fails, proceed to instant OS thermal printer spooler fallback
		} catch {
			// Fall through to OS thermal spooler fallback
		}

		// Instant Fallback on Desktop EXE: standard OS thermal spooler queue without blocking (Mandate 8e)
		try {
			const { printDesktopThermalLabel } = await import("../native/desktopBridge.js");
			const html = `<pre style="font-family:monospace;font-size:12px;white-space:pre-wrap;margin:0;padding:8px;">${textOrRawPayload}</pre>`;
			const fallbackRes = await printDesktopThermalLabel({
				html,
				printerName: options.printerName,
				widthMm,
				silent: options.silent !== false,
				copies: options.copies ?? 1,
			});
			if (fallbackRes.success) {
				return { success: true, method: "desktop_silent" };
			}
		} catch {
			// Fall through to mobile/web print
		}
	}

	// 2. Android APK Native Bridge
	if (isAndroidNativeApp()) {
		try {
			const { dispatchEscPosReceiptPrint } = await import("../native/hardwareDispatcher.js");
			const res = await dispatchEscPosReceiptPrint({
				text: textOrRawPayload,
				printerName: options.printerName,
				silent: options.silent !== false,
				widthMm,
				copies: options.copies ?? 1,
			});
			if (res.success) {
				return { success: true, method: "mobile_native" };
			}
		} catch {
			// Fall through to browser print
		}
	}

	// 3. Web / PWA fallback with popup blocker resilience
	try {
		const html = `<pre style="font-family:monospace;font-size:12px;white-space:pre-wrap;margin:0;padding:12px;">${textOrRawPayload}</pre>`;
		const res = await hardwarePrinter.printHtmlWithPopupFallback(html, {
			downloadFilename: `escpos_receipt_${Date.now()}.html`,
		});
		return {
			success: res.success,
			method: res.interfaceUsed === "browser_dialog" ? "browser_dialog" : "iframe_silent",
			...(res.error !== undefined ? { error: res.error } : {}),
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Ошибка печати ESC/POS чека";
		return { success: false, method: "browser_dialog", error: message };
	}
}
