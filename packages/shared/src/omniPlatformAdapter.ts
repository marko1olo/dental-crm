/**
 * @dental/shared — Universal Omni-Platform Adapter Contracts & Architectural Invariants.
 *
 * Defines unified contracts for multi-platform dental CRM runtimes:
 * 1. Web Browser (Chrome, Edge, Firefox, Safari)
 * 2. Desktop Windows Executable (.EXE via Electron or Tauri)
 * 3. Mobile Android Tablet/Phone (.APK via Capacitor or Android WebView)
 * 4. Progressive Web App (PWA Standalone Window with ServiceWorker Cache)
 *
 * Clinical Ergonomics & Architecture Law (Mandates 8c, 8e, 8n, 8p):
 * - Fine pointer (`pointer: fine` with mouse/keyboard): Dense desktop professional grid (28–36px controls).
 * - Coarse pointer (`pointer: coarse` on touchscreen / tablet): Expanded hit targets (44–48px min) for medical gloves.
 * - Doctor Autonomy (Mandate 8e): Frictionless printing, instant autosave (Ctrl+S), offline mutation buffering.
 * - Scale Sovereignty (Mandate 8n): Zero configuration for solo doctor on chair rental or small clinic.
 */

import { z } from "zod";

// ============================================================================
// 1. RUNTIME PLATFORM & TOPOLOGY TYPES
// ============================================================================

export const omniEnvironmentSchema = z.enum([
	"web_browser",
	"desktop_exe",
	"android_apk",
	"pwa_standalone",
]);
export type OmniEnvironment = z.infer<typeof omniEnvironmentSchema>;

export const pointerTypeSchema = z.enum(["fine", "coarse"]);
export type PointerType = z.infer<typeof pointerTypeSchema>;

export const deviceFormFactorSchema = z.enum(["desktop", "tablet", "phone"]);
export type DeviceFormFactor = z.infer<typeof deviceFormFactorSchema>;

export interface ControlDimensions {
	/** Primary action button (Save, Print, Pay, Complete visit) */
	readonly primaryActionMinHeightPx: number;
	/** Standard form button / text input / select height */
	readonly standardMinHeightPx: number;
	/** Dense secondary chip / tab / pill height */
	readonly denseMinHeightPx: number;
	/** Minimum interactive hit target size */
	readonly touchTargetMinPx: number;
	/** Recommended primary typography font size */
	readonly fontSizePx: number;
}

/**
 * Dense clinical desktop ergonomics for mouse & keyboard workstations (IDENT / StomX density).
 * Prevents mobile 48px giant buttons from polluting desktop screens!
 */
export const DESKTOP_FINE_ERGONOMICS: ControlDimensions = {
	primaryActionMinHeightPx: 36,
	standardMinHeightPx: 32,
	denseMinHeightPx: 28,
	touchTargetMinPx: 28,
	fontSizePx: 13,
} as const;

/**
 * Touch-first tablet ergonomics at dental chairside / operatory monoblock.
 * Meets WCAG 2.5.8 and medical glove requirements (44–48px hit targets).
 */
export const TABLET_TOUCH_ERGONOMICS: ControlDimensions = {
	primaryActionMinHeightPx: 48,
	standardMinHeightPx: 44,
	denseMinHeightPx: 36,
	touchTargetMinPx: 44,
	fontSizePx: 14,
} as const;

/**
 * Mobile smartphone ergonomics (patient portal, courier, doctor pocket view).
 */
export const PHONE_TOUCH_ERGONOMICS: ControlDimensions = {
	primaryActionMinHeightPx: 52,
	standardMinHeightPx: 48,
	denseMinHeightPx: 40,
	touchTargetMinPx: 48,
	fontSizePx: 15,
} as const;

// ============================================================================
// 2. HARDWARE CAPABILITIES MATRIX
// ============================================================================

export interface PlatformCapabilitiesMatrix {
	/** Direct silent ESC/POS thermal printing without OS print dialog */
	readonly canSilentPrintThermal: boolean;
	/** Direct TCP/IP socket printing to ATOL / Shtrikh-M fiscal registrars (54-FZ) */
	readonly canDirectFiscalKktTcp: boolean;
	/** Standard A4 print with @media print CSS styling */
	readonly canPrintA4: boolean;
	/** Direct TWAIN USB dental radiograph sensor capture */
	readonly canDirectTwainVisiograph: boolean;
	/** High-resolution camera photo capture for Form 043/u photo protocol */
	readonly canCameraCapturePhoto: boolean;
	/** Camera barcode / GS1 DataMatrix scanning for Honest Sign (Честный ЗНАК) */
	readonly canCameraScanBarcode: boolean;
	/** High-speed USB HID hardware barcode scanner interception (<35ms burst) */
	readonly canUsbHidScanner: boolean;
	/** Native biometric authentication (Fingerprint / Face ID) */
	readonly canNativeBiometrics: boolean;
	/** Persistent offline storage (IndexedDB / SQLite / LocalStorage) */
	readonly canOfflineStorage: boolean;
	/** Hardware global keyboard shortcuts without browser interception (F1–F12, Ctrl+S) */
	readonly canHardwareHotkeys: boolean;
}

