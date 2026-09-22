/**
 * DENTE CRM — Multi-Runtime Platform & Ergonomics Authority
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8c: Fine desktop pointer density (28–36px) vs mobile coarse touch (>=44x44px, >=48px for gloves).
 * - Mandate 8e: Doctor autonomy — hardware capability detection without blocking modals.
 * - Mandate 8n: Solo doctor & small clinic resilience across low-spec and varied runtimes.
 * - Mandate 8s: Single source of authority for runtime and platform state.
 *
 * Provides instant, zero-blocking detection across all 4 runtimes and hardware tiers.
 */

import {
	detectAppRuntimeKind,
	getRuntimeRoutingConfig,
	type AppRuntimeKind,
	type RuntimeRoutingConfig,
} from "./runtimeRouter.js";
import {
	isLowSpecDevice,
	getDiskBenchmarkResult,
	getDeviceCapabilities,
	type DeviceCapabilities,
} from "./lowSpecHddOptimizer.js";

export type OperatingSystem = "windows" | "macos" | "linux" | "android" | "ios" | "unknown";
export type FormFactor = "desktop" | "tablet" | "phone";
export type PointerCategory = "fine" | "coarse";

export interface SafeAreaInsets {
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly left: number;
}

export interface PlatformCapabilities {
	readonly runtime: AppRuntimeKind;
	readonly os: OperatingSystem;
	readonly formFactor: FormFactor;
	readonly pointer: PointerCategory;
	readonly isLowSpec: boolean;
	readonly isSlowHdd: boolean;
	readonly hasIndexedDb: boolean;
	readonly hasLocalStorage: boolean;
	readonly hasDirectFileSystem: boolean;
	readonly hasSqlite: boolean;
	readonly twainVisiographSupported: boolean;
	readonly fiscalKktDirectSupported: boolean;
	readonly cameraBarcodeScanSupported: boolean;
	readonly isOnline: boolean;
}

let mockPlatformCapabilities: Partial<PlatformCapabilities> | null = null;

/**
 * Sets mock platform capabilities for testing or simulation.
 */
export function setMockPlatform(mock: Partial<PlatformCapabilities> | null): void {
	mockPlatformCapabilities = mock;
}

/**
 * Returns current execution runtime among the 4 supported environments.
 */
export function getAppRuntime(): AppRuntimeKind {
	if (mockPlatformCapabilities?.runtime) {
		return mockPlatformCapabilities.runtime;
	}
	return detectAppRuntimeKind();
}

export function isWebRuntimeActive(): boolean {
	return getAppRuntime() === "web_browser";
}

export function isDesktopRuntimeActive(): boolean {
	return getAppRuntime() === "desktop_exe";
}

export function isAndroidRuntimeActive(): boolean {
	return getAppRuntime() === "android_apk";
}

export function isPwaRuntimeActive(): boolean {
	return getAppRuntime() === "pwa_standalone";
}

/**
 * Detects the client operating system from navigator userAgent/platform.
 */
export function detectOperatingSystem(): OperatingSystem {
	if (mockPlatformCapabilities?.os) {
		return mockPlatformCapabilities.os;
	}

	if (typeof navigator === "undefined") {
		return "unknown";
	}

	const ua = navigator.userAgent || "";
	const platform = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || "";

	if (/Android/i.test(ua)) return "android";
	if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
	if (/Win/i.test(platform) || /Windows/i.test(ua)) return "windows";
	if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return "macos";
	if (/Linux/i.test(platform) || /Linux/i.test(ua)) return "linux";

	return "unknown";
}

/**
 * Detects device pointer precision (fine mouse/trackpad vs coarse touch).
 */
export function detectPointerCategory(): PointerCategory {
	if (mockPlatformCapabilities?.pointer) {
		return mockPlatformCapabilities.pointer;
	}

	if (typeof window !== "undefined" && window.matchMedia) {
		if (window.matchMedia("(pointer: fine)").matches) {
			return "fine";
		}
		if (window.matchMedia("(pointer: coarse)").matches) {
			return "coarse";
		}
	}

	// Fallback based on touch points
	if (typeof navigator !== "undefined" && (navigator.maxTouchPoints > 0 || (navigator as unknown as { msMaxTouchPoints?: number }).msMaxTouchPoints! > 0)) {
		return "coarse";
	}

	return "fine";
}

/**
 * Detects hardware form factor (desktop vs tablet vs phone).
 */
export function detectFormFactor(): FormFactor {
	if (mockPlatformCapabilities?.formFactor) {
		return mockPlatformCapabilities.formFactor;
	}

	if (typeof window === "undefined") {
		return "desktop";
	}

	const width = window.innerWidth || (typeof screen !== "undefined" ? screen.width : 1024);
	const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

	if ((width >= 768 && width <= 1024) || /iPad|Tablet/i.test(ua)) {
		return "tablet";
	}

	if (width < 768 || /Mobile|Android.*Mobile|iPhone/i.test(ua)) {
		return "phone";
	}

	return "desktop";
}

/**
 * Returns safe area insets (for mobile notches, Android gesture navigation, PWA titlebars).
 */
