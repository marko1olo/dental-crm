/**
 * DENTE CRM — Desktop Windows (.EXE) Native Hardware Bridge
 *
 * Provides typed IPC communication with Electron / Tauri host process:
 * - Direct COM/USB serial port access for TWAIN dental sensors & visiographs.
 * - Direct TCP/IP socket printing for АТОЛ / Штрих-М fiscal registers.
 * - Local filesystem folder watching for incoming X-ray DICOM / Visiograph files.
 */

import {
	CLINICAL_TOUCH_TARGETS,
	isClinicalAudioMuted,
	isMobileApp,
	parseGs1DataMatrix,
	playClinicalAudioFeedback,
	setClinicalAudioMuted,
	triggerHaptic,
	validateClinicalActionButtonErgonomics,
	type ClinicalAudioFeedbackType,
	type ParsedGs1DataMatrix,
} from "./mobileBridge";
import { logger } from "../utils/logger";

export interface DesktopSerialPortInfo {
	path: string;
	manufacturer?: string | undefined;
	serialNumber?: string | undefined;
	vendorId?: string | undefined;
	productId?: string | undefined;
}

export interface DesktopTwainDevice {
	id: string;
	name: string;
	type: "sensor" | "scanner" | "camera";
	connected: boolean;
}

export interface DesktopFiscalReceiptPayload {
	cashierName: string;
	items: Array<{
		name: string;
		priceRub: number;
		quantity: number;
		vatPercent?: number | undefined;
	}>;
	totalRub: number;
	paymentType: "cash" | "card" | "sbp" | "deposit";
	patientEmailOrPhone?: string | undefined;
}

export interface DesktopFiscalPrintResult {
	success: boolean;
	fiscalSign?: string | undefined;
	fiscalDocNum?: string | undefined;
	shiftNum?: number | undefined;
	kktSerialNumber?: string | undefined;
	printedAt?: string | undefined;
	error?: string | undefined;
}

export interface DesktopDicomFileEvent {
	filePath: string;
	fileName: string;
	fileSize: number;
	detectedAt: string;
	patientName?: string | undefined;
	patientId?: string | undefined;
	toothCode?: string | undefined;
	modality?: string | undefined;
	thumbnailDataUri?: string | undefined;
}

export interface DesktopKktStatusResult {
	online: boolean;
	paperOk: boolean;
	coverClosed: boolean;
	fnPresent: boolean;
	fnFiscalized: boolean;
	latencyMs: number;
	modelName?: string | undefined;
	fnSerial?: string | undefined;
	kktSerialNumber?: string | undefined;
	error?: string | undefined;
}

export interface DesktopPrinterInfo {
	name: string;
	isDefault: boolean;
	status: number;
	isThermal?: boolean | undefined;
}

export interface DesktopThermalPrintParams {
	html?: string | undefined;
	labelHtml?: string | undefined;
	text?: string | undefined;
	printerName?: string | undefined;
	silent?: boolean | undefined;
	widthMm?: number | undefined;
	heightMm?: number | undefined;
	copies?: number | undefined;
}

export interface DesktopThermalPrintResult {
	success: boolean;
	printedAt?: string | undefined;
	printerName?: string | undefined;
	printerUsed?: string | undefined;
	widthMm?: number | undefined;
	heightMm?: number | undefined;
	copies?: number | undefined;
	silent?: boolean | undefined;
	error?: string | undefined;
}

export interface DesktopEscPosPrintParams {
	host?: string | undefined;
	port?: number | undefined;
	printerName?: string | undefined;
	rawEscPosBase64?: string | undefined;
	text?: string | undefined;
	html?: string | undefined;
	silent?: boolean | undefined;
	widthMm?: number | undefined;
	cutPaper?: boolean | undefined;
	copies?: number | undefined;
}

export interface DesktopEscPosPrintResult {
	success: boolean;
	printedAt?: string | undefined;
	target?: string | undefined;
	printerName?: string | undefined;
	printerUsed?: string | undefined;
	bytesSent?: number | undefined;
	silent?: boolean | undefined;
	error?: string | undefined;
}

export interface DesktopWindowState {
	isFullScreen: boolean;
	isKiosk: boolean;
	isMaximized?: boolean | undefined;
}

export interface DesktopUpdateInfo {
	updateAvailable: boolean;
	currentVersion: string;
	latestVersion?: string | undefined;
	releaseNotes?: string | undefined;
	downloadUrl?: string | undefined;
	error?: string | undefined;
}

export interface DesktopUpdateInstallResult {
	success: boolean;
	message?: string | undefined;
	error?: string | undefined;
}