// ============================================================================
// 3. UNIFIED PRINTING CONTRACT
// ============================================================================

export const printJobTypeSchema = z.enum([
	"a4_document",
	"fiscal_receipt",
	"thermal_receipt_escpos",
	"sterilization_label_sanpin",
]);
export type PrintJobType = z.infer<typeof printJobTypeSchema>;

export interface UniversalPrintJobPayload {
	readonly type: PrintJobType;
	readonly title?: string | undefined;
	/** HTML representation for A4 or browser printing */
	readonly html?: string | undefined;
	/** Plain text or raw ESC/POS commands */
	readonly rawText?: string | undefined;
	/** Base64-encoded raw ESC/POS / TSPL / ZPL binary */
	readonly rawBase64?: string | undefined;
	/** Paper width: 58mm or 80mm for thermal rolls */
	readonly paperWidthMm?: 58 | 80 | undefined;
	/** Number of copies to print */
	readonly copies?: number | undefined;
	/** Target printer name in OS print queue */
	readonly printerName?: string | undefined;
	/** Silent print without user confirmation dialog (Desktop EXE) */
	readonly silent?: boolean | undefined;
	/** Direct fiscal KKT connection parameters */
	readonly kktConnection?: {
		readonly host: string;
		readonly port: number;
		readonly protocol: "atol" | "shtrih" | "escpos";
		readonly payloadJson: string;
	} | undefined;
}

export interface UniversalPrintResultContract {
	readonly success: boolean;
	readonly methodUsed: "desktop_silent" | "mobile_bluetooth" | "browser_print" | "queued_offline";
	readonly printedAt: string;
	readonly printerName?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly fiscalDocNum?: string | undefined;
	readonly kktSerialNumber?: string | undefined;
	readonly error?: string | undefined;
}

// ============================================================================
// 4. UNIFIED NETWORK CONNECTIVITY CONTRACT
// ============================================================================

export const networkConnectivityModeSchema = z.enum([
	"cloud_online",
	"lan_online",
	"offline",
]);
export type NetworkConnectivityMode = z.infer<typeof networkConnectivityModeSchema>;

export interface PlatformNetworkStatus {
	readonly mode: NetworkConnectivityMode;
	readonly isOnline: boolean;
	readonly isLan: boolean;
	readonly rttMs: number | null;
	readonly lastCheckedAt: string;
	readonly labelRu: string;
	readonly descriptionRu: string;
}

// ============================================================================
// 5. UNIFIED OFFLINE STORAGE & MUTATION BUFFER CONTRACT
// ============================================================================

export interface OfflineDraftRecord {
	readonly key: string;
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly payloadJson: string;
	readonly updatedAt: string;
	readonly version: number;
}

export interface OfflineMutationQueueRecord {
	readonly id: string;
	readonly organizationId: string;
	readonly entityType: string;
	readonly entityId: string;
	readonly action: "create" | "update" | "delete";
	readonly payloadJson: string;
	readonly createdAt: string;
	readonly synced: boolean;
	readonly retryAttempts: number;
	readonly lastError?: string | undefined;
}

export interface UnifiedStorageEngineContract {
	/** Save or update debounced autosave draft (Mandate 8e) */
	saveDraft(draft: OfflineDraftRecord): Promise<boolean>;
	/** Retrieve cached draft by key */
	getDraft(key: string): Promise<OfflineDraftRecord | null>;
	/** Remove cached draft after successful visit closure */
	removeDraft(key: string): Promise<boolean>;
	/** Enqueue offline mutation when internet connection drops */
	enqueueMutation(mutation: Omit<OfflineMutationQueueRecord, "id" | "createdAt" | "synced" | "retryAttempts">): Promise<OfflineMutationQueueRecord>;
	/** List pending un-synced mutations */
	getPendingMutations(): Promise<OfflineMutationQueueRecord[]>;
	/** Mark mutation as synced after backend response */
	markMutationSynced(mutationId: string): Promise<boolean>;
	/** Storage engine health & capacity */
	getStorageStatus(): Promise<{ engine: "indexeddb" | "sqlite" | "localstorage"; isAvailable: boolean; pendingCount: number }>;
}

// ============================================================================
// 6. CHAIRSIDE CAMERA CAPTURE CONTRACT (Form 043/u Photo Protocol)
// ============================================================================

export interface ChairsidePhotoOptions {
	/** Target resolution: 1080p for fast preview, 4K for macro tooth inspection */
	readonly resolution?: "standard" | "high" | "macro";
	/** Camera facing direction */
	readonly facingMode?: "environment" | "user";
	/** Prefer native camera activity over web browser capture */
	readonly preferNativeCamera?: boolean;
	/** Tooth number according to FDI (11..48) */
	readonly toothCode?: string | undefined;
	/** Clinical photo protocol view category */
	readonly viewCategory?: "portrait" | "occlusion" | "upper_arch" | "lower_arch" | "intraoral_macro" | "xray_film_scan";
}

