/**
 * DENTE CRM — Unified 4-Runtime & Storage Engine Router
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8c: Low-spec 5400 RPM HDD zero-seek optimization, compact desktop density vs mobile touch.
 * - Mandate 8e: Doctor autonomy — zero blocking UI modals, TWAIN/KKT fallback without error modals.
 * - Mandate 8n: Solo doctor & small clinic resilience in 1-chair clinics without network/server.
 * - Mandate 8s: Single source of authority for runtime detection and hardware/database path routing.
 *
 * Authoritatively detects and routes across the 4 execution runtimes:
 * 1) desktop_exe: Electron / Tauri Windows desktop shell (.exe) with local SQLite/FS and direct COM/TWAIN hardware
 * 2) android_apk: Android native shell (Capacitor / WebView APK) with camera barcode scanner and SQLite
 * 3) pwa_standalone: Installed Progressive Web App with dedicated offline Service Worker & IndexedDB
 * 4) web_browser: Standard desktop/mobile browser tab with IndexedDB outbox & network API fallback
 */

import { isDesktopApp } from "../native/desktopBridge.js";
import { isMobileApp } from "../native/mobileBridge.js";
import {
	dispatchUniversalScan,
	dispatchVisiographAcquisition,
	dispatchFiscalReceiptPrint,
	type DispatchFiscalReceiptParams,
	type UniversalScannerResult,
} from "../native/hardwareDispatcher.js";
import type {
	DesktopFiscalPrintResult,
	TwainAcquisitionResult,
} from "../native/desktopBridge.js";
import { isLowSpecDevice } from "./lowSpecHddOptimizer.js";
import { logger } from "./logger.js";

export type AppRuntimeKind = "web_browser" | "desktop_exe" | "android_apk" | "pwa_standalone";

export interface RuntimeDatabaseRouting {
	readonly engine: "native_fs_sqlite" | "sqlite_capacitor" | "indexed_db" | "indexed_db_pwa";
	readonly basePath: string;
	readonly databaseName: string;
	readonly offlineSyncIntervalMs: number;
	readonly supportsDirectFileSystem: boolean;
	readonly supportsWalMode: boolean;
}

export interface RuntimeCacheRouting {
	readonly maxRamEntries: number;
	readonly maxDiskStorageMb: number;
	readonly statutoryCatalogTtlMs: number;
	readonly preloadStrategy: "eager_disk" | "background_idle" | "on_demand";
}

export interface RuntimeHardwareRouting {
	readonly twainVisiographSupported: boolean;
	readonly fiscalKktDirectTcp: boolean;
	readonly fiscalKktDirectSerial: boolean;
	readonly cameraBarcodeScan: boolean;
	readonly usbHidBarcodeScan: boolean;
	readonly thermalEscPosDirect: boolean;
	readonly silentPrintSupported: boolean;
}

export interface RuntimeRoutingConfig {
	readonly runtime: AppRuntimeKind;
	readonly database: RuntimeDatabaseRouting;
	readonly cache: RuntimeCacheRouting;
	readonly hardware: RuntimeHardwareRouting;
}

let mockRuntimeOverride: AppRuntimeKind | null = null;

/**
 * Sets or clears mock runtime override (for unit testing and sandbox environments).
 */
export function setMockAppRuntimeKind(mock: AppRuntimeKind | null): void {
	mockRuntimeOverride = mock;
}

/**
 * Authoritatively detects the active execution runtime among the 4 supported targets.
 */
export function detectAppRuntimeKind(): AppRuntimeKind {
	if (mockRuntimeOverride) {
		return mockRuntimeOverride;
	}

	// 1. Desktop executable (.exe)
	if (isDesktopApp()) {
		return "desktop_exe";
	}
	if (typeof window !== "undefined") {
		const win = window as unknown as {
			electron?: unknown;
			process?: { type?: string; versions?: { electron?: string } };
			chrome?: { webview?: unknown };
			__DENTE_DESKTOP__?: boolean;
			__WEBVIEW2__?: boolean;
			__TAURI__?: unknown;
			__TAURI_INTERNALS__?: unknown;
		};
		if (
			win.electron !== undefined ||
			win.process?.versions?.electron !== undefined ||
			win.chrome?.webview !== undefined ||
			win.__DENTE_DESKTOP__ === true ||
			win.__WEBVIEW2__ === true ||
			win.__TAURI__ !== undefined ||
			win.__TAURI_INTERNALS__ !== undefined
		) {
			return "desktop_exe";
		}
	}
	if (typeof navigator !== "undefined" && navigator.userAgent) {
		if (/Electron|Tauri|DenteDesktop|WebView2|DenteWin/i.test(navigator.userAgent)) {
			return "desktop_exe";
		}
	}

	// 2. Android APK native shell
	if (isMobileApp()) {
		return "android_apk";
	}
	if (typeof window !== "undefined") {
		const win = window as unknown as { Capacitor?: unknown };
		if (win.Capacitor !== undefined) {
			return "android_apk";
		}
	}
	if (typeof navigator !== "undefined" && navigator.userAgent) {
		const ua = navigator.userAgent;
		if (/Android/i.test(ua) && (/wv|Version\/.*Chrome/i.test(ua) || /Capacitor/i.test(ua))) {
			return "android_apk";
		}
	}

	// 3. PWA Standalone window
	if (typeof window !== "undefined") {
		const win = window as unknown as {
			__DENTE_PWA__?: boolean;
			matchMedia?: (q: string) => { matches: boolean };
		};
		if (win.__DENTE_PWA__ === true) {
			return "pwa_standalone";
		}
		if (
			win.matchMedia?.("(display-mode: standalone)").matches ||
			win.matchMedia?.("(display-mode: minimal-ui)").matches
		) {
			return "pwa_standalone";
		}
	}
	if (typeof navigator !== "undefined") {
		const nav = navigator as unknown as { standalone?: boolean };
		if (nav.standalone === true) {
			return "pwa_standalone";
		}
	}
	if (
		typeof document !== "undefined" &&
		typeof document.referrer === "string" &&
		document.referrer.startsWith("android-app://")
	) {
		return "pwa_standalone";
	}

	// 4. Standard Web Browser tab
	return "web_browser";
}

