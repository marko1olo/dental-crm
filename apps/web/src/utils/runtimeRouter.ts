/**
 * DENTE CRM — Unified 4-Runtime & Storage Engine Router (Layer 5 Facade)
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

// Layer 0 Contracts & Types
export type {
	AppRuntimeKind,
	RuntimeDatabaseRouting,
	RuntimeCacheRouting,
	RuntimeHardwareRouting,
	RuntimeRoutingConfig,
	CbctStudioRouteParams,
	CephStudioRouteParams,
	CanonicalAppRoute,
	RuntimeRouteMatch,
	NavigationOptions,
	DispatchFiscalReceiptParams,
} from "./runtimeRouterModules/runtimeRouterTypes.js";

// Layer 1 Route Matcher & Parsers
export {
	validateRouteRoleAccess,
	normalizeRouteToken,
	matchRuntimeRoute,
	parseCbctStudioRoute,
	parseCephStudioRoute,
} from "./runtimeRouterModules/runtimeRouteMatcher.js";

// Layer 2 Navigation Actions & Popout Dispatchers
export {
	navigateTo,
	updateQueryParams,
	buildCbctStudioPopoutUrl,
	routeOpenCbctPopout,
	buildCephStudioPopoutUrl,
	routeOpenCephPopout,
} from "./runtimeRouterModules/runtimeNavigationActions.js";

// Layer 2 Hardware & Storage Routing
export {
	setMockAppRuntimeKind,
	detectAppRuntimeKind,
	getRuntimeRoutingConfig,
	routeDatabasePath,
	routeVisiographAcquisition,
	routeFiscalReceiptPrint,
	routeBarcodeScan,
	isDesktopRuntime,
	isAndroidRuntime,
	isPwaRuntime,
	isWebRuntime,
} from "./runtimeRouterModules/runtimeHardwareRouter.js";