export interface ChairsidePhotoResult {
	readonly success: boolean;
	readonly dataUrl?: string | undefined;
	readonly mimeType?: string | undefined;
	readonly widthPx?: number | undefined;
	readonly heightPx?: number | undefined;
	readonly capturedAt: string;
	readonly toothCode?: string | undefined;
	readonly viewCategory?: string | undefined;
	readonly error?: string | undefined;
}

// ============================================================================
// 7. DOCTOR CLINICAL HOTKEYS MAP (Mandates 8c, 8e, 8n)
// ============================================================================

export interface DoctorHotkeyDefinition {
	readonly key: string;
	readonly code: string;
	readonly labelRu: string;
	readonly actionDescription: string;
	readonly preventsBrowserDefault: boolean;
}

export const DOCTOR_HOTKEYS = {
	F1: {
		key: "F1",
		code: "F1",
		labelRu: "F1 — Справочник номенклатуры 804н",
		actionDescription: "Быстрый вызов подсказок и стандартов номенклатуры 804н",
		preventsBrowserDefault: true,
	},
	F2: {
		key: "F2",
		code: "F2",
		labelRu: "F2 — Поиск пациента",
		actionDescription: "Фокус в глобальный Омнибар поиска пациентов",
		preventsBrowserDefault: true,
	},
	CTRL_K: {
		key: "k",
		code: "KeyK",
		labelRu: "Ctrl+K — Глобальный поиск пациента / Омнибар",
		actionDescription: "Мгновенный поиск пациента по телефону или фамилии (Ctrl+K / ⌘K)",
		preventsBrowserDefault: true,
	},
	F3: {
		key: "F3",
		code: "F3",
		labelRu: "F3 — Новая запись",
		actionDescription: "Быстрое бронирование кресла / следующий пациент",
		preventsBrowserDefault: true,
	},
	F4: {
		key: "F4",
		code: "F4",
		labelRu: "F4 — Одонтограмма",
		actionDescription: "Быстрый переход к интерактивной зубной формуле (FDI 11..48)",
		preventsBrowserDefault: true,
	},
	F5: {
		key: "F5",
		code: "F5",
		labelRu: "F5 — Обновить расписание",
		actionDescription: "Мягкое обновление расписания без перезагрузки страницы и потери черновиков",
		preventsBrowserDefault: true,
	},
	F9: {
		key: "F9",
		code: "F9",
		labelRu: "F9 — Оплата и чек 54-ФЗ",
		actionDescription: "Быстрое открытие кассового окна оплаты без требования ИНН физлица",
		preventsBrowserDefault: true,
	},
	F11: {
		key: "F11",
		code: "F11",
		labelRu: "F11 — Полноэкранный режим / Киоск",
		actionDescription: "Переключение киоска стоматологического кресла без рамок ОС",
		preventsBrowserDefault: true,
	},
	F12: {
		key: "F12",
		code: "F12",
		labelRu: "F12 — Печать дневника 043/у",
		actionDescription: "Быстрая печать текущей медицинской карты или черновика",
		preventsBrowserDefault: true,
	},
	CTRL_S: {
		key: "s",
		code: "KeyS",
		labelRu: "Ctrl+S — Сохранить визит",
		actionDescription: "Мгновенное сохранение дневника визита (Autosave защита от потери данных)",
		preventsBrowserDefault: true,
	},
	ESCAPE: {
		key: "Escape",
		code: "Escape",
		labelRu: "Esc — Закрыть окно",
		actionDescription: "Закрытие модального окна или боковой шторки (Анти-Матрёшка глубина 1)",
		preventsBrowserDefault: true,
	},
} as const satisfies Record<string, DoctorHotkeyDefinition>;

// ============================================================================
// 8. UNIFIED OMNI-PLATFORM RUNTIME ADAPTER CONTRACT
// ============================================================================

export interface OmniPlatformContract {
	/** Active runtime environment identifier */
	readonly environment: OmniEnvironment;
	/** Detected pointing device precision */
	readonly pointerType: PointerType;
	/** Device form factor */
	readonly formFactor: DeviceFormFactor;
	/** Hardware capabilities */
	readonly capabilities: PlatformCapabilitiesMatrix;
	/** Recommended control dimensions for current pointer */
	readonly controlDimensions: ControlDimensions;

	/** Unified direct print method */
	printDirect(payload: UniversalPrintJobPayload): Promise<UniversalPrintResultContract>;

	/** Unified network status detection */
	getNetworkStatus(): Promise<PlatformNetworkStatus>;

	/** Subscribe to network status transitions (online, lan, offline) */
	listenNetworkStatus(callback: (status: PlatformNetworkStatus) => void): () => void;

	/** Unified offline storage engine */
	getStorageEngine(): UnifiedStorageEngineContract;

	/** Chairside photo protocol capture */
	captureChairsidePhoto(options?: ChairsidePhotoOptions): Promise<ChairsidePhotoResult>;
}
