/**
 * webUsbAndNetworkTransport.ts — Bluetooth LE / SPP, Web Bluetooth, Capacitor Native,
 * and resilient Browser Popup / Hidden Iframe / Download print transport layer.
 */

import { showToast } from "../../../components/GlobalToast.js";
import {
	getMobileNativeApi,
	isMobileApp,
} from "../../../native/mobileBridge.js";
import type {
	BluetoothDispatchResult,
	BrowserPrintOptions,
	FiscalReceiptPrintPayload,
	HardwarePrintResult,
} from "./types.js";

/**
 * Checks whether the current runtime environment is a Capacitor / native mobile shell.
 */
export function isCapacitorNativeEnvironment(): boolean {
	return isMobileApp();
}

/**
 * Dispatches raw binary buffer to Bluetooth LE / SPP thermal printer via native bridge
 * or Web Bluetooth API fallback in Chromium.
 */
export async function dispatchBluetoothPrintBuffer(
	buffer: Uint8Array,
): Promise<BluetoothDispatchResult> {
	// 1. Native Mobile Bridge if present
	const nativeApi = getMobileNativeApi();
	// biome-ignore lint/suspicious/noExplicitAny: native bridge dynamic method
	if (nativeApi && typeof (nativeApi as any).printThermalBinary === "function") {
		try {
			// biome-ignore lint/suspicious/noExplicitAny: native bridge call
			const res = await (nativeApi as any).printThermalBinary(Array.from(buffer));
			return { success: Boolean(res?.success) };
		} catch (e) {
			return { success: false, error: e instanceof Error ? e.message : String(e) };
		}
	}

	// 2. Web Bluetooth API fallback in modern Chromium
	if (typeof navigator !== "undefined" && "bluetooth" in navigator) {
		try {
			// @ts-expect-error Web Bluetooth API standard interface
			const device = await navigator.bluetooth.requestDevice({
				filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }], // Standard POS service
				optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb"],
			});

			const server = await device.gatt?.connect();
			const service = await server?.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
			const characteristic = await service?.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb");

			if (characteristic) {
				// Write in 128-byte chunks
				const chunkSize = 128;
				for (let offset = 0; offset < buffer.length; offset += chunkSize) {
					const chunk = buffer.slice(offset, offset + chunkSize);
					await characteristic.writeValue(chunk);
				}
				return { success: true };
			}
		} catch (btErr: unknown) {
			return {
				success: false,
				error: btErr instanceof Error ? btErr.message : "Bluetooth disconnected",
			};
		}
	}

	return { success: false, error: "Bluetooth принтер не подключен" };
}

/**
 * Direct download trigger for printable thermal receipts and labels.
 */
export function downloadPrintableReceiptFile(
	htmlOrPayload: FiscalReceiptPrintPayload | string,
	filename = "thermal_receipt.html",
	renderReceiptHtml: (payload: FiscalReceiptPrintPayload) => string,
): void {
	if (typeof document === "undefined" || typeof URL === "undefined") return;

	const html =
		typeof htmlOrPayload === "string"
			? htmlOrPayload
			: renderReceiptHtml(htmlOrPayload);

	const blob = new Blob([html], { type: "text/html;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);

	showToast(`Чек сохранен в файл: ${filename}`, "info", 3000);
}

/**
 * High-resilience browser printer with Popup-Blocker interception:
 * 1. Tries window.open() popup print dialog.
 * 2. If blocked by browser (Safari / Chrome -> returns null), alerts user and silently falls back
 *    to a hidden background <iframe> print.
 * 3. Also supports direct download of the printable receipt/label file.
 */
export async function printHtmlWithBrowserPopupFallback(
	htmlContent: string,
	options: BrowserPrintOptions = {},
	onDownloadFallback: (html: string, filename: string) => void,
): Promise<HardwarePrintResult> {
	const nowIso = new Date().toISOString();
	const filename = options.downloadFilename || `thermal_receipt_${Date.now()}.html`;

	if (typeof window === "undefined" || typeof document === "undefined") {
		return {
			success: false,
			status: "failed",
			interfaceUsed: "browser_dialog",
			printedAt: nowIso,
			error: "Окружение браузера недоступно для печати",
		};
	}

	// 1. Attempt standard popup print window
	let printWindow: Window | null = null;
	try {
		printWindow = window.open(
			"",
			"_blank",
			"width=460,height=680,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes",
		);
	} catch (popupErr: unknown) {
		console.warn("[HardwarePrinter] window.open failed due to popup restriction:", popupErr);
		printWindow = null;
	}

	// 2. Intercept Popup Blocker
	if (!printWindow || printWindow.closed || typeof printWindow.closed === "undefined") {
		console.warn("[HardwarePrinter] Popup blocker intercepted on window.open. Triggering fallback channels.");
		options.onPopupBlocked?.();
		showToast(
			"Всплывающее окно печати заблокировано браузером (Safari / Chrome). Применяется фоновая печать.",
			"warning",
			5000,
		);

		// Fallback A: Hidden background iframe print
		try {
			options.onFallbackExecuted?.("iframe");
			const iframe = document.createElement("iframe");
			iframe.setAttribute("aria-hidden", "true");
			iframe.style.cssText =
				"position:fixed;right:100%;bottom:100%;width:0px;height:0px;border:0;opacity:0;pointer-events:none;";

			iframe.onload = () => {
				try {
					iframe.contentWindow?.focus();
					iframe.contentWindow?.print();
				} catch (framePrintErr) {
					console.warn("[HardwarePrinter] Iframe print failed, offering direct download:", framePrintErr);
					onDownloadFallback(htmlContent, filename);
					options.onFallbackExecuted?.("download");
				} finally {
					setTimeout(() => {
						if (iframe.parentNode) {
							iframe.parentNode.removeChild(iframe);
						}
					}, 60000);
				}
			};

			document.body.appendChild(iframe);

			const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
			if (frameDoc) {
				frameDoc.open();
				frameDoc.write(htmlContent);
				frameDoc.close();

				return {
					success: true,
					status: "printed",
					interfaceUsed: "browser_dialog",
					printedAt: nowIso,
				};
			}
		} catch (iframeErr) {
			console.warn("[HardwarePrinter] Hidden iframe creation error:", iframeErr);
		}

		// Fallback B: Direct download of printable receipt
		onDownloadFallback(htmlContent, filename);
		options.onFallbackExecuted?.("download");

		return {
			success: true,
			status: "printed",
			interfaceUsed: "browser_dialog",
			printedAt: nowIso,
		};
	}

	// 3. Popup window opened normally: write and trigger print
	if (printWindow) {
		try {
			printWindow.document.open();
			printWindow.document.write(htmlContent);
			printWindow.document.close();
			printWindow.focus();

			return {
				success: true,
				status: "printed",
				interfaceUsed: "browser_dialog",
				printedAt: nowIso,
			};
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка записи во всплывающее окно печати";
			console.warn("[HardwarePrinter] Popup write error, falling back to download:", msg);
			onDownloadFallback(htmlContent, filename);
			return {
				success: true,
				status: "printed",
				interfaceUsed: "browser_dialog",
				printedAt: nowIso,
			};
		}
	}

	// Fallback when printWindow is null
	onDownloadFallback(htmlContent, filename);
	return {
		success: true,
		status: "printed",
		interfaceUsed: "browser_dialog",
		printedAt: nowIso,
	};
}
