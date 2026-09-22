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
	listDesktopTwainDevices,
	printDesktopEscPosReceipt,
	printDesktopFiscalReceiptTcp,
	printDesktopFiscalReceiptSerial,
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
import { logger } from "../utils/logger";

export type RuntimePlatform = "desktop_win" | "mobile_android" | "web_pwa";

export function detectRuntimePlatform(): RuntimePlatform {
	if (isDesktopApp()) return "desktop_win";
	if (isMobileApp()) return "mobile_android";
	return "web_pwa";
}

export type UniversalRuntime = "web_browser" | "desktop_exe" | "android_apk" | "pwa_standalone";

/**
 * Accurately detects the 4 execution targets: Web, Desktop EXE, Android APK, and PWA Standalone.
 */
export function detectUniversalRuntime(): UniversalRuntime {
	if (isDesktopApp()) return "desktop_exe";
	if (isMobileApp()) return "android_apk";
	if (typeof window !== "undefined") {
		const win = window as unknown as { __DENTE_PWA__?: boolean; matchMedia?: (q: string) => { matches: boolean } };
		if (win.__DENTE_PWA__ === true) return "pwa_standalone";
		if (win.matchMedia?.("(display-mode: standalone)").matches || win.matchMedia?.("(display-mode: minimal-ui)").matches) {
			return "pwa_standalone";
		}
	}
	return "web_browser";
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

	if (platform === "desktop_win") {
		let targetDeviceId = deviceId;
		if (!targetDeviceId) {
			try {
				const devices = await listDesktopTwainDevices();
				const connectedSensor =
					devices.find((d) => d.connected && (d.type === "sensor" || d.type === "scanner")) ??
					devices.find((d) => d.connected) ??
					devices[0];
				if (connectedSensor) {
					targetDeviceId = connectedSensor.id;
				}
			} catch (err: unknown) {
				logger.warn("[hardwareDispatcher] auto-detection of TWAIN sensor failed:", err);
			}
		}

		if (targetDeviceId) {
			return acquireDesktopVisiographImage(targetDeviceId);
		}
	}

	return {
		success: false,
		error: "Для прямого захвата с USB-визиографа используйте приложение DENTE Desktop (.exe) или выберите файл со снимком.",
		errorCategory: "desktop_required",
		userFriendlyMessageRu: "Прямой захват TWAIN-снимков поддерживается в приложении DENTE Desktop (.exe).",
	};
}

export interface DispatchFiscalReceiptParams {
	kktHost?: string | undefined;
	kktPort?: number | undefined;
	kktSerialPort?: string | undefined;
	baudRate?: number | undefined;
	protocol?: "atol" | "shtrih" | undefined;
	timeoutMs?: number | undefined;
	payload: DesktopFiscalReceiptPayload;
	bufferOfflineOnFailure?: boolean | undefined;
}

/**
 * Universal Fiscal Receipt Printing Dispatcher (54-ФЗ).
 * In Desktop mode: routes to direct TCP socket or COM serial port hardware register.
 * In Web / Mobile / PWA: gracefully buffers into FiscalReceiptQueueManager to prevent loss of payment records.
 */
