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
	printDesktopFiscalReceiptTcp,
	watchDesktopDicomFolder,
	unwatchDesktopDicomFolder,
	type DesktopFiscalReceiptPayload,
	type DesktopFiscalPrintResult,
} from "./desktopBridge";
import {
	authenticateBiometricStaff,
	getMobileNativeApi,
	isMobileApp,
	parseGs1DataMatrix,
	scanDataMatrixWithCamera,
	triggerHaptic,
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
export async function dispatchVisiographAcquisition(deviceId?: string): Promise<{
	success: boolean;
	dataUri?: string | undefined;
	error?: string | undefined;
}> {
	const platform = detectRuntimePlatform();

	if (platform === "desktop_win" && deviceId) {
		return acquireDesktopVisiographImage(deviceId);
	}

	return {
		success: false,
		error: "Для прямого захвата с USB-визиографа используйте приложение DENTE Desktop (.exe) или выберите файл со снимком.",
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
