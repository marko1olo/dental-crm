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
	parseGs1DataMatrix,
	playClinicalAudioFeedback,
	setClinicalAudioMuted,
	triggerHaptic,
	validateClinicalActionButtonErgonomics,
	type ClinicalAudioFeedbackType,
	type ParsedGs1DataMatrix,
} from "./mobileBridge";

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
	return typeof window !== "undefined" && Boolean(window.denteDesktopNative?.isDesktop);
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
	} catch {
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
	} catch {
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
	} catch {
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
	} catch {
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
		} catch {
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
		} catch {
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
		} catch {
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
		} catch {
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
	/** Max milliseconds between consecutive keystrokes to be considered a hardware scanner burst (default 35ms) */
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
 */
export function isUsbHidScanBurst(
	keystrokes: Array<{ key: string; timestamp: number }>,
	maxInterKeyDelayMs = 35,
	minBarcodeLength = 3,
): boolean {
	if (!keystrokes || keystrokes.length < minBarcodeLength) {
		return false;
	}

	for (let i = 1; i < keystrokes.length; i++) {
		const curr = keystrokes[i];
		const prev = keystrokes[i - 1];
		if (!curr || !prev) continue;
		const delta = curr.timestamp - prev.timestamp;
		if (delta > maxInterKeyDelayMs) {
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
	const maxInterKeyDelayMs = options.maxInterKeyDelayMs ?? 35;
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
				if (last && timestamp - last.timestamp > maxInterKeyDelayMs) {
					// Typing too slow -> reset buffer to current key (human typing)
					buffer = [];
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

export {
	CLINICAL_TOUCH_TARGETS,
	validateClinicalActionButtonErgonomics,
	playClinicalAudioFeedback,
	isClinicalAudioMuted,
	setClinicalAudioMuted,
	type ClinicalAudioFeedbackType,
};