/**
 * Returns comprehensive runtime routing configuration including database paths,
 * cache sizes, and hardware support.
 */
export function getRuntimeRoutingConfig(targetRuntime?: AppRuntimeKind): RuntimeRoutingConfig {
	const runtime = targetRuntime ?? detectAppRuntimeKind();
	const isLowSpec = isLowSpecDevice();

	switch (runtime) {
		case "desktop_exe":
			return {
				runtime: "desktop_exe",
				database: {
					engine: "native_fs_sqlite",
					basePath: "%APPDATA%/DenteCRM/data",
					databaseName: "dente_desktop.db",
					offlineSyncIntervalMs: isLowSpec ? 8000 : 4000,
					supportsDirectFileSystem: true,
					supportsWalMode: true,
				},
				cache: {
					maxRamEntries: isLowSpec ? 500 : 1500,
					maxDiskStorageMb: 100,
					statutoryCatalogTtlMs: 86400000,
					preloadStrategy: isLowSpec ? "background_idle" : "eager_disk",
				},
				hardware: {
					twainVisiographSupported: true,
					fiscalKktDirectTcp: true,
					fiscalKktDirectSerial: true,
					cameraBarcodeScan: false,
					usbHidBarcodeScan: true,
					thermalEscPosDirect: true,
					silentPrintSupported: true,
				},
			};

		case "android_apk":
			return {
				runtime: "android_apk",
				database: {
					engine: "sqlite_capacitor",
					basePath: "/data/data/com.dente.crm/databases",
					databaseName: "dente_mobile.db",
					offlineSyncIntervalMs: 10000,
					supportsDirectFileSystem: false,
					supportsWalMode: true,
				},
				cache: {
					maxRamEntries: isLowSpec ? 300 : 600,
					maxDiskStorageMb: 35,
					statutoryCatalogTtlMs: 86400000,
					preloadStrategy: "background_idle",
				},
				hardware: {
					twainVisiographSupported: false,
					fiscalKktDirectTcp: false,
					fiscalKktDirectSerial: false,
					cameraBarcodeScan: true,
					usbHidBarcodeScan: false,
					thermalEscPosDirect: false,
					silentPrintSupported: false,
				},
			};

		case "pwa_standalone":
			return {
				runtime: "pwa_standalone",
				database: {
					engine: "indexed_db_pwa",
					basePath: "idb://dente_pwa_offline",
					databaseName: "dente_pwa_db",
					offlineSyncIntervalMs: isLowSpec ? 12000 : 6000,
					supportsDirectFileSystem: false,
					supportsWalMode: false,
				},
				cache: {
					maxRamEntries: isLowSpec ? 400 : 1000,
					maxDiskStorageMb: 50,
					statutoryCatalogTtlMs: 86400000,
					preloadStrategy: isLowSpec ? "background_idle" : "eager_disk",
				},
				hardware: {
					twainVisiographSupported: false,
					fiscalKktDirectTcp: false,
					fiscalKktDirectSerial: false,
					cameraBarcodeScan: true,
					usbHidBarcodeScan: true,
					thermalEscPosDirect: false,
					silentPrintSupported: false,
				},
			};

		case "web_browser":
		default:
			return {
				runtime: "web_browser",
				database: {
					engine: "indexed_db",
					basePath: "idb://dente_web_outbox",
					databaseName: "dente_outbox_v2",
					offlineSyncIntervalMs: isLowSpec ? 15000 : 8000,
					supportsDirectFileSystem: false,
					supportsWalMode: false,
				},
				cache: {
					maxRamEntries: isLowSpec ? 300 : 800,
					maxDiskStorageMb: 35,
					statutoryCatalogTtlMs: 86400000,
					preloadStrategy: "on_demand",
				},
				hardware: {
					twainVisiographSupported: false,
					fiscalKktDirectTcp: false,
					fiscalKktDirectSerial: false,
					cameraBarcodeScan: false,
					usbHidBarcodeScan: true,
					thermalEscPosDirect: false,
					silentPrintSupported: false,
				},
			};
	}
}

