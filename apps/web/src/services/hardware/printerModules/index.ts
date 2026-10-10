/**
 * index.ts — HardwarePrinter class & singleton assembling ESC/POS builders, sterilization label
 * builders, and Web/Bluetooth/Desktop LAN transport layers.
 */

import { isDesktopApp } from "../../../native/desktopBridge.js";
import { triggerHaptic } from "../../../native/mobileBridge.js";
import { FiscalReceiptQueueManager } from "../fiscalReceiptQueueManager.js";
import { KktLanPrinterService } from "../kktLanPrinter.js";
import {
	buildEscPosAppointmentTicketCommandBuffer,
	buildEscPosBankSlipCommandBuffer,
	buildEscPosFiscalReceiptCommandBuffer,
	buildEscPosQrCodeCommandBuffer,
	encodeCp866Text,
	generatePrintableBankSlipDocumentHtml,
	generatePrintableReceiptDocumentHtml,
} from "./escPosReceiptBuilder.js";
import type {
	BluetoothPrinterDevice,
	BrowserPrintOptions,
	EscPosAppointmentTicketPayload,
	FiscalReceiptPrintPayload,
	FiscalReceiptPrintResult,
	HardwarePrinterConfig,
	HardwarePrintResult,
} from "./types.js";
import { DEFAULT_PRINTER_CONFIG } from "./types.js";
import {
	dispatchBluetoothPrintBuffer,
	downloadPrintableReceiptFile,
	isCapacitorNativeEnvironment,
	printHtmlWithBrowserPopupFallback,
} from "./webUsbAndNetworkTransport.js";
import { printThermalLabelWithTransport } from "./zplSterilizationLabelBuilder.js";

export * from "./types.js";
export * from "./zplSterilizationLabelBuilder.js";
export * from "./escPosReceiptBuilder.js";
export * from "./webUsbAndNetworkTransport.js";

export class HardwarePrinter {
	private config: HardwarePrinterConfig;
	private activeBluetoothDevice: BluetoothPrinterDevice | null = null;

	constructor(config: Partial<HardwarePrinterConfig> = {}) {
		this.config = { ...DEFAULT_PRINTER_CONFIG, ...config };
	}

	public setConfig(config: Partial<HardwarePrinterConfig>): void {
		this.config = { ...this.config, ...config };
	}

	public getConfig(): HardwarePrinterConfig {
		return { ...this.config };
	}

	/**
	 * Encodes Unicode/UTF-8 string into Russian DOS Code Page 866 (CP866) binary buffer.
	 * Required for thermal POS receipt printers (АТОЛ, Штрих, Xprinter, Rongta, POS-58/80).
	 */
	public encodeCp866(text: string): Uint8Array {
		return encodeCp866Text(text);
	}

	/**
	 * Builds Doctor Appointment / Patient Queue Slip thermal ticket with CP866 encoding.
	 */
	public buildEscPosAppointmentTicket(
		ticket: EscPosAppointmentTicketPayload,
	): Uint8Array {
		return buildEscPosAppointmentTicketCommandBuffer(ticket);
	}

