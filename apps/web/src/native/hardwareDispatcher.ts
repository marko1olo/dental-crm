/**
 * DENTE CRM — Universal Hardware Dispatcher
 *
 * Automatically detects runtime platform:
 * - Desktop Windows (.EXE)
 * - Mobile Android (.APK)
 * - Modern Web Browser (PWA)
 *
 * Routes hardware calls to the optimal native driver or network fallback.
 */

import {
	acquireDesktopVisiographImage,
	getDesktopNativeApi,
	isDesktopApp,
	listDesktopPrinters,
	printDesktopEscPosReceipt,
	printDesktopFiscalReceiptTcp,
	printDesktopThermalLabel,
	watchDesktopDicomFolder,
	unwatchDesktopDicomFolder,
	createUsbHidScannerDetector,
	isUsbHidScanBurst,
	subscribeUsbHidScanner,
	type UsbHidScanEvent,
	type UsbHidScannerOptions,
	type DesktopEscPosPrintParams,
	type DesktopEscPosPrintResult,
	type DesktopFiscalReceiptPayload,
	type DesktopFiscalPrintResult,
	type DesktopPrinterInfo,
	type DesktopThermalPrintParams,
	type DesktopThermalPrintResult,
	type TwainAcquisitionResult,
	type TwainErrorCategory,
} from "./desktopBridge";
import {
	authenticateBiometricStaff,
	getDeviceFormFactor,
	getMobileNativeApi,
	getSafeAreaInsets,
	isMobileApp,
	isMobileSmartphone,
	isTabletDevice,
	parseGs1DataMatrix,
	scanDataMatrixWithCamera,
	triggerHaptic,
	type DeviceFormFactor,
	type MobileBiometricAuthResult,
	type ParsedGs1DataMatrix,
} from "./mobileBridge";

export type RuntimePlatform = "desktop_win" | "mobile_android" | "web_pwa";

export function detectRuntimePlatform(): RuntimePlatform {
	if (isDesktopApp()) return "desktop_win";
	if (isMobileApp()) return "mobile_android";
	return "web_pwa";
}

export interface UniversalScannerResult {
	success: boolean;
	code?: string | undefined;
	format?: string | undefined;
	source: "native_camera" | "usb_hid" | "manual";
	parsedGs1?: ParsedGs1DataMatrix | undefined;
	error?: string | undefined;
}

/**
 * Universal Barcode / DataMatrix Scan Dispatcher.
 */
export async function dispatchUniversalScan(): Promise<UniversalScannerResult> {
	const platform = detectRuntimePlatform();

	if (platform === "mobile_android") {
		const result = await scanDataMatrixWithCamera();
		if (result.success && result.barcode) {
			triggerHaptic("success");
			const parsedGs1 = parseGs1DataMatrix(result.barcode);
			return {
				success: true,
				code: result.barcode,
				format: result.format ?? (parsedGs1.isValidMdlp ? "DATA_MATRIX" : undefined),
				source: "native_camera",
				parsedGs1,
			};
		}
		triggerHaptic("error");
		return {
			success: false,
			error: result.error || "Сканирование отменено",
			source: "native_camera",
		};
	}

	return {
		success: false,
		source: "usb_hid",
		error: "Поднесите 2D-сканер к штрихкоду или введите код вручную.",
	};
}

/**
 * Universal Visiograph Acquisition Dispatcher.
 */
export async function dispatchVisiographAcquisition(deviceId?: string): Promise<TwainAcquisitionResult> {
	const platform = detectRuntimePlatform();

	if (platform === "desktop_win" && deviceId) {
		return acquireDesktopVisiographImage(deviceId);
	}

	return {
		success: false,
		error: "Для прямого захвата с USB-визиографа используйте приложение DENTE Desktop (.exe) или выберите файл со снимком.",
		errorCategory: "desktop_required",
		userFriendlyMessageRu: "Прямой захват TWAIN-снимков поддерживается в приложении DENTE Desktop (.exe).",
	};
}

/**
 * Universal Fiscal Receipt Printing Dispatcher (54-ФЗ).
 */
export async function dispatchFiscalReceiptPrint(params: {
	kktHost?: string | undefined;
	kktPort?: number | undefined;
	payload: DesktopFiscalReceiptPayload;
}): Promise<DesktopFiscalPrintResult> {
	const platform = detectRuntimePlatform();

	if (platform === "desktop_win" && params.kktHost && params.kktPort) {
		return printDesktopFiscalReceiptTcp({
			host: params.kktHost,
			port: params.kktPort,
			payload: params.payload,
		});
	}

	// Web / Mobile network fallback: send to local clinic fiscal service
	return {
		success: false,
		error: "Для прямой печати на локальный ККТ настройте соединение в DENTE Desktop (.exe) или используйте кассовый шлюз клиники.",
	};
}

/**
 * Universal Thermal Label Printing Dispatcher.
 * In Desktop mode: executes silent direct print without popup windows or dialogs.
 * In Web/Mobile mode: opens print preview or triggers window.print().
 */