export async function dispatchFiscalReceiptPrint(
	params: DispatchFiscalReceiptParams,
): Promise<DesktopFiscalPrintResult> {
	const platform = detectRuntimePlatform();

	if (platform === "desktop_win") {
		// 1. Direct COM / Serial Port execution (USB RS-232 / Prolific)
		if (params.kktSerialPort) {
			try {
				const serialRes = await printDesktopFiscalReceiptSerial({
					port: params.kktSerialPort,
					baudRate: params.baudRate,
					protocol: params.protocol,
					timeoutMs: params.timeoutMs,
					payload: params.payload,
				});
				if (serialRes.success) return serialRes;
			} catch (err: unknown) {
				logger.warn("[hardwareDispatcher] printDesktopFiscalReceiptSerial failed:", err);
			}
		}

		// 2. Direct TCP / LAN socket execution (Ethernet / Wi-Fi KKT)
		if (params.kktHost && params.kktPort) {
			try {
				const tcpRes = await printDesktopFiscalReceiptTcp({
					host: params.kktHost,
					port: params.kktPort,
					protocol: params.protocol,
					timeoutMs: params.timeoutMs,
					payload: params.payload,
				});
				if (tcpRes.success) return tcpRes;
			} catch (err: unknown) {
				logger.warn("[hardwareDispatcher] printDesktopFiscalReceiptTcp failed:", err);
			}
		}
	}

	// 3. Fallback for Web / Mobile / PWA or offline KKT: buffer into FiscalReceiptQueueManager
	if (params.bufferOfflineOnFailure !== false && params.payload) {
		try {
			const { FiscalReceiptQueueManager } = await import("../services/hardware/fiscalReceiptQueueManager.js");
			FiscalReceiptQueueManager.enqueueReceipt({
				orderId: `ORD-${Date.now()}`,
				patientName: params.payload.patientEmailOrPhone || "Пациент",
				operationType: "income",
				cashierFullName: params.payload.cashierName,
				cashierName: params.payload.cashierName,
				items: params.payload.items.map((it) => ({
					name: it.name,
					priceRub: it.priceRub,
					price: it.priceRub,
					quantity: it.quantity,
					amountRub: it.priceRub * it.quantity,
					amount: it.priceRub * it.quantity,
					vatRate: "vat_none",
					vatType: "none",
					paymentMethod: "full_payment",
					paymentSubject: "service",
				})),
				totalRub: params.payload.totalRub,
				totalAmount: params.payload.totalRub,
				cashAmount: params.payload.paymentType === "cash" ? params.payload.totalRub : 0,
				electronicAmount: params.payload.paymentType !== "cash" ? params.payload.totalRub : 0,
			}, "kkt_lan_timeout");
		} catch (queueErr: unknown) {
			logger.warn("[hardwareDispatcher] Failed to buffer receipt to FiscalReceiptQueueManager:", queueErr);
		}
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
			} catch (openErr: unknown) {
				logger.warn("[HardwareDispatcher] window.open failed, trying iframe fallback", openErr);
			}

			const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Печать этикетки</title><style>@media print { body { margin: 0; padding: 2px; } }</style></head><body>${params.html}</body></html>`;

			if (printWindow && !printWindow.closed) {
				printWindow.document.write(fullHtml);
				printWindow.document.close();
				printWindow.focus();
				setTimeout(() => {
					try {
						printWindow?.print();
					} catch (printErr: unknown) {
						logger.warn("[HardwareDispatcher] printWindow.print() failed", printErr);
					}
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
			} catch (openErr: unknown) {
				logger.warn("[HardwareDispatcher] window.open for receipt failed, trying iframe fallback", openErr);
			}

			let receiptText = params.text;
			if (!receiptText && params.rawEscPosBase64) {
				try {
					if (typeof atob === "function") {
						const raw = atob(params.rawEscPosBase64);
						receiptText = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
					}
				} catch (decodeErr: unknown) {
					logger.warn("[HardwareDispatcher] atob decoding failed for rawEscPosBase64", decodeErr);
				}
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
					} catch (printErr: unknown) {
						logger.warn("[HardwareDispatcher] printWindow.print() for receipt failed", printErr);
					}
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

/**
 * Universal Chairside Camera Photo Protocol Dispatcher.
 * Automatically delegates to Android APK native camera or web MediaDevices without crashing.
 */
export async function dispatchChairsideCameraPhoto(options?: {
	toothCode?: string;
	facingMode?: "environment" | "user";
	viewCategory?: "portrait" | "occlusion" | "upper_arch" | "lower_arch" | "intraoral_macro" | "xray_film_scan";
	resolution?: "standard" | "high" | "macro";
}) {
	const platform = detectRuntimePlatform();
	if (platform === "mobile_android") {
		const { takeChairsidePhoto } = await import("./mobileBridge.js");
		return takeChairsidePhoto(options);
	}
	const { captureChairsidePhoto } = await import("../utils/deviceDetection.js");
	return captureChairsidePhoto(options);
}

export {
	createUsbHidScannerDetector,
	isUsbHidScanBurst,
	subscribeUsbHidScanner,
	type UsbHidScanEvent,
	type UsbHidScannerOptions,
};