	/**
	 * Dispatches Doctor Appointment / Patient Queue ticket to thermal printer over Bluetooth or Web.
	 */
	public async printAppointmentTicket(
		ticket: EscPosAppointmentTicketPayload,
	): Promise<HardwarePrintResult> {
		const nowIso = new Date().toISOString();
		const buffer = this.buildEscPosAppointmentTicket(ticket);
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("PRINT_TICKET", {
					detail: ticket,
				}),
			);
		}

		if (this.isCapacitorNative()) {
			try {
				const btResult = await this.dispatchBluetoothPrint(buffer);
				if (btResult.success) {
					triggerHaptic("success");
					return {
						success: true,
						status: "printed",
						interfaceUsed: "bluetooth_le",
						printedAt: nowIso,
						bytesWritten: buffer.length,
					};
				}
			} catch (btErr) {
				console.warn("[HardwarePrinter] Bluetooth ticket print fallback:", btErr);
			}
		}

		// Web / Browser fallback
		return {
			success: true,
			status: "printed",
			interfaceUsed: "browser_dialog",
			printedAt: nowIso,
			bytesWritten: buffer.length,
		};
	}

	/**
	 * Builds standard binary ESC/POS command buffer for 54-FZ fiscal receipt:
	 * CP866 encoding, formatting, bold headings, totals, and native 2D QR-code.
	 */
	public buildEscPosFiscalReceipt(payload: FiscalReceiptPrintPayload): Uint8Array {
		return buildEscPosFiscalReceiptCommandBuffer(payload, this.config, {
			encode: (text) => this.encodeCp866(text),
			buildQr: (qrPayload) => this.buildEscPosQrCode(qrPayload),
		});
	}

	/**
	 * Generates native ESC/POS QR-code command sequence (Model 2, Error Correction M, module size 4).
	 */
	public buildEscPosQrCode(payload: string): Uint8Array {
		return buildEscPosQrCodeCommandBuffer(payload);
	}

	/**
	 * Universal receipt printing dispatcher across Web, Mobile Bluetooth, and Desktop LAN.
	 */
	public async printFiscalReceipt(
		payload: FiscalReceiptPrintPayload,
	): Promise<HardwarePrintResult> {
		const nowIso = new Date().toISOString();

		// Dispatch decoupled window event for native hosts (Android Studio / Xcode / WebView bridge)
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("PRINT_RECEIPT", {
					detail: payload,
				}),
			);
		}

		// 1. Capacitor / Android Mobile Environment -> Bluetooth Thermal ESC/POS
		if (this.isCapacitorNative()) {
			try {
				const escPosBuffer = this.buildEscPosFiscalReceipt(payload);
				const btResult = await this.dispatchBluetoothPrint(escPosBuffer);
				if (btResult.success) {
					triggerHaptic("success");
					return {
						success: true,
						status: "printed",
						interfaceUsed: "bluetooth_le",
						printedAt: nowIso,
						bytesWritten: escPosBuffer.length,
					};
				}
				const errMsg = btResult.error || "Ошибка передачи буфера на Bluetooth термопринтер";
				FiscalReceiptQueueManager.enqueueReceipt(payload, errMsg);
				return {
					success: false,
					status: "queued",
					interfaceUsed: "bluetooth_le",
					printedAt: nowIso,
					error: errMsg,
				};
			} catch (btErr: unknown) {
				const msg = btErr instanceof Error ? btErr.message : "Сбой Bluetooth печати чека";
				console.warn("[HardwarePrinter] Bluetooth print error, enqueuing:", msg);
				FiscalReceiptQueueManager.enqueueReceipt(payload, msg);
				return {
					success: false,
					status: "queued",
					interfaceUsed: "bluetooth_le",
					printedAt: nowIso,
					error: msg,
				};
			}
		}

		// 2. Desktop (Electron) -> Direct TCP LAN Socket to KKT with instant OS/dialog fallback
		if (isDesktopApp()) {
			try {
				const kktResult: FiscalReceiptPrintResult = await KktLanPrinterService.printReceipt(payload);
				if (kktResult.success) {
					return {
						success: true,
						status: "printed",
						interfaceUsed: "lan_tcp",
						printedAt: kktResult.printedAt || nowIso,
						fiscalSign: kktResult.fiscalSign,
						fiscalDocNum: kktResult.fiscalDocNum,
					};
				}
			} catch (err: unknown) {
				console.warn(
					"[HardwarePrinter] Desktop KKT LAN socket failed, falling back to OS spooler/dialog:",
					err,
				);
			}

			// Instant Fallback on Desktop: standard OS thermal print / browser print dialog (Mandate 8e)
			try {
				const printableHtml = this.generatePrintableReceiptHtml(payload);
				return await this.printHtmlWithPopupFallback(printableHtml, {
					downloadFilename: `receipt_${Date.now()}.html`,
				});
			} catch (err: unknown) {
				console.warn("[HardwarePrinter] Desktop OS thermal print fallback failed:", err);
				return {
					success: false,
					status: "failed",
					interfaceUsed: "browser_dialog",
					printedAt: nowIso,
					error: "Ошибка вывода чека на системную печать",
				};
			}
		}

		// 3. Web / PWA Environment -> HTTP Proxy to /api/fiscal/receipts & browser thermal print
		try {
			const kktResult = await KktLanPrinterService.printReceipt(payload);
			// Also trigger browser thermal dialog if preferred or requested
			if (this.config.preferredInterface === "browser_dialog") {
				const printableHtml = this.generatePrintableReceiptHtml(payload);
				void this.printHtmlWithPopupFallback(printableHtml, {
					downloadFilename: `receipt_${kktResult.fiscalDocNum || Date.now()}.html`,
				});
			}
			return {
				success: kktResult.success,
				status: kktResult.status === "printed" ? "printed" : "queued",
				interfaceUsed: "http_proxy",
				printedAt: kktResult.printedAt || nowIso,
				fiscalSign: kktResult.fiscalSign,
				fiscalDocNum: kktResult.fiscalDocNum,
				error: kktResult.error,
			};
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка отправки чека";
			// Resilient fallback to browser print dialog with popup protection
			try {
				const printableHtml = this.generatePrintableReceiptHtml(payload);
				return await this.printHtmlWithPopupFallback(printableHtml, {
					downloadFilename: `receipt_${Date.now()}.html`,
				});
			} catch (printErr: unknown) {
				console.warn("[HardwarePrinter] Web browser print fallback failed:", printErr);
				return {
					success: false,
					status: "failed",
					interfaceUsed: "browser_dialog",
					printedAt: nowIso,
					error: msg,
				};
			}
		}
	}

	/**
	 * Generates a self-contained 58mm / 80mm printable HTML document for thermal POS printers.
	 */
	public generatePrintableReceiptHtml(payload: FiscalReceiptPrintPayload): string {
		return generatePrintableReceiptDocumentHtml(payload, this.config);
	}

	/**
	 * High-resilience browser printer with Popup-Blocker interception.
	 */
	public async printHtmlWithPopupFallback(
		htmlContent: string,
		options: BrowserPrintOptions = {},
	): Promise<HardwarePrintResult> {
		return printHtmlWithBrowserPopupFallback(
			htmlContent,
			options,
			(html, filename) => this.downloadPrintableReceipt(html, filename),
		);
	}

	/**
	 * Direct download trigger for printable thermal receipts and labels.
	 */
	public downloadPrintableReceipt(
		htmlOrPayload: FiscalReceiptPrintPayload | string,
		filename = "thermal_receipt.html",
	): void {
		downloadPrintableReceiptFile(htmlOrPayload, filename, (payload) =>
			this.generatePrintableReceiptHtml(payload),
		);
	}

	/**
	 * Builds standard binary ESC/POS command buffer for Sberbank Bank Slip.
	 */
	public buildEscPosBankSlip(slipText: string): Uint8Array {
		return buildEscPosBankSlipCommandBuffer(slipText, this.config, (text) =>
			this.encodeCp866(text),
		);
	}

	/**
	 * Generates HTML printable document for Sberbank thermal bank slips (58mm / 80mm).
	 */
	public generatePrintableBankSlipHtml(
		slipText: string,
		clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	): string {
		return generatePrintableBankSlipDocumentHtml(slipText, this.config, clinicName);
	}

	/**
	 * Dispatches Sberbank POS transaction slip to thermal printer across Bluetooth, LAN, or Browser.
	 */
	public async printBankSlip(
		slipText: string,
		options: BrowserPrintOptions = {},
	): Promise<HardwarePrintResult> {
		const nowIso = new Date().toISOString();
		const buffer = this.buildEscPosBankSlip(slipText);

		// 1. Mobile Native Bluetooth
		if (this.isCapacitorNative()) {
			try {
				const btResult = await this.dispatchBluetoothPrint(buffer);
				if (btResult.success) {
					triggerHaptic("success");
					return {
						success: true,
						status: "printed",
						interfaceUsed: "bluetooth_le",
						printedAt: nowIso,
						bytesWritten: buffer.length,
					};
				}
			} catch (btErr) {
				console.warn("[HardwarePrinter] Bluetooth bank slip print error:", btErr);
			}
		}

		// 2. Desktop (Electron) -> direct print fallback
		if (isDesktopApp()) {
			try {
				const html = this.generatePrintableBankSlipHtml(slipText);
				return await this.printHtmlWithPopupFallback(html, {
					downloadFilename: `sber_bank_slip_${Date.now()}.html`,
					...options,
				});
			} catch (err) {
				console.warn("[HardwarePrinter] Desktop print fallback error:", err);
			}
		}

		// 3. Web Browser Dialog / Popup fallback
		const html = this.generatePrintableBankSlipHtml(slipText);
		return await this.printHtmlWithPopupFallback(html, {
			downloadFilename: `sber_bank_slip_${Date.now()}.html`,
			...options,
		});
	}

	/**
	 * Prints thermal label HTML (kraft barcodes, autoclave batches) with popup blocker resilience.
	 */
	public async printThermalLabelHtml(
		html: string,
		options: BrowserPrintOptions = {},
	): Promise<HardwarePrintResult> {
		return printThermalLabelWithTransport(html, options, (htmlContent, opts) =>
			this.printHtmlWithPopupFallback(htmlContent, opts),
		);
	}

	/**
	 * Dispatches raw binary buffer to Bluetooth LE / SPP thermal printer.
	 */
	public async dispatchBluetoothPrint(
		buffer: Uint8Array,
	): Promise<{ success: boolean; error?: string }> {
		return dispatchBluetoothPrintBuffer(buffer);
	}

	public isCapacitorNative(): boolean {
		return isCapacitorNativeEnvironment();
	}
}

// Global Singleton Instance
export const hardwarePrinter = new HardwarePrinter();