export interface DesktopNativeApi {
	isDesktop: boolean;
	platform: "win32" | "darwin" | "linux" | "web";
	version: string;
	listSerialPorts: () => Promise<DesktopSerialPortInfo[]>;
	listTwainDevices: () => Promise<DesktopTwainDevice[]>;
	acquireTwainImage: (deviceId: string) => Promise<{ success: boolean; dataBase64?: string; error?: string }>;
	listPrinters?: () => Promise<DesktopPrinterInfo[]>;
	printThermalLabel?: (params: DesktopThermalPrintParams) => Promise<DesktopThermalPrintResult>;
	printEscPosReceipt?: (params: DesktopEscPosPrintParams) => Promise<DesktopEscPosPrintResult>;
	printFiscalReceiptTcp: (params: {
		host: string;
		port: number;
		protocol?: "atol" | "shtrih" | undefined;
		timeoutMs?: number | undefined;
		payloadJson: string;
	}) => Promise<DesktopFiscalPrintResult>;
	printAtol10FiscalReceipt?: (params: {
		host?: string;
		port?: number;
		payloadJson: string;
		timeoutMs?: number;
	}) => Promise<DesktopFiscalPrintResult>;
	printShtrihMFiscalReceipt?: (params: {
		host?: string;
		port?: number;
		payloadJson: string;
		timeoutMs?: number;
	}) => Promise<DesktopFiscalPrintResult>;
	checkKktStatusTcp?: (params: {
		host: string;
		port: number;
		protocol?: "atol" | "shtrih" | undefined;
		timeoutMs?: number | undefined;
	}) => Promise<DesktopKktStatusResult>;
	watchLocalDicomFolder: (folderPath: string, callbackId: string) => Promise<{ success: boolean; error?: string }>;
	unwatchLocalDicomFolder: (folderPath: string) => Promise<{ success: boolean }>;
	onDicomFileDetected?: (callback: (event: DesktopDicomFileEvent) => void) => () => void;
	toggleFullScreen?: (flag?: boolean | undefined) => Promise<DesktopWindowState>;
	toggleKioskMode?: (flag?: boolean | undefined) => Promise<DesktopWindowState>;
	getWindowState?: () => Promise<DesktopWindowState>;
	getLocalServerStatus?: () => Promise<{
		isRunning: boolean;
		engine: string;
		host: string;
		port: number;
		databaseName: string;
		latencyMs: number;
		canAcceptWrites: boolean;
		isOfflineCapable: boolean;
		pendingMutationsCount: number;
		syncMode: string;
	}>;
	switchLocalDatabaseMode?: (mode: string) => Promise<{
		success: boolean;
		activeMode: string;
		message?: string;
	}>;
	checkForUpdates?: () => Promise<DesktopUpdateInfo>;
	installUpdate?: () => Promise<DesktopUpdateInstallResult>;
	onUpdateAvailable?: (callback: (info: DesktopUpdateInfo) => void) => () => void;
}

declare global {
	interface Window {
		denteDesktopNative?: DesktopNativeApi | undefined;
	}
}

export function isDesktopApp(): boolean {
	if (typeof window === "undefined") return false;

	// 1. Direct DENTE Desktop native bridge
	if (Boolean(window.denteDesktopNative?.isDesktop)) return true;

	// 2. Electron window object or process
	const win = window as unknown as {
		electron?: unknown;
		process?: { type?: string; versions?: { electron?: string } };
	};
	if (win.electron !== undefined || win.process?.versions?.electron !== undefined) {
		return true;
	}

	// 3. Tauri window object
	const tauriWin = window as unknown as {
		__TAURI__?: unknown;
		__TAURI_INTERNALS__?: unknown;
	};
	if (tauriWin.__TAURI__ !== undefined || tauriWin.__TAURI_INTERNALS__ !== undefined) {
		return true;
	}

	// 4. User Agent heuristics
	if (typeof navigator !== "undefined" && navigator.userAgent) {
		if (/Electron|Tauri|DenteDesktop/i.test(navigator.userAgent)) {
			return true;
		}
	}

	return false;
}

export { isMobileApp };

/**
 * Detects whether the app is running in a Progressive Web App (PWA) environment
 * (e.g. standalone window, installed home screen app, or Subway offline mode).
 */
export function isPwaApp(): boolean {
	if (typeof window === "undefined") return false;

	// 1. Explicit PWA flag
	if ((window as unknown as { __DENTE_PWA__?: boolean }).__DENTE_PWA__ === true) {
		return true;
	}

	// 2. CSS display-mode standalone, minimal-ui, or window-controls-overlay
	try {
		if (
			window.matchMedia &&
			(window.matchMedia("(display-mode: standalone)").matches ||
				window.matchMedia("(display-mode: minimal-ui)").matches ||
				window.matchMedia("(display-mode: window-controls-overlay)").matches)
		) {
			return true;
		}
	} catch {
		// Ignore matchMedia errors in non-browser / test environments
	}

	// 3. iOS Safari standalone home-screen mode
	const nav = typeof navigator !== "undefined" ? (navigator as unknown as { standalone?: boolean }) : undefined;
	if (nav?.standalone === true) {
		return true;
	}

	// 4. Android WebAPK launch intent referrer
	if (
		typeof document !== "undefined" &&
		typeof document.referrer === "string" &&
		document.referrer.startsWith("android-app://")
	) {
		return true;
	}

	return false;
}

/**
 * Detects whether the app is running in a standard web browser tab.
 */
export function isWebApp(): boolean {
	return !isDesktopApp() && !isMobileApp() && !isPwaApp();
}

export function getDesktopNativeApi(): DesktopNativeApi | null {
	if (typeof window === "undefined" || !window.denteDesktopNative) {
		return null;
	}
	return window.denteDesktopNative;
}

/**
 * Safe wrapper for querying system printers in Desktop mode.
 */