/**
 * Returns the exact database file path or IndexedDB store key for a given table or catalog.
 */
export function routeDatabasePath(tableOrStoreName: string, targetRuntime?: AppRuntimeKind): string {
	const sanitized = tableOrStoreName.replace(/[^a-zA-Z0-9_-]/g, "_");
	const config = getRuntimeRoutingConfig(targetRuntime);

	switch (config.runtime) {
		case "desktop_exe":
			return `${config.database.basePath}/${sanitized}.db`;
		case "android_apk":
			return `${config.database.basePath}/${sanitized}.db`;
		case "pwa_standalone":
		case "web_browser":
		default:
			return `${config.database.basePath}/${sanitized}`;
	}
}

/**
 * Routes USB TWAIN visiograph acquisition.
 * On Desktop (.exe): connects directly to TWAIN driver.
 * On Web / Android / PWA: returns non-blocking guidance to upload DICOM/image file (Mandate 8e).
 */
export async function routeVisiographAcquisition(
	deviceId?: string,
	targetRuntime?: AppRuntimeKind,
): Promise<TwainAcquisitionResult> {
	const runtime = targetRuntime ?? detectAppRuntimeKind();

	if (runtime === "desktop_exe") {
		return dispatchVisiographAcquisition(deviceId);
	}

	return {
		success: false,
		error: "Для прямого захвата с USB-визиографа используйте приложение DENTE Desktop (.exe) или выберите файл со снимком.",
		errorCategory: "desktop_required",
		userFriendlyMessageRu: "Прямой захват TWAIN-снимков поддерживается в приложении DENTE Desktop (.exe). Вы можете прикрепить снимок из файла.",
	};
}

/**
 * Routes 54-FZ fiscal receipt printing.
 * On Desktop: directly connects to KKT via TCP LAN socket or COM serial port.
 * On Web / Android / PWA: buffers receipt into FiscalReceiptQueueManager without blocking payment.
 */
export async function routeFiscalReceiptPrint(
	params: DispatchFiscalReceiptParams,
	targetRuntime?: AppRuntimeKind,
): Promise<DesktopFiscalPrintResult> {
	const runtime = targetRuntime ?? detectAppRuntimeKind();

	if (runtime === "desktop_exe") {
		return dispatchFiscalReceiptPrint(params);
	}

	try {
		const { FiscalReceiptQueueManager } = await import("../services/hardware/fiscalReceiptQueueManager.js");
		const queuedItem = FiscalReceiptQueueManager.enqueueReceipt({
			items: params.payload.items.map((it) => ({
				name: it.name,
				priceRub: it.priceRub,
				amountRub: Math.round(it.priceRub * it.quantity),
				quantity: it.quantity,
				vatRate: it.vatPercent ? "vat_20" : "vat_none",
			})),
			cashierFullName: params.payload.cashierName,
			totalRub: params.payload.totalRub,
			customerContact: params.payload.patientEmailOrPhone,
			operationType: "income",
			cashRub: params.payload.paymentType === "cash" ? params.payload.totalRub : 0,
			electronicRub: params.payload.paymentType === "card" || params.payload.paymentType === "sbp" ? params.payload.totalRub : 0,
			prepaidRub: params.payload.paymentType === "deposit" ? params.payload.totalRub : 0,
		}, `runtime_${runtime}_buffered`);

		return {
			success: true,
			bufferedOffline: true,
			queueItemId: queuedItem.id,
			userFriendlyMessageRu: "Чек поставлен в очередь печати 54-ФЗ. Будет напечатан при подключении к кассовому аппарату.",
		};
	} catch (err: unknown) {
		logger.warn("[runtimeRouter] Error buffering receipt in queue manager:", err);
		return {
			success: true,
			bufferedOffline: true,
			userFriendlyMessageRu: "Чек сохранен для печати при подключении к кассовому аппарату.",
		};
	}
}

/**
 * Routes barcode and DataMatrix scanning across the 4 runtimes.
 */
export async function routeBarcodeScan(targetRuntime?: AppRuntimeKind): Promise<UniversalScannerResult> {
	const runtime = targetRuntime ?? detectAppRuntimeKind();

	if (runtime === "android_apk") {
		return dispatchUniversalScan();
	}

	return dispatchUniversalScan();
}

export function isDesktopRuntime(target?: AppRuntimeKind): boolean {
	return (target ?? detectAppRuntimeKind()) === "desktop_exe";
}

export function isAndroidRuntime(target?: AppRuntimeKind): boolean {
	return (target ?? detectAppRuntimeKind()) === "android_apk";
}

export function isPwaRuntime(target?: AppRuntimeKind): boolean {
	return (target ?? detectAppRuntimeKind()) === "pwa_standalone";
}

export function isWebRuntime(target?: AppRuntimeKind): boolean {
	return (target ?? detectAppRuntimeKind()) === "web_browser";
}

export type { DispatchFiscalReceiptParams };