export function getSafeAreaInsets(): SafeAreaInsets {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return { top: 0, right: 0, bottom: 0, left: 0 };
	}

	const computed = getComputedStyle(document.documentElement);
	const parsePx = (prop: string): number => {
		const val = computed.getPropertyValue(prop).trim();
		const match = val.match(/^(\d+(?:\.\d+)?)/);
		return match && match[1] ? Number.parseFloat(match[1]) : 0;
	};

	return {
		top: parsePx("--sat") || parsePx("safe-area-inset-top") || 0,
		right: parsePx("--sar") || parsePx("safe-area-inset-right") || 0,
		bottom: parsePx("--sab") || parsePx("safe-area-inset-bottom") || 0,
		left: parsePx("--sal") || parsePx("safe-area-inset-left") || 0,
	};
}

/**
 * Checks if network is currently connected.
 */
export function isNetworkOnline(): boolean {
	if (mockPlatformCapabilities?.isOnline !== undefined) {
		return mockPlatformCapabilities.isOnline;
	}

	if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
		return navigator.onLine;
	}

	return true;
}

/**
 * Registers online/offline network transition listeners.
 */
export function onNetworkStatusChange(callback: (online: boolean) => void): () => void {
	if (typeof window === "undefined") {
		return () => {};
	}

	const handleOnline = () => callback(true);
	const handleOffline = () => callback(false);

	window.addEventListener("online", handleOnline);
	window.addEventListener("offline", handleOffline);

	return () => {
		window.removeEventListener("online", handleOnline);
		window.removeEventListener("offline", handleOffline);
	};
}

/**
 * Checks whether device is in low-spec mode (5400 RPM HDD, <=4 cores, <=4GB RAM).
 */
export function isLowSpecMachine(): boolean {
	if (mockPlatformCapabilities?.isLowSpec !== undefined) {
		return mockPlatformCapabilities.isLowSpec;
	}
	return isLowSpecDevice();
}

/**
 * Checks whether storage disk is slow (mechanical HDD 5400 RPM).
 */
export function isSlowHddDetected(): boolean {
	if (mockPlatformCapabilities?.isSlowHdd !== undefined) {
		return mockPlatformCapabilities.isSlowHdd;
	}
	const benchmark = getDiskBenchmarkResult();
	return benchmark?.isSlowDisk ?? isLowSpecDevice();
}

/**
 * Returns complete platform capabilities snapshot for runtime routing and UI layout.
 */
export function getPlatformCapabilities(): PlatformCapabilities {
	if (mockPlatformCapabilities) {
		const defaultCfg = getRuntimeRoutingConfig(mockPlatformCapabilities.runtime ?? "web_browser");
		return {
			runtime: mockPlatformCapabilities.runtime ?? "web_browser",
			os: mockPlatformCapabilities.os ?? "unknown",
			formFactor: mockPlatformCapabilities.formFactor ?? "desktop",
			pointer: mockPlatformCapabilities.pointer ?? "fine",
			isLowSpec: mockPlatformCapabilities.isLowSpec ?? false,
			isSlowHdd: mockPlatformCapabilities.isSlowHdd ?? false,
			hasIndexedDb: mockPlatformCapabilities.hasIndexedDb ?? true,
			hasLocalStorage: mockPlatformCapabilities.hasLocalStorage ?? true,
			hasDirectFileSystem: mockPlatformCapabilities.hasDirectFileSystem ?? defaultCfg.database.supportsDirectFileSystem,
			hasSqlite: mockPlatformCapabilities.hasSqlite ?? (defaultCfg.database.engine.includes("sqlite")),
			twainVisiographSupported: mockPlatformCapabilities.twainVisiographSupported ?? defaultCfg.hardware.twainVisiographSupported,
			fiscalKktDirectSupported: mockPlatformCapabilities.fiscalKktDirectSupported ?? defaultCfg.hardware.fiscalKktDirectTcp,
			cameraBarcodeScanSupported: mockPlatformCapabilities.cameraBarcodeScanSupported ?? defaultCfg.hardware.cameraBarcodeScan,
			isOnline: mockPlatformCapabilities.isOnline ?? isNetworkOnline(),
		};
	}

	const runtime = getAppRuntime();
	const routing = getRuntimeRoutingConfig(runtime);
	const caps: DeviceCapabilities = getDeviceCapabilities();

	const hasIdb = typeof indexedDB !== "undefined";
	const hasLs = typeof localStorage !== "undefined";

	return {
		runtime,
		os: detectOperatingSystem(),
		formFactor: detectFormFactor(),
		pointer: detectPointerCategory(),
		isLowSpec: caps.isLowSpec,
		isSlowHdd: caps.isSlowHdd ?? isSlowHddDetected(),
		hasIndexedDb: hasIdb,
		hasLocalStorage: hasLs,
		hasDirectFileSystem: routing.database.supportsDirectFileSystem,
		hasSqlite: routing.database.engine.includes("sqlite"),
		twainVisiographSupported: routing.hardware.twainVisiographSupported,
		fiscalKktDirectSupported: routing.hardware.fiscalKktDirectTcp || routing.hardware.fiscalKktDirectSerial,
		cameraBarcodeScanSupported: routing.hardware.cameraBarcodeScan,
		isOnline: isNetworkOnline(),
	};
}
