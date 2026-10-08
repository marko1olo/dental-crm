/**
 * DENTE CRM — Desktop Windows (.EXE) Native Hardware Bridge Types (Layer 0)
 *
 * Core typed interfaces for Electron / Tauri IPC, TWAIN sensors,
 * fiscal printers, 3D CT viewers, window states, and hardware events.
 */

import type { ParsedGs1DataMatrix } from "../mobile/gs1Scanner";
import type { ClinicalAudioFeedbackType } from "../mobile/hapticsAndAudio";

export type { ClinicalAudioFeedbackType };

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
	bufferedOffline?: boolean | undefined;
	queueItemId?: string | undefined;
	userFriendlyMessageRu?: string | undefined;
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

export interface InstalledCtViewerInfo {
	id: string;
	name: string;
	vendor: string;
	exePath: string;
	iconKey?: string | undefined;
	isDefault: boolean;
}

export interface LaunchCtViewerParams {
	viewerId?: string | undefined;
	exePath?: string | undefined;
	studyPath?: string | undefined;
}

export interface LaunchCtViewerResult {
	success: boolean;
	pid?: number | undefined;
	viewerName?: string | undefined;
	error?: string | undefined;
	windowId?: number | undefined;
}

export interface RecentDownloadsCtItem {
	path: string;
	fileName: string;
	sizeBytes: number;
	createdAt: string;
	detectedModality: string;
	patientHint?: string | undefined;
}

export interface ScanDownloadsCtOptions {
	hotFolderPath?: string | undefined;
	maxDays?: number | undefined;
	maxDepth?: number | undefined;
}

export interface DesktopCtDownloadItem {
	id: string;
	fileName: string;
	filePath?: string;
	fileSizeBytes: number;
	detectedAtIso: string;
	patientName?: string;
	modality: "cbct" | "ct" | "dicom_archive";
	sliceCountEstimate?: number;
	source: "downloads" | "hot_folder" | "drag_drop";
	isZip: boolean;
	externalViewerExecutable?: string;
}

export interface DesktopExternalViewerInfo {
	id: string;
	name: string;
	vendor: string;
	executablePath?: string;
	isAvailable: boolean;
	icon?: string;
	isDefault?: boolean;
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
	printFiscalReceiptSerial?: (params: {
		port: string;
		baudRate?: number | undefined;
		protocol?: "atol" | "shtrih" | undefined;
		timeoutMs?: number | undefined;
		payloadJson: string;
	}) => Promise<DesktopFiscalPrintResult>;
	sendSerialCommand?: (params: {
		port: string;
		baudRate?: number | undefined;
		dataHex: string;
		timeoutMs?: number | undefined;
	}) => Promise<{ success: boolean; responseHex?: string; error?: string }>;
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
	printDocumentSilent?: (params: {
		htmlContent?: string | undefined;
		pdfBase64?: string | undefined;
		printerName?: string | undefined;
		title?: string | undefined;
		silent?: boolean | undefined;
		copies?: number | undefined;
		pageSize?: "A4" | "A5" | "Letter" | "Legal" | string | undefined;
		landscape?: boolean | undefined;
		margins?: {
			marginType?: "default" | "none" | "printableArea" | "custom";
			top?: number;
			bottom?: number;
			left?: number;
			right?: number;
		} | undefined;
	}) => Promise<{ success: boolean; error?: string }>;
	onDesktopSoftRefresh?: (callback: () => void) => () => void;
	onDesktopPrintRequest?: (callback: () => void) => () => void;
	onDesktopSaveRequest?: (callback: () => void) => () => void;
	onDesktopSearchRequest?: (callback: () => void) => () => void;
	onDesktopEscapeRequest?: (callback: () => void) => () => void;
	scanDownloadsForCt?: (options?: ScanDownloadsCtOptions) => Promise<RecentDownloadsCtItem[]>;
	detectInstalledCtViewers?: () => Promise<InstalledCtViewerInfo[]>;
	launchExternalCtViewer?: (params: LaunchCtViewerParams) => Promise<LaunchCtViewerResult>;
	detectExternalCtViewers?: () => Promise<DesktopExternalViewerInfo[]>;
	openInExternalViewer?: (params: { viewerId: string; filePath?: string; archivePath?: string }) => Promise<{ success: boolean; error?: string }>;
	openInNewWindow?: (params: { url: string; title?: string; studyId?: string; patientId?: string }) => Promise<{ success: boolean; error?: string }>;
	openCbctPopoutWindow?: (params: {
		url?: string;
		studyId?: string;
		patientId?: string;
		patientName?: string;
		title?: string;
		targetDisplayId?: number;
		width?: number;
		height?: number;
	}) => Promise<{ success: boolean; windowId?: number; isNewWindow?: boolean; url?: string; error?: string }>;
}

declare global {
	interface Window {
		denteDesktopNative?: DesktopNativeApi | undefined;
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

export interface DesktopDocumentPrintOptions {
	htmlContent?: string | undefined;
	pdfBase64?: string | undefined;
	printerName?: string | undefined;
	title?: string | undefined;
	silent?: boolean | undefined;
	copies?: number | undefined;
	pageSize?: "A4" | "A5" | "Letter" | "Legal" | string | undefined;
	landscape?: boolean | undefined;
	margins?: {
		marginType?: "default" | "none" | "printableArea" | "custom";
		top?: number;
		bottom?: number;
		left?: number;
		right?: number;
	} | undefined;
}

export interface DesktopDocumentPrintResult {
	success: boolean;
	method: "desktop_silent" | "iframe_silent" | "browser_dialog";
	printerName?: string | undefined;
	pageSize?: string | undefined;
	landscape?: boolean | undefined;
	error?: string | undefined;
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
	/** Callback on F2 or Ctrl+K / Cmd+K (quick patient search / Omnibar) */
	onF2SearchPatient?: () => void;
	/** Callback on Ctrl+K / Cmd+K / F2 (quick search / Omnibar alias) */
	onSearch?: () => void;
	/** Callback on F3 (new appointment booking) */
	onF3NewAppointment?: () => void;
	/** Callback on F4 (odontogram tooth formula) */
	onF4Odontogram?: () => void;
	/** Callback on F6 (clinical rules & warnings) */
	onF6ClinicalRules?: () => void;
	/** Callback on F7 (visiograph / X-ray image capture) */
	onF7Visiograph?: () => void;
	/** Callback on F8 (treatment plan & stages overview) */
	onF8TreatmentPlan?: () => void;
	/** Callback on F9 (cashier checkout 54-FZ) */
	onF9Checkout?: () => void;
	/** Callback on F10 (outpatient documents / Form 043/u) */
	onF10Documents?: () => void;
	/** Callback on F12 (quick print active diary Form 043/u) */
	onF12PrintDiary?: () => void;
}

export interface DesktopHotkeyOptions {
	target?: Window | HTMLElement | Document | EventTarget;
	enabled?: boolean;
	/** Whether to intercept and prevent destructive F5 page reload (default: true) */
	preventF5Reload?: boolean;
}