export async function dispatchThermalLabelPrint(
	params: DesktopThermalPrintParams,
): Promise<DesktopThermalPrintResult> {
	const platform = detectRuntimePlatform();

	if (platform === "desktop_win") {
		try {
			const res = await printDesktopThermalLabel(params);
			if (res.success) {
				return res;
			}
			console.warn("[HardwareDispatcher] Desktop thermal label spooler failed, falling back to OS print dialog:", res.error);
		} catch (e) {
			console.warn("[HardwareDispatcher] Desktop thermal label spooler exception, falling back to OS print dialog:", e);
		}
	}

	// Browser / Mobile fallback: open print window or trigger hidden iframe print
	if (typeof window !== "undefined" && params.html) {
		try {
			let printWindow: Window | null = null;
			try {
				printWindow = window.open("", "_blank");
			} catch {}

			const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Печать этикетки</title><style>@media print { body { margin: 0; padding: 2px; } }</style></head><body>${params.html}</body></html>`;

			if (printWindow && !printWindow.closed) {
				printWindow.document.write(fullHtml);
				printWindow.document.close();
				printWindow.focus();
				setTimeout(() => {
					try {
						printWindow?.print();
					} catch {}
				}, 250);
				return {
					success: true,
					printedAt: new Date().toISOString(),
					silent: false,
				};
			}

			// Fallback: hidden iframe print if popups are blocked
			if (typeof document !== "undefined") {
				const iframe = document.createElement("iframe");
				iframe.style.position = "fixed";
				iframe.style.right = "0";
				iframe.style.bottom = "0";
				iframe.style.width = "0";
				iframe.style.height = "0";
				iframe.style.border = "0";
				document.body.appendChild(iframe);
				iframe.contentDocument?.write(fullHtml);
				iframe.contentDocument?.close();
				iframe.contentWindow?.focus();
				iframe.contentWindow?.print();
				setTimeout(() => {
					if (document.body.contains(iframe)) {
						document.body.removeChild(iframe);
					}
				}, 60000);
				return {
					success: true,
					printedAt: new Date().toISOString(),
					silent: false,
				};
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Не удалось открыть окно печати";
			return { success: false, error: message };
		}
	}

	return {
		success: false,
		error: "Для автоматической тихой печати термоэтикеток используйте приложение DENTE Desktop (.exe).",
	};
}

/**
 * Universal ESC/POS Thermal Receipt Dispatcher.
 * In Desktop mode: sends raw socket packet (port 9100) with instant transparent fallback
 * to OS print queue or browser window.print() if TCP port is unreachable.
 * In Web/Mobile mode: formats print preview or triggers browser print dialog.
 */
export async function dispatchEscPosReceiptPrint(
	params: DesktopEscPosPrintParams,
): Promise<DesktopEscPosPrintResult> {
	const platform = detectRuntimePlatform();

	if (platform === "desktop_win") {
		try {
			const res = await printDesktopEscPosReceipt(params);
			if (res.success) {
				return res;
			}
			console.warn("[HardwareDispatcher] Desktop direct socket ESC/POS failed, falling back to OS print dialog:", res.error);
		} catch (e) {
			console.warn("[HardwareDispatcher] Desktop direct socket ESC/POS exception, falling back to OS print dialog:", e);
		}
	}

	if (typeof window !== "undefined" && (params.html || params.text || params.rawEscPosBase64)) {
		try {
			let printWindow: Window | null = null;
			try {
				printWindow = window.open("", "_blank");
			} catch {}

			let receiptText = params.text;
			if (!receiptText && params.rawEscPosBase64) {
				try {
					if (typeof atob === "function") {
						const raw = atob(params.rawEscPosBase64);
						receiptText = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
					}
				} catch {}
			}

			const content = params.html || `<pre style="font-family:monospace;font-size:11px;padding:3mm;">${receiptText || "Чек"}</pre>`;
			const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Печать чека</title><style>@media print { body { margin: 0; padding: 2px; } }</style></head><body>${content}</body></html>`;

			if (printWindow && !printWindow.closed) {
				printWindow.document.write(fullHtml);
				printWindow.document.close();
				printWindow.focus();
				setTimeout(() => {
					try {
						printWindow?.print();
					} catch {}
				}, 250);
				return {
					success: true,
					printedAt: new Date().toISOString(),
					silent: false,
				};
			}

			// Fallback: hidden iframe print if popups are blocked
			if (typeof document !== "undefined") {
				const iframe = document.createElement("iframe");
				iframe.style.position = "fixed";
				iframe.style.right = "0";
				iframe.style.bottom = "0";
				iframe.style.width = "0";
				iframe.style.height = "0";
				iframe.style.border = "0";
				document.body.appendChild(iframe);
				iframe.contentDocument?.write(fullHtml);
				iframe.contentDocument?.close();
				iframe.contentWindow?.focus();
				iframe.contentWindow?.print();
				setTimeout(() => {
					if (document.body.contains(iframe)) {
						document.body.removeChild(iframe);
					}
				}, 60000);
				return {
					success: true,
					printedAt: new Date().toISOString(),
					silent: false,
				};
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Не удалось открыть окно печати чека";
			return { success: false, error: message };
		}
	}

	return {
		success: false,
		error: "Прямая бесшумная печать ESC/POS чеков доступна в приложении DENTE Desktop (.exe).",
	};
}

/**
 * Universal Biometric Authentication Dispatcher.
 */
export async function dispatchStaffBiometricAuth(
	promptMessage?: string,
): Promise<MobileBiometricAuthResult> {
	const platform = detectRuntimePlatform();

	if (platform === "mobile_android") {
		return authenticateBiometricStaff(promptMessage);
	}

	return {
		success: false,
		authenticated: false,
		error: "Биометрический вход поддерживается в мобильном приложении DENTE (.apk).",
	};
}

export {
	createUsbHidScannerDetector,
	isUsbHidScanBurst,
	subscribeUsbHidScanner,
	type UsbHidScanEvent,
	type UsbHidScannerOptions,
};
