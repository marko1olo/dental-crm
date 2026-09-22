/**
 * runtimeRouter.test.ts — Comprehensive test suite for 4-runtime routing,
 * database path resolution, adaptive cache sizing, and hardware dispatching.
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8c: Low-spec HDD & hardware tier adaptation.
 * - Mandate 8e: Doctor autonomy — non-blocking fallbacks for TWAIN/54-FZ on web/mobile.
 * - Mandate 8n: Solo doctor & small clinic resilience across desktop, android, pwa, and web.
 * - Mandate 8s: Single source of authority for runtime detection and storage paths.
 */

import assert from "node:assert";
import test from "node:test";
import {
	detectAppRuntimeKind,
	getRuntimeRoutingConfig,
	routeDatabasePath,
	routeVisiographAcquisition,
	routeFiscalReceiptPrint,
	routeBarcodeScan,
	setMockAppRuntimeKind,
	isDesktopRuntime,
	isAndroidRuntime,
	isPwaRuntime,
	isWebRuntime,
	type AppRuntimeKind,
} from "../native/runtimeRouter.js";
import { setForcedLowSpecMode } from "../utils/lowSpecHddOptimizer.js";

test("Universal 4-Runtime & Storage Engine Router Suite", async (t) => {
	t.afterEach(() => {
		setMockAppRuntimeKind(null);
		setForcedLowSpecMode(null);
	});

	await t.test("1. Correctly detects and identifies all 4 runtimes", () => {
		const runtimes: AppRuntimeKind[] = ["desktop_exe", "android_apk", "pwa_standalone", "web_browser"];

		for (const r of runtimes) {
			setMockAppRuntimeKind(r);
			assert.strictEqual(detectAppRuntimeKind(), r, `Must detect ${r}`);

			assert.strictEqual(isDesktopRuntime(), r === "desktop_exe");
			assert.strictEqual(isAndroidRuntime(), r === "android_apk");
			assert.strictEqual(isPwaRuntime(), r === "pwa_standalone");
			assert.strictEqual(isWebRuntime(), r === "web_browser");
		}
	});

	await t.test("2. Desktop (.exe) runtime configuration: SQLite, 100MB cache, direct TWAIN & KKT", () => {
		setMockAppRuntimeKind("desktop_exe");
		setForcedLowSpecMode(false);

		const cfg = getRuntimeRoutingConfig();
		assert.strictEqual(cfg.runtime, "desktop_exe");
		assert.strictEqual(cfg.database.engine, "native_fs_sqlite");
		assert.strictEqual(cfg.database.supportsDirectFileSystem, true);
		assert.strictEqual(cfg.database.supportsWalMode, true);
		assert.strictEqual(cfg.cache.maxDiskStorageMb, 100);
		assert.strictEqual(cfg.cache.maxRamEntries, 1500);
		assert.strictEqual(cfg.cache.preloadStrategy, "eager_disk");

		assert.strictEqual(cfg.hardware.twainVisiographSupported, true);
		assert.strictEqual(cfg.hardware.fiscalKktDirectTcp, true);
		assert.strictEqual(cfg.hardware.fiscalKktDirectSerial, true);
		assert.strictEqual(cfg.hardware.silentPrintSupported, true);
		assert.strictEqual(cfg.hardware.cameraBarcodeScan, false);
	});

	await t.test("3. Android APK runtime configuration: Capacitor SQLite, 35MB cache, camera scan", () => {
		setMockAppRuntimeKind("android_apk");
		setForcedLowSpecMode(false);

		const cfg = getRuntimeRoutingConfig();
		assert.strictEqual(cfg.runtime, "android_apk");
		assert.strictEqual(cfg.database.engine, "sqlite_capacitor");
		assert.strictEqual(cfg.database.supportsDirectFileSystem, false);
		assert.strictEqual(cfg.cache.maxDiskStorageMb, 35);
		assert.strictEqual(cfg.hardware.twainVisiographSupported, false);
		assert.strictEqual(cfg.hardware.cameraBarcodeScan, true);
		assert.strictEqual(cfg.hardware.silentPrintSupported, false);
	});

	await t.test("4. PWA Standalone runtime configuration: IndexedDB PWA, 50MB cache", () => {
		setMockAppRuntimeKind("pwa_standalone");
		setForcedLowSpecMode(false);

		const cfg = getRuntimeRoutingConfig();
		assert.strictEqual(cfg.runtime, "pwa_standalone");
		assert.strictEqual(cfg.database.engine, "indexed_db_pwa");
		assert.strictEqual(cfg.cache.maxDiskStorageMb, 50);
		assert.strictEqual(cfg.cache.maxRamEntries, 1000);
		assert.strictEqual(cfg.hardware.twainVisiographSupported, false);
		assert.strictEqual(cfg.hardware.cameraBarcodeScan, true);
		assert.strictEqual(cfg.hardware.usbHidBarcodeScan, true);
	});

	await t.test("5. Web Browser runtime configuration: IndexedDB outbox, 35MB cache, on-demand preload", () => {
		setMockAppRuntimeKind("web_browser");
		setForcedLowSpecMode(false);

		const cfg = getRuntimeRoutingConfig();
		assert.strictEqual(cfg.runtime, "web_browser");
		assert.strictEqual(cfg.database.engine, "indexed_db");
		assert.strictEqual(cfg.cache.maxDiskStorageMb, 35);
		assert.strictEqual(cfg.cache.maxRamEntries, 800);
		assert.strictEqual(cfg.cache.preloadStrategy, "on_demand");
		assert.strictEqual(cfg.hardware.twainVisiographSupported, false);
		assert.strictEqual(cfg.hardware.cameraBarcodeScan, false);
		assert.strictEqual(cfg.hardware.usbHidBarcodeScan, true);
	});

	await t.test("6. Low-Spec HDD / Weak CPU adaptively reduces RAM cache entries and throttles prefetch", () => {
		setForcedLowSpecMode(true);

		// Desktop in low-spec mode (old laptop with 5400 RPM HDD)
		const desktopLow = getRuntimeRoutingConfig("desktop_exe");
		assert.strictEqual(desktopLow.cache.maxRamEntries, 500, "Must throttle RAM entries on low-spec desktop");
		assert.strictEqual(desktopLow.cache.preloadStrategy, "background_idle", "Must avoid eager disk thrashing");
		assert.strictEqual(desktopLow.database.offlineSyncIntervalMs, 8000);

		// Web in low-spec mode
		const webLow = getRuntimeRoutingConfig("web_browser");
		assert.strictEqual(webLow.cache.maxRamEntries, 300);
		assert.strictEqual(webLow.database.offlineSyncIntervalMs, 15000);
	});

	await t.test("7. routeDatabasePath generates authoritative platform-specific storage locations", () => {
		const desktopPath = routeDatabasePath("catalog_804n", "desktop_exe");
		assert.strictEqual(desktopPath, "%APPDATA%/DenteCRM/data/catalog_804n.db");

		const androidPath = routeDatabasePath("catalog_804n", "android_apk");
		assert.strictEqual(androidPath, "/data/data/com.dente.crm/databases/catalog_804n.db");

		const pwaPath = routeDatabasePath("catalog_804n", "pwa_standalone");
		assert.strictEqual(pwaPath, "idb://dente_pwa_offline/catalog_804n");

		const webPath = routeDatabasePath("catalog_804n", "web_browser");
		assert.strictEqual(webPath, "idb://dente_web_outbox/catalog_804n");
	});

	await t.test("8. routeVisiographAcquisition provides non-blocking guidance on Web/Mobile/PWA (Mandate 8e)", async () => {
		// Non-desktop call
		const webResult = await routeVisiographAcquisition(undefined, "web_browser");
		assert.strictEqual(webResult.success, false);
		assert.strictEqual(webResult.errorCategory, "desktop_required");
		assert.ok(webResult.userFriendlyMessageRu.includes("DENTE Desktop"));

		const mobileResult = await routeVisiographAcquisition(undefined, "android_apk");
		assert.strictEqual(mobileResult.success, false);
		assert.strictEqual(mobileResult.errorCategory, "desktop_required");
	});

	await t.test("9. routeFiscalReceiptPrint buffers receipt on non-desktop without blocking cashier (Mandate 8e)", async () => {
		const testPayload = {
			payload: {
				items: [
					{ name: "Консультация стоматолога первичная", price: 1500, quantity: 1 },
					{ name: "Прицельный снимок", price: 500, quantity: 1 },
				],
				totalAmount: 2000,
				cashierName: "Иванова А.А.",
				clientPhone: "+79991234567",
			},
		};

		// Running on web / mobile / pwa should buffer offline instead of throwing error
		const result = await routeFiscalReceiptPrint(testPayload, "web_browser");
		assert.strictEqual(result.success, true);
		assert.strictEqual(result.bufferedOffline, true);
		assert.ok(result.userFriendlyMessageRu?.includes("очередь печати"));
	});
});
