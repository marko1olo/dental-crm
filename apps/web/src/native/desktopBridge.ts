/**
 * DENTE CRM — Desktop Windows (.EXE) Native Hardware Bridge
 *
 * Provides typed IPC communication with Electron / Tauri host process:
 * - Direct COM/USB serial port access for TWAIN dental sensors & visiographs.
 * - Direct TCP/IP socket printing for АТОЛ / Штрих-М fiscal registers.
 * - Local filesystem folder watching for incoming X-ray DICOM / Visiograph files.
 */

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
	widthMm?: number | undefined;
	heightMm?: number | undefined;
	copies?: number | undefined;
	silent?: boolean | undefined;
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

/**
 * Safe wrapper for acquiring TWAIN dental radiographs in Desktop mode.
 */
export async function acquireDesktopVisiographImage(deviceId: string): Promise<{
	success: boolean;
	dataUri?: string;
	error?: string;
}> {
	const api = getDesktopNativeApi();
	if (!api) {
		return {
			success: false,
			error: "Функция прямого захвата TWAIN доступна только в приложении DENTE Desktop (.exe). В браузере используйте загрузку файлов или локальный мост.",
		};
	}

	try {
		const result = await api.acquireTwainImage(deviceId);
		if (result.success && result.dataBase64) {
			const dataUri = result.dataBase64.startsWith("data:")
				? result.dataBase64
				: `data:image/jpeg;base64,${result.dataBase64}`;
			return { success: true, dataUri };
		}
		return { success: false, error: result.error || "Не удалось получить снимок с TWAIN-датчика" };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Ошибка работы с TWAIN-оборудованием";
		return { success: false, error: message };
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
