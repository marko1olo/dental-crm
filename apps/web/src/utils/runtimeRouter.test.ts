/**
 * runtimeRouter.test.ts — Comprehensive Vitest suite for 4-runtime routing,
 * database path resolution, adaptive cache sizing, and hardware dispatching.
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8c: Low-spec HDD & hardware tier adaptation.
 * - Mandate 8e: Doctor autonomy — non-blocking fallbacks for TWAIN/54-FZ on web/mobile.
 * - Mandate 8n: Solo doctor & small clinic resilience across desktop, android, pwa, and web.
 * - Mandate 8s: Single source of authority for runtime detection and storage paths.
 */

import { describe, it, expect, afterEach } from "vitest";
import {
	detectAppRuntimeKind,
	getRuntimeRoutingConfig,
	routeDatabasePath,
	routeVisiographAcquisition,
	routeFiscalReceiptPrint,
	setMockAppRuntimeKind,
	isDesktopRuntime,
	isAndroidRuntime,
	isPwaRuntime,
	isWebRuntime,
	type AppRuntimeKind,
	type DispatchFiscalReceiptParams,
} from "./runtimeRouter.js";
import { setForcedLowSpecMode } from "./lowSpecHddOptimizer.js";

describe("Universal 4-Runtime & Storage Engine Router Suite", () => {
	afterEach(() => {
		setMockAppRuntimeKind(null);
		setForcedLowSpecMode(null);
	});

	it("1. Correctly detects and identifies all 4 runtimes", () => {
		const runtimes: AppRuntimeKind[] = ["desktop_exe", "android_apk", "pwa_standalone", "web_browser"];

		for (const r of runtimes) {
			setMockAppRuntimeKind(r);
			expect(detectAppRuntimeKind()).toBe(r);

			expect(isDesktopRuntime()).toBe(r === "desktop_exe");
			expect(isAndroidRuntime()).toBe(r === "android_apk");
			expect(isPwaRuntime()).toBe(r === "pwa_standalone");
			expect(isWebRuntime()).toBe(r === "web_browser");
		}
	});

	it("2. Desktop (.exe) runtime configuration: SQLite, 100MB cache, direct TWAIN & KKT", () => {
		setMockAppRuntimeKind("desktop_exe");
		setForcedLowSpecMode(false);

		const cfg = getRuntimeRoutingConfig();
		expect(cfg.runtime).toBe("desktop_exe");
		expect(cfg.database.engine).toBe("native_fs_sqlite");
		expect(cfg.database.supportsDirectFileSystem).toBe(true);
		expect(cfg.database.supportsWalMode).toBe(true);
		expect(cfg.cache.maxDiskStorageMb).toBe(100);
		expect(cfg.cache.maxRamEntries).toBe(1500);
		expect(cfg.cache.preloadStrategy).toBe("eager_disk");

		expect(cfg.hardware.twainVisiographSupported).toBe(true);
		expect(cfg.hardware.fiscalKktDirectTcp).toBe(true);
		expect(cfg.hardware.fiscalKktDirectSerial).toBe(true);
		expect(cfg.hardware.silentPrintSupported).toBe(true);
		expect(cfg.hardware.cameraBarcodeScan).toBe(false);
	});

	it("3. Android APK runtime configuration: Capacitor SQLite, 35MB cache, camera scan", () => {
		setMockAppRuntimeKind("android_apk");
		setForcedLowSpecMode(false);

		const cfg = getRuntimeRoutingConfig();
		expect(cfg.runtime).toBe("android_apk");
		expect(cfg.database.engine).toBe("sqlite_capacitor");
		expect(cfg.database.supportsDirectFileSystem).toBe(false);
		expect(cfg.cache.maxDiskStorageMb).toBe(35);
		expect(cfg.hardware.twainVisiographSupported).toBe(false);
		expect(cfg.hardware.cameraBarcodeScan).toBe(true);
		expect(cfg.hardware.silentPrintSupported).toBe(false);
	});

	it("4. PWA Standalone runtime configuration: IndexedDB PWA, 50MB cache", () => {
		setMockAppRuntimeKind("pwa_standalone");
		setForcedLowSpecMode(false);

		const cfg = getRuntimeRoutingConfig();
		expect(cfg.runtime).toBe("pwa_standalone");
		expect(cfg.database.engine).toBe("indexed_db_pwa");
		expect(cfg.cache.maxDiskStorageMb).toBe(50);
		expect(cfg.cache.maxRamEntries).toBe(1000);
		expect(cfg.hardware.twainVisiographSupported).toBe(false);
		expect(cfg.hardware.cameraBarcodeScan).toBe(true);
		expect(cfg.hardware.usbHidBarcodeScan).toBe(true);
	});

	it("5. Web Browser runtime configuration: IndexedDB outbox, 35MB cache, on-demand preload", () => {
		setMockAppRuntimeKind("web_browser");
		setForcedLowSpecMode(false);

		const cfg = getRuntimeRoutingConfig();
		expect(cfg.runtime).toBe("web_browser");
		expect(cfg.database.engine).toBe("indexed_db");
		expect(cfg.cache.maxDiskStorageMb).toBe(35);
		expect(cfg.cache.maxRamEntries).toBe(800);
		expect(cfg.cache.preloadStrategy).toBe("on_demand");
		expect(cfg.hardware.twainVisiographSupported).toBe(false);
		expect(cfg.hardware.cameraBarcodeScan).toBe(false);
		expect(cfg.hardware.usbHidBarcodeScan).toBe(true);
	});

	it("6. Low-Spec HDD / Weak CPU adaptively reduces RAM cache entries and throttles prefetch", () => {
		setForcedLowSpecMode(true);

		// Desktop in low-spec mode (old laptop with 5400 RPM HDD)
		const desktopLow = getRuntimeRoutingConfig("desktop_exe");
		expect(desktopLow.cache.maxRamEntries).toBe(500);
		expect(desktopLow.cache.preloadStrategy).toBe("background_idle");
		expect(desktopLow.database.offlineSyncIntervalMs).toBe(8000);

		// Web in low-spec mode
		const webLow = getRuntimeRoutingConfig("web_browser");
		expect(webLow.cache.maxRamEntries).toBe(300);
		expect(webLow.database.offlineSyncIntervalMs).toBe(15000);
	});

	it("7. routeDatabasePath generates authoritative platform-specific storage locations", () => {
		const desktopPath = routeDatabasePath("catalog_804n", "desktop_exe");
		expect(desktopPath).toBe("%APPDATA%/DenteCRM/data/catalog_804n.db");

		const androidPath = routeDatabasePath("catalog_804n", "android_apk");
		expect(androidPath).toBe("/data/data/com.dente.crm/databases/catalog_804n.db");

		const pwaPath = routeDatabasePath("catalog_804n", "pwa_standalone");
		expect(pwaPath).toBe("idb://dente_pwa_offline/catalog_804n");

		const webPath = routeDatabasePath("catalog_804n", "web_browser");
		expect(webPath).toBe("idb://dente_web_outbox/catalog_804n");
	});

	it("8. routeVisiographAcquisition provides non-blocking guidance on Web/Mobile/PWA (Mandate 8e)", async () => {
		const webResult = await routeVisiographAcquisition(undefined, "web_browser");
		expect(webResult.success).toBe(false);
		expect(webResult.errorCategory).toBe("desktop_required");
		expect(webResult.userFriendlyMessageRu).toContain("DENTE Desktop");

		const mobileResult = await routeVisiographAcquisition(undefined, "android_apk");
		expect(mobileResult.success).toBe(false);
		expect(mobileResult.errorCategory).toBe("desktop_required");
	});

	it("9. routeFiscalReceiptPrint buffers receipt on non-desktop without blocking cashier (Mandate 8e)", async () => {
		const testPayload: DispatchFiscalReceiptParams = {
			payload: {
				items: [
					{ name: "Консультация стоматолога первичная", priceRub: 1500, quantity: 1 },
					{ name: "Прицельный снимок", priceRub: 500, quantity: 1 },
				],
				totalRub: 2000,
				cashierName: "Иванова А.А.",
				paymentType: "cash",
				patientEmailOrPhone: "+79991234567",
			},
		};

		const result = await routeFiscalReceiptPrint(testPayload, "web_browser");
		expect(result.success).toBe(true);
		expect(result.bufferedOffline).toBe(true);
		expect(result.userFriendlyMessageRu).toContain("очередь печати");
	});
});