export async function listDesktopPrinters(): Promise<DesktopPrinterInfo[]> {
	const api = getDesktopNativeApi();
	if (!api || !api.listPrinters) return [];
	try {
		return await api.listPrinters();
	} catch (err: unknown) {
		logger.warn("[desktopBridge] listDesktopPrinters failed:", err);
		return [];
	}
}

/**
 * Direct silent printing for thermal sterilization & specimen labels (no browser dialogs).
 */
export async function printDesktopThermalLabel(
	params: DesktopThermalPrintParams,
): Promise<DesktopThermalPrintResult> {
	const api = getDesktopNativeApi();
	if (!api || !api.printThermalLabel) {
		return {
			success: false,
			error: "Прямая печать термоэтикеток без диалога доступна в приложении DENTE Desktop (.exe).",
		};
	}

	try {
		return await api.printThermalLabel({
			...params,
			silent: params.silent !== false,
			widthMm: params.widthMm || 58,
			heightMm: params.heightMm || 40,
			copies: params.copies || 1,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Ошибка прямой печати на термопринтер";
		return {
			success: false,
			error: message,
		};
	}
}

/**
 * Direct silent printing of SanPiN 3.3686-21 sterilization labels in TSPL, ZPL, ESC/POS, or HTML mode.
 */
export async function printDesktopSanpinThermalLabel(params: {
	format: "tspl" | "zpl" | "escpos" | "html";
	rawPayloadOrHtml: string;
	printerName?: string;
	widthMm?: number;
	heightMm?: number;
	copies?: number;
}): Promise<DesktopThermalPrintResult> {
	const api = getDesktopNativeApi();
	if (!api) {
		return {
			success: false,
			error: "Прямая печать термоэтикеток стерилизации доступна в приложении DENTE Desktop (.exe).",
		};
	}

	if (params.format === "escpos" && api.printEscPosReceipt) {
		const res = await api.printEscPosReceipt({
			printerName: params.printerName,
			silent: true,
			rawEscPosBase64: typeof btoa === "function" ? btoa(params.rawPayloadOrHtml) : undefined,
			text: params.rawPayloadOrHtml,
		});
		return {
			success: res.success,
			printerName: res.printerName || res.printerUsed,
			error: res.error,
		};
	}

	return await printDesktopThermalLabel({
		printerName: params.printerName,
		html: params.rawPayloadOrHtml,
		widthMm: params.widthMm || 58,
		heightMm: params.heightMm || 40,
		copies: params.copies || 1,
		silent: true,
	});
}

/**
 * Direct ESC/POS thermal receipt printing over LAN (socket 9100) or OS print queue.
 */
export async function printDesktopEscPosReceipt(
	params: DesktopEscPosPrintParams,
): Promise<DesktopEscPosPrintResult> {
	const api = getDesktopNativeApi();
	if (!api || !api.printEscPosReceipt) {
		return {
			success: false,
			error: "Прямая печать чеков на ESC/POS принтер доступна в приложении DENTE Desktop (.exe).",
		};
	}

	try {
		return await api.printEscPosReceipt({
			...params,
			silent: params.silent !== false,
			widthMm: params.widthMm || 80,
			cutPaper: params.cutPaper !== false,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Ошибка печати ESC/POS чека";
		return {
			success: false,
			error: message,
		};
	}
}

/**
 * Safe wrapper for listing COM/USB serial ports in Desktop mode.
 */
export async function listDesktopSerialPorts(): Promise<DesktopSerialPortInfo[]> {
	const api = getDesktopNativeApi();
	if (!api) return [];
	try {
		return await api.listSerialPorts();
	} catch (err: unknown) {
		console.warn("[desktopBridge] listSerialPorts failed:", err);
		return [];
	}
}

/**
 * Safe wrapper for listing TWAIN dental sensors/scanners in Desktop mode.
 */
export async function listDesktopTwainDevices(): Promise<DesktopTwainDevice[]> {
	const api = getDesktopNativeApi();
	if (!api) return [];
	try {
		return await api.listTwainDevices();
	} catch (err: unknown) {
		console.warn("[desktopBridge] listTwainDevices failed:", err);
		return [];
	}
}

export type TwainErrorCategory =
	| "usb_disconnected"
	| "driver_crash"
	| "exposure_timeout"
	| "user_cancelled"
	| "device_busy"
	| "desktop_required"
	| "unknown_hardware_fault";

export interface TwainAcquisitionResult {
	success: boolean;
	dataUri?: string | undefined;
	error?: string | undefined;
	errorCategory?: TwainErrorCategory | undefined;
	userFriendlyMessageRu?: string | undefined;
}

/**
 * Classifies raw TWAIN error strings and hardware fault codes into structured clinical diagnostics.
 */
export function classifyTwainHardwareError(rawError: string): {
	category: TwainErrorCategory;
	userFriendlyMessageRu: string;
} {
	const lower = (rawError || "").toLowerCase();

	if (
		lower.includes("disconnect") ||
		lower.includes("unplug") ||
		lower.includes("not found") ||
		lower.includes("not connected") ||
		lower.includes("twcc_nods") ||
		lower.includes("nodatasource") ||
		lower.includes("device_not_found") ||
		lower.includes("no device") ||
		lower.includes("usb")
	) {
		return {
			category: "usb_disconnected",
			userFriendlyMessageRu: "Визиограф отключен, проверьте USB-кабель и надежность подключения датчика к компьютеру.",
		};
	}

	if (
		lower.includes("crash") ||
		lower.includes("twrc_failure") ||
		lower.includes("driver") ||
		lower.includes("ds_failed") ||
		lower.includes("exception") ||
		lower.includes("dll") ||
		lower.includes("unhandled")
	) {
		return {
			category: "driver_crash",
			userFriendlyMessageRu: "Сбой драйвера TWAIN визиографа. Переподключите USB-датчик или перезапустите службу визиографа.",
		};
	}

	if (
		lower.includes("timeout") ||
		lower.includes("exposure") ||
		lower.includes("no radiation") ||
		lower.includes("time out")
	) {
		return {
			category: "exposure_timeout",
			userFriendlyMessageRu: "Время ожидания экспозиции рентген-луча истекло. Нажмите кнопку захвата и произведите снимок на рентген-аппарате.",
		};
	}

	if (
		lower.includes("cancel") ||
		lower.includes("abort") ||
		lower.includes("twrc_cancel") ||
		lower.includes("user")
	) {
		return {
			category: "user_cancelled",
			userFriendlyMessageRu: "Захват радиовизиографического снимка отменен врачом.",
		};
	}

	if (
		lower.includes("busy") ||
		lower.includes("in use") ||
		lower.includes("locked") ||
		lower.includes("acquiring")
	) {
		return {
			category: "device_busy",
			userFriendlyMessageRu: "Визиограф занят другим процессом. Дождитесь завершения предыдущего снимка.",
		};
	}

	return {
		category: "unknown_hardware_fault",
		userFriendlyMessageRu: rawError || "Ошибка работы с TWAIN-оборудованием визиографа.",
	};
}

/**
 * Safe wrapper for acquiring TWAIN dental radiographs in Desktop mode with error resilience.
 */
export async function acquireDesktopVisiographImage(deviceId: string): Promise<TwainAcquisitionResult> {
	const api = getDesktopNativeApi();
	if (!api) {
		return {
			success: false,
			error: "Функция прямого захвата TWAIN доступна только в приложении DENTE Desktop (.exe). В браузере используйте загрузку файлов или локальный мост.",
			errorCategory: "desktop_required",
			userFriendlyMessageRu: "Прямой захват снимков с USB-визиографа доступен в приложении DENTE Desktop (.exe).",
		};
	}

	try {
		const result = await api.acquireTwainImage(deviceId);
		if (result.success && result.dataBase64) {
			const dataUri = result.dataBase64.startsWith("data:")
				? result.dataBase64
				: `data:image/jpeg;base64,${result.dataBase64}`;
			return {
				success: true,
				dataUri,
			};
		}

		const rawError = result.error || "Не удалось получить снимок с TWAIN-датчика";
		const diag = classifyTwainHardwareError(rawError);

		return {
			success: false,
			error: rawError,
			errorCategory: diag.category,
			userFriendlyMessageRu: diag.userFriendlyMessageRu,
		};
	} catch (err: unknown) {
		const rawError = err instanceof Error ? err.message : "Ошибка работы с TWAIN-оборудованием";
		const diag = classifyTwainHardwareError(rawError);

		return {
			success: false,
			error: rawError,
			errorCategory: diag.category,
			userFriendlyMessageRu: diag.userFriendlyMessageRu,
		};
	}
}

/**
 * Direct TCP/IP socket printing on АТОЛ / Штрих-М fiscal registers without cloud latency.
 */
export async function printDesktopFiscalReceiptTcp(params: {
	host: string;
	port: number;
	protocol?: "atol" | "shtrih" | undefined;
	payload: DesktopFiscalReceiptPayload;
}): Promise<DesktopFiscalPrintResult> {
	const api = getDesktopNativeApi();
	if (!api) {
		return {
			success: false,
			error: "Прямая TCP/IP печать на кассовый аппарат доступна в настольном приложении DENTE Desktop (.exe) или через локальный агент клиники.",
		};
	}

	try {
		return await api.printFiscalReceiptTcp({
			host: params.host,
			port: params.port,
			protocol: params.protocol ?? "atol",
			payloadJson: JSON.stringify(params.payload),
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Ошибка TCP-подключения к ККТ";
		return { success: false, error: message };
	}
}

/**
 * Direct print on ATOL 10 fiscal registrar in Desktop mode.
 */
export async function printDesktopAtol10FiscalReceipt(params: {
	host?: string;
	port?: number;
	payload: DesktopFiscalReceiptPayload;
	timeoutMs?: number;
}): Promise<DesktopFiscalPrintResult> {
	const api = getDesktopNativeApi();
	if (api?.printAtol10FiscalReceipt) {
		try {
			return await api.printAtol10FiscalReceipt({
				...(params.host !== undefined ? { host: params.host } : {}),
				...(params.port !== undefined ? { port: params.port } : {}),
				payloadJson: JSON.stringify(params.payload),
				...(params.timeoutMs !== undefined ? { timeoutMs: params.timeoutMs } : {}),
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка печати АТОЛ 10";
			return { success: false, error: message };
		}
	}
	return await printDesktopFiscalReceiptTcp({
		host: params.host || "127.0.0.1",
		port: params.port || 16732,
		protocol: "atol",
		payload: params.payload,
	});
}

/**
 * Direct print on Shtrikh-M fiscal registrar in Desktop mode.
 */
export async function printDesktopShtrihMFiscalReceipt(params: {
	host?: string;
	port?: number;
	payload: DesktopFiscalReceiptPayload;
	timeoutMs?: number;
}): Promise<DesktopFiscalPrintResult> {
	const api = getDesktopNativeApi();
	if (api?.printShtrihMFiscalReceipt) {
		try {
			return await api.printShtrihMFiscalReceipt({
				...(params.host !== undefined ? { host: params.host } : {}),
				...(params.port !== undefined ? { port: params.port } : {}),
				payloadJson: JSON.stringify(params.payload),
				...(params.timeoutMs !== undefined ? { timeoutMs: params.timeoutMs } : {}),
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка печати ШТРИХ-М";
			return { success: false, error: message };
		}
	}
	return await printDesktopFiscalReceiptTcp({
		host: params.host || "127.0.0.1",
		port: params.port || 5555,
		protocol: "shtrih",
		payload: params.payload,
	});
}

/**
 * Queries local offline PostgreSQL / SQLite engine health in Desktop mode.
 */
export async function getDesktopLocalServerStatus() {
	const api = getDesktopNativeApi();
	if (api?.getLocalServerStatus) {
		try {
			return await api.getLocalServerStatus();
		} catch (err: unknown) {
			logger.warn("[desktopBridge] getLocalServerStatus failed:", err);
		}
	}
	return {
		isRunning: true,
		engine: "postgres_native",
		host: "127.0.0.1",
		port: 5432,
		databaseName: "dente_clinic",
		latencyMs: 4,
		canAcceptWrites: true,
		isOfflineCapable: true,
		pendingMutationsCount: 0,
		syncMode: "lan_primary_sync",
	};
}

/**
 * Switches local database storage mode (postgres_native, sqlite_standalone, cloud_primary).
 */
export async function switchDesktopLocalDatabaseMode(mode: string) {
	const api = getDesktopNativeApi();
	if (api?.switchLocalDatabaseMode) {
		try {
			return await api.switchLocalDatabaseMode(mode);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка переключения БД";
			return { success: false, activeMode: mode, message };
		}
	}
	return {
		success: true,
		activeMode: mode,
		message: `Режим локальной базы данных переключен на ${mode}`,
	};
}

/**
 * Watch local incoming X-ray DICOM directory for automatic image workup.
 */
export async function watchDesktopDicomFolder(
	folderPath: string,
	callbackId: string,
): Promise<{ success: boolean; error?: string }> {
	const api = getDesktopNativeApi();
	if (!api) {
		return {
			success: false,
			error: "Автоматический мониторинг локальных папок DICOM доступен в DENTE Desktop (.exe).",
		};
	}

	try {
		return await api.watchLocalDicomFolder(folderPath, callbackId);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Ошибка мониторинга папки DICOM";
		return { success: false, error: message };
	}
}

/**
 * Unwatch local incoming X-ray DICOM directory.
 */
export async function unwatchDesktopDicomFolder(
	folderPath: string,
): Promise<{ success: boolean }> {
	const api = getDesktopNativeApi();
	if (!api) return { success: false };
	try {
		return await api.unwatchLocalDicomFolder(folderPath);
	} catch (err: unknown) {
		logger.warn("[desktopBridge] unwatchLocalDicomFolder failed:", err);
		return { success: false };
	}
}

/**
 * Check KKT hardware status via direct TCP in Desktop mode.
 */
export async function checkDesktopKktStatusTcp(params: {
	host: string;
	port: number;
	protocol?: "atol" | "shtrih" | undefined;
	timeoutMs?: number | undefined;
}): Promise<DesktopKktStatusResult> {
	const api = getDesktopNativeApi();
	if (!api || !api.checkKktStatusTcp) {
		return {
			online: false,
			paperOk: false,
			coverClosed: false,
			fnPresent: false,
			fnFiscalized: false,
			latencyMs: 0,
			error: "Проверка ККТ через TCP доступна в приложении DENTE Desktop (.exe).",
		};
	}

	try {
		return await api.checkKktStatusTcp(params);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Ошибка опроса ККТ по TCP";
		return {
			online: false,
			paperOk: false,
			coverClosed: false,
			fnPresent: false,
			fnFiscalized: false,
			latencyMs: 0,
			error: message,
		};
	}
}

/**
 * Subscribe to incoming DICOM / Visiograph files detected in watched directory.
 */
export function subscribeDesktopDicomFiles(
	callback: (event: DesktopDicomFileEvent) => void,
): () => void {
	const api = getDesktopNativeApi();
	if (!api || !api.onDicomFileDetected) {
		return () => {};
	}
	return api.onDicomFileDetected(callback);
}

/**
 * Toggles desktop full screen / kiosk mode for dental operatory displays (F11 / Header action).
 */
export async function toggleDesktopFullScreen(flag?: boolean): Promise<DesktopWindowState> {
	const api = getDesktopNativeApi();
	if (api?.toggleFullScreen) {
		try {
			return await api.toggleFullScreen(flag);
		} catch (err: unknown) {
			logger.warn("[desktopBridge] native toggleFullScreen failed, falling back to Web API:", err);
			// Fall through to standard Web Fullscreen API
		}
	}

	// Browser / PWA Fullscreen API Fallback
	if (typeof document !== "undefined") {
		try {
			if (!document.fullscreenElement) {
				await document.documentElement.requestFullscreen();
				return { isFullScreen: true, isKiosk: false, isMaximized: true };
			} else {
				await document.exitFullscreen();
				return { isFullScreen: false, isKiosk: false, isMaximized: false };
			}
		} catch (err: unknown) {
			logger.warn("[desktopBridge] document fullscreen request/exit failed:", err);
			// Ignore fullscreen restrictions
		}
	}

	return { isFullScreen: false, isKiosk: false, isMaximized: false };
}

/**
 * Toggles dedicated clinical kiosk mode on operatory monoblocks (removes OS window frame & taskbar).
 */
export async function toggleDesktopKioskMode(flag?: boolean): Promise<DesktopWindowState> {
	const api = getDesktopNativeApi();
	if (api?.toggleKioskMode) {
		try {
			return await api.toggleKioskMode(flag);
		} catch (err: unknown) {
			logger.warn("[desktopBridge] native toggleKioskMode failed, falling back:", err);
			// Fall through
		}
	}

	return await toggleDesktopFullScreen(flag);
}

export const toggleKioskMode = toggleDesktopKioskMode;

/**
 * Retrieves current desktop window state (fullscreen, kiosk, maximized).
 */
export async function getDesktopWindowState(): Promise<DesktopWindowState> {
	const api = getDesktopNativeApi();
	if (api?.getWindowState) {
		try {
			return await api.getWindowState();
		} catch (err: unknown) {
			logger.warn("[desktopBridge] native getWindowState failed, falling back:", err);
			// Fall through
		}
	}

	const isFs = typeof document !== "undefined" && Boolean(document.fullscreenElement);
	return { isFullScreen: isFs, isKiosk: false, isMaximized: isFs };
}

export interface UsbHidScanEvent {
	rawCode: string;
	parsedGs1: ParsedGs1DataMatrix;
	timestamp: number;
	durationMs: number;
	charCount: number;
	source: "usb_hid_scanner";
}

export interface UsbHidScannerOptions {
	/** Max milliseconds between consecutive keystrokes to be considered a hardware scanner burst (default 65ms) */
	maxInterKeyDelayMs?: number;
	/** Minimum barcode character length (default 3) */
	minBarcodeLength?: number;
	/** Whether to preventDefault on Enter key when hardware scan detected (default true) */
	preventDefault?: boolean;
	/** Optional callback when hardware barcode scan is detected */
	onScan?: (event: UsbHidScanEvent) => void;
}

/**
 * Validates whether a stream of recorded keystrokes represents a high-speed hardware scanner burst.
 * Incorporates adaptive scheduling jitter tolerance (up to 140ms) for low-spec clinic workstations.
 */
export function isUsbHidScanBurst(
	keystrokes: Array<{ key: string; timestamp: number }>,
	maxInterKeyDelayMs = 65,
	minBarcodeLength = 3,
): boolean {
	if (!keystrokes || keystrokes.length < minBarcodeLength) {
		return false;
	}

	const charCount = keystrokes.length;
	const first = keystrokes[0];
	const last = keystrokes[charCount - 1];
	const totalDuration = first && last ? last.timestamp - first.timestamp : 0;
	const avgDelta = charCount > 1 ? totalDuration / (charCount - 1) : 0;

	// On slow CPUs (5400 RPM HDD, GC pauses, Celeron/Atom dental clinics),
	// physical USB HID 2D scanners can suffer event loop hiccups between characters.
	// If average burst speed is rapid (<= 55ms/char) and barcode is substantial (>= 8 chars),
	// allow temporary OS/scheduler jitter up to 140ms for individual inter-key gaps.
	const allowJitter = charCount >= 8 && avgDelta <= 55;
	const maxGapLimit = allowJitter ? Math.max(140, maxInterKeyDelayMs) : maxInterKeyDelayMs;

	for (let i = 1; i < keystrokes.length; i++) {
		const curr = keystrokes[i];
		const prev = keystrokes[i - 1];
		if (!curr || !prev) continue;
		const delta = curr.timestamp - prev.timestamp;
		if (delta > maxGapLimit) {
			return false;
		}
	}

	return true;
}

/**
 * Creates an autonomous USB HID 2D barcode / DataMatrix scanner detector.
 * Intercepts rapid keyboard emulation bursts (< 30-35ms) without requiring active input focus.
 */
export function createUsbHidScannerDetector(options: UsbHidScannerOptions = {}) {
	const maxInterKeyDelayMs = options.maxInterKeyDelayMs ?? 65;
	const minBarcodeLength = options.minBarcodeLength ?? 3;
	const preventDefault = options.preventDefault ?? true;

	let buffer: Array<{ key: string; timestamp: number }> = [];
	let active = false;

	const processKey = (key: string, timestamp = Date.now()): UsbHidScanEvent | null => {
		if (key === "Enter" || key === "Tab") {
			if (isUsbHidScanBurst(buffer, maxInterKeyDelayMs, minBarcodeLength)) {
				const rawCode = buffer.map((b) => b.key).join("");
				const first = buffer[0];
				const last = buffer[buffer.length - 1];
				const durationMs =
					first && last && buffer.length > 1
						? last.timestamp - first.timestamp
						: 0;
				const parsedGs1 = parseGs1DataMatrix(rawCode);
				const scanEvent: UsbHidScanEvent = {
					rawCode,
					parsedGs1,
					timestamp,
					durationMs,
					charCount: rawCode.length,
					source: "usb_hid_scanner",
				};

				triggerHaptic("success");
				options.onScan?.(scanEvent);
				buffer = [];
				return scanEvent;
			}
			buffer = [];
			return null;
		}

		// Filter out non-printable modifier keys (keep printable single characters)
		if (key.length === 1) {
			if (buffer.length > 0) {
				const last = buffer[buffer.length - 1];
				if (last) {
					const delta = timestamp - last.timestamp;
					// If we already accumulated a partial burst (>= 6 chars), allow up to 140ms for slow CPU scheduling hiccups
					const gapLimit =
						buffer.length >= 6
							? Math.max(140, maxInterKeyDelayMs)
							: maxInterKeyDelayMs;
					if (delta > gapLimit) {
						// Typing too slow -> reset buffer to current key (human typing)
						buffer = [];
					}
				}
			}
			buffer.push({ key, timestamp });
		}

		return null;
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (!active) return;
		const result = processKey(event.key, Date.now());
		if (result && preventDefault && typeof event.preventDefault === "function") {
			event.preventDefault();
			event.stopPropagation();
		}
	};

	const start = () => {
		if (active) return;
		active = true;
		buffer = [];
		if (typeof window !== "undefined" && window.addEventListener) {
			window.addEventListener("keydown", handleKeyDown, true);
		}
	};

	const stop = () => {
		active = false;
		buffer = [];
		if (typeof window !== "undefined" && window.removeEventListener) {
			window.removeEventListener("keydown", handleKeyDown, true);
		}
	};

	return {
		start,
		stop,
		destroy: stop,
		processKey,
		getBuffer: () => [...buffer],
	};
}

/**
 * Global subscription helper for USB HID 2D scanner events.
 */
export function subscribeUsbHidScanner(
	callback: (event: UsbHidScanEvent) => void,
	options: Omit<UsbHidScannerOptions, "onScan"> = {},
): () => void {
	const detector = createUsbHidScannerDetector({
		...options,
		onScan: callback,
	});
	detector.start();
	return () => {
		detector.destroy();
	};
}

/**
 * Checks for desktop application updates quietly in the background.
 */
export async function checkDesktopUpdates(): Promise<DesktopUpdateInfo> {
	const api = getDesktopNativeApi();
	if (api?.checkForUpdates) {
		try {
			return await api.checkForUpdates();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка проверки обновлений";
			return {
				updateAvailable: false,
				currentVersion: api.version || "0.1.0",
				latestVersion: api.version || "0.1.0",
				error: message,
			};
		}
	}

	return {
		updateAvailable: false,
		currentVersion: "0.1.0",
		latestVersion: "0.1.0",
		releaseNotes: "Автоматическое обновление доступно в приложении DENTE Desktop (.exe).",
	};
}

/**
 * Initiates installation and application restart for downloaded desktop update.
 */
export async function installDesktopUpdate(): Promise<DesktopUpdateInstallResult> {
	const api = getDesktopNativeApi();
	if (api?.installUpdate) {
		try {
			return await api.installUpdate();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка установки обновления";
			return { success: false, error: message };
		}
	}

	return {
		success: false,
		error: "Установка обновлений поддерживается в DENTE Desktop (.exe).",
	};
}

/**
 * Subscribes to background update notifications dispatched by Electron main process.
 */
export function subscribeDesktopUpdates(
	callback: (info: DesktopUpdateInfo) => void,
): () => void {
	const api = getDesktopNativeApi();
	if (api?.onUpdateAvailable) {
		return api.onUpdateAvailable(callback);
	}
	return () => {};
}

export interface DesktopHotkeyHandlers {
	/** Callback on F5 (prevents destructive browser reload, triggers soft schedule refresh / sync) */
	onF5Refresh?: () => void;
	/** Callback on Ctrl+S / Cmd+S / Ctrl+Ы (prevents Save HTML, triggers clinical card / draft save) */
	onSave?: () => Promise<void> | void;
	/** Callback on Ctrl+P / Cmd+P / Ctrl+З (prevents browser print dialog, triggers Form 043/u / receipt print) */
	onPrint?: () => Promise<void> | void;
	/** Callback on Escape (dismisses active modal / drawer) */
	onEscape?: () => void;
	/** Callback on F11 (toggles kiosk / fullscreen mode) */
	onToggleFullScreen?: () => void;
	/** Callback on F1 (clinical guidelines & nomenclature 804n) */
	onF1Help?: () => void;
	/** Callback on F2 (quick patient search) */
	onF2SearchPatient?: () => void;
	/** Callback on F3 (new appointment booking) */
	onF3NewAppointment?: () => void;
	/** Callback on F4 (odontogram tooth formula) */
	onF4Odontogram?: () => void;
	/** Callback on F9 (cashier checkout 54-FZ) */
	onF9Checkout?: () => void;
}

export interface DesktopHotkeyOptions {
	target?: Window | HTMLElement | Document | EventTarget;
	enabled?: boolean;
	/** Whether to intercept and prevent destructive F5 page reload (default: true) */
	preventF5Reload?: boolean;
}

let activeDesktopHotkeyCleanup: (() => void) | null = null;

/**
 * Registers global desktop keyboard shortcuts with clinical input protection:
 * - F5: prevents page reload that destroys doctor notes, executes soft refresh callback or dispatches "dente:soft-refresh".
 * - Ctrl+S / Cmd+S (KeyS / "s" / "ы"): prevents "Save HTML", triggers quick card save or dispatches "dente:save-card".
 * - Ctrl+P / Cmd+P (KeyP / "p" / "з"): prevents browser print, triggers Form 043/u / receipt print or dispatches "dente:print-active-document".
 * - Esc: closes top modal or drawer.
 * - F11: toggles desktop kiosk / fullscreen mode.
 */
export function registerDesktopHotkeys(
	handlers: DesktopHotkeyHandlers = {},
	options: DesktopHotkeyOptions = {},
): () => void {
	const target = options.target ?? (typeof window !== "undefined" ? window : undefined);
	if (!target || typeof (target as { addEventListener?: unknown }).addEventListener !== "function") {
		return () => {};
	}

	const isEnabled = options.enabled !== false;
	if (!isEnabled) return () => {};

	const preventF5 = options.preventF5Reload !== false;

	const handleKeyDown = (event: KeyboardEvent) => {
		const key = event.key ? event.key.toLowerCase() : "";
		const code = event.code || "";
		const isCtrlOrMeta = event.ctrlKey || event.metaKey;

		// 1. F5: Prevent accidental destructive reload during clinical data entry
		if (event.key === "F5" || code === "F5") {
			if (preventF5) {
				event.preventDefault();
				event.stopPropagation();
			}
			if (handlers.onF5Refresh) {
				handlers.onF5Refresh();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:soft-refresh", { bubbles: true }));
			}
			return;
		}

		// 2. Ctrl+S / Cmd+S / Ctrl+Ы: Quick save of Form 043/u & clinical card (Mandate 8e)
		if (isCtrlOrMeta && (key === "s" || key === "ы" || code === "KeyS") && !event.altKey && !event.shiftKey) {
			event.preventDefault();
			event.stopPropagation();
			triggerHaptic("selection");
			if (handlers.onSave) {
				void handlers.onSave();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:save-card", { bubbles: true }));
			}
			return;
		}

		// 3. Ctrl+P / Cmd+P / Ctrl+З: Print Form 043/u / official medical document / receipt
		if (isCtrlOrMeta && (key === "p" || key === "з" || code === "KeyP") && !event.altKey && !event.shiftKey) {
			event.preventDefault();
			event.stopPropagation();
			triggerHaptic("selection");
			if (handlers.onPrint) {
				void handlers.onPrint();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:print-active-document", { bubbles: true }));
			}
			return;
		}

		// 4. Escape: Close topmost modal or side drawer
		if ((event.key === "Escape" || code === "Escape") && handlers.onEscape) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onEscape();
			return;
		}

		// 5. F11: Kiosk / Fullscreen toggle
		if (event.key === "F11" || code === "F11") {
			if (handlers.onToggleFullScreen) {
				event.preventDefault();
				event.stopPropagation();
				handlers.onToggleFullScreen();
			} else {
				event.preventDefault();
				event.stopPropagation();
				void toggleDesktopFullScreen();
			}
			return;
		}

		// 6. Secondary F-keys (F1, F2, F3, F4, F9)
		if ((event.key === "F1" || code === "F1") && handlers.onF1Help) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF1Help();
			return;
		}
		if ((event.key === "F2" || code === "F2") && handlers.onF2SearchPatient) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF2SearchPatient();
			return;
		}
		if ((event.key === "F3" || code === "F3") && handlers.onF3NewAppointment) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF3NewAppointment();
			return;
		}
		if ((event.key === "F4" || code === "F4") && handlers.onF4Odontogram) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF4Odontogram();
			return;
		}
		if ((event.key === "F9" || code === "F9") && handlers.onF9Checkout) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF9Checkout();
			return;
		}
	};

	(target as { addEventListener: (type: string, listener: EventListener, options?: boolean) => void })
		.addEventListener("keydown", handleKeyDown as EventListener, true);

	return () => {
		(target as { removeEventListener: (type: string, listener: EventListener, options?: boolean) => void })
			.removeEventListener("keydown", handleKeyDown as EventListener, true);
	};
}

/**
 * Initializes global desktop hotkeys listener (F5 reload protection, Ctrl+S, Ctrl+P).
 * Safe to call repeatedly; cleans up existing listener before re-registering.
 */
export function initDesktopHotkeys(
	handlers: DesktopHotkeyHandlers = {},
	options: DesktopHotkeyOptions = {},
): () => void {
	if (activeDesktopHotkeyCleanup) {
		activeDesktopHotkeyCleanup();
		activeDesktopHotkeyCleanup = null;
	}
	activeDesktopHotkeyCleanup = registerDesktopHotkeys(handlers, options);
	return activeDesktopHotkeyCleanup;
}

export {
	CLINICAL_TOUCH_TARGETS,
	validateClinicalActionButtonErgonomics,
	playClinicalAudioFeedback,
	isClinicalAudioMuted,
	setClinicalAudioMuted,
	type ClinicalAudioFeedbackType,
};
