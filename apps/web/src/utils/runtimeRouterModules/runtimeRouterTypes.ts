/**
 * DENTE CRM — Runtime Router Types (Layer 0)
 *
 * Route contracts, query parameters, modal states, and runtime platform descriptors.
 * Zero side-effects and zero external runtime dependencies.
 */

import type { DispatchFiscalReceiptParams } from "../../native/hardwareDispatcher.js";
import type { StaffRole } from "@dental/shared";
import type { AppView } from "../routeUtils.js";

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

export interface CbctStudioRouteParams {
	readonly isCbctStudio: boolean;
	readonly studyId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly mode?: string | undefined;
	readonly isDemo?: boolean | undefined;
}

export interface CephStudioRouteParams {
	readonly isCephStudio: boolean;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly imageUrl?: string | undefined;
	readonly mode?: string | undefined;
	readonly isDemo?: boolean | undefined;
	readonly demoMode?: boolean | undefined;
}

/**
 * Permitted application route tokens (#schedule, #patients, #emk, #documents, etc.)
 */
export type CanonicalAppRoute =
	| AppView
	| "emk";

export interface RuntimeRouteMatch {
	readonly route: AppView;
	readonly rawHash: string;
	readonly subPath?: string | undefined;
	readonly queryParams: Record<string, string>;
	readonly isAllowed: boolean;
	readonly userRole?: StaffRole | undefined;
	readonly fallbackRoute?: AppView | undefined;
}

export interface NavigationOptions {
	readonly replace?: boolean | undefined;
	readonly query?: Record<string, string | number | boolean | null | undefined> | undefined;
	readonly state?: unknown | undefined;
}

export type { DispatchFiscalReceiptParams };
