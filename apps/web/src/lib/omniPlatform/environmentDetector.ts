/**
 * DENTE CRM — Omni-Platform Environment Detectors (Layer 1)
 *
 * Provides runtime detection across Web Browser, Desktop EXE, Android APK, and PWA Standalone,
 * as well as PointerType ergonomics (fine vs coarse) and Safe Area DOM synchronization.
 */

import { isDesktopApp } from "../../native/desktopBridge";
import {
	getDeviceFormFactor,
	getSafeAreaInsets,
	isMobileApp,
	isNativePlatform,
} from "../../native/mobileBridge";
import type {
	OmniEnvironment,
	PointerType,
	OmniPlatformInfo,
} from "./types";

/**
 * Detects whether the current runtime is a desktop executable (Electron or Tauri).
 */
export function isDesktopExecutable(): boolean {
	if (typeof window === "undefined") return false;

	// 1. DENTE desktop native bridge injected
	if (isDesktopApp()) return true;

	// 2. Electron window object or process
	const win = window as unknown as {
		electron?: unknown;
		process?: { type?: string; versions?: { electron?: string } };
		chrome?: { webview?: unknown };
		__DENTE_DESKTOP__?: boolean;
		__WEBVIEW2__?: boolean;
	};
	if (win.electron !== undefined) return true;
	if (win.process?.versions?.electron !== undefined) return true;

	// 3. Microsoft Edge WebView2 embedded desktop runtime (.NET / C++ Windows host)
	if (win.chrome?.webview !== undefined || win.__WEBVIEW2__ === true || win.__DENTE_DESKTOP__ === true) {
		return true;
	}

	// 4. Tauri window object
	const tauriWin = window as unknown as {
		__TAURI__?: unknown;
		__TAURI_INTERNALS__?: unknown;
	};
	if (tauriWin.__TAURI__ !== undefined || tauriWin.__TAURI_INTERNALS__ !== undefined) {
		return true;
	}

	// 5. User Agent heuristics
	if (typeof navigator !== "undefined" && navigator.userAgent) {
		if (/Electron|Tauri|DenteDesktop|WebView2|DenteWin/i.test(navigator.userAgent)) {
			return true;
		}
	}

	return false;
}

/**
 * Detects whether the app is running as an installed PWA in standalone display mode.
 */
export function isStandalonePwa(): boolean {
	if (typeof window === "undefined") return false;

	// 1. CSS display-mode standalone media query
	if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
		return true;
	}

	// 2. iOS Safari standalone property
	const nav = typeof navigator !== "undefined" ? (navigator as unknown as { standalone?: boolean }) : undefined;
	if (nav?.standalone === true) {
		return true;
	}

	// 3. Android WebAPK launch intent referrer
	if (typeof document !== "undefined" && typeof document.referrer === "string" && document.referrer.startsWith("android-app://")) {
		return true;
	}

	return false;
}

/**
 * Detects whether the app is running in an Android APK native shell.
 */
export function isAndroidNativeApp(): boolean {
	if (typeof window === "undefined") return false;

	if (isNativePlatform() || isMobileApp()) {
		return true;
	}

	// Android WebView user agent inspection
	if (typeof navigator !== "undefined" && navigator.userAgent) {
		const ua = navigator.userAgent;
		if (/Android/i.test(ua) && (/wv|Version\/.*Chrome/i.test(ua) || /Capacitor/i.test(ua))) {
			return true;
		}
	}

	return false;
}

/**
 * Classifies the exact active omni-platform environment.
 */
export function detectOmniEnvironment(): OmniEnvironment {
	if (isDesktopExecutable()) return "desktop_exe";
	if (isAndroidNativeApp()) return "android_apk";
	if (isStandalonePwa()) return "pwa_standalone";
	return "web_browser";
}

/**
 * Determines primary pointing device precision (Mandate 8c):
 * - "coarse": Finger / glove on touchscreen (requires >= 44x44px targets)
 * - "fine": Mouse / trackpad (retains dense 28–36px desktop clinical layout)
 */
export function detectPointerType(): PointerType {
	if (typeof window === "undefined") return "fine";

	// 1. Standard CSS Media Query matchMedia
	if (window.matchMedia) {
		if (window.matchMedia("(pointer: coarse)").matches) {
			return "coarse";
		}
		if (window.matchMedia("(pointer: fine)").matches) {
			return "fine";
		}
	}

	// 2. Fallback to navigator touch points
	if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) {
		return "coarse";
	}

	return "fine";
}

/**
 * Returns comprehensive platform, pointer, and hardware topology.
 */
export function getOmniPlatformInfo(): OmniPlatformInfo {
	const environment = detectOmniEnvironment();
	const pointerType = detectPointerType();
	const formFactor = getDeviceFormFactor();
	const isDesktop = environment === "desktop_exe";
	const isAndroid = environment === "android_apk";
	const isPwa = environment === "pwa_standalone";
	const isWeb = environment === "web_browser";
	const isTouch = pointerType === "coarse";
	const isMouse = pointerType === "fine";
	const isTablet = formFactor === "tablet";
	const isPhone = formFactor === "phone";
	const safeArea = getSafeAreaInsets();

	// Calculate recommended control dimensions based on pointer precision
	const controlHeights = isTouch
		? {
				primaryActionMinHeightPx: isPhone ? 52 : 48,
				standardMinHeightPx: 44,
				denseMinHeightPx: 36,
				touchTargetMinPx: 44,
				fontSizePx: isPhone ? 15 : 14,
			}
		: {
				primaryActionMinHeightPx: 36,
				standardMinHeightPx: 32,
				denseMinHeightPx: 28,
				touchTargetMinPx: 28,
				fontSizePx: 13,
			};

	const capabilities = {
		canSilentPrintThermal: isDesktop,
		canDirectFiscalKktTcp: isDesktop,
		canDirectEscPosSocket: isDesktop,
		canHardwareHotkeys: isDesktop,
		canPrintA4: true,
		canDirectTwainVisiograph: isDesktop,
		canCameraScanBarcode: isAndroid || (typeof navigator !== "undefined" && Boolean(navigator.mediaDevices)),
		canUsbHidScanner: isDesktop || isWeb || isPwa,
		canNativeBiometrics: isAndroid,
		canOfflineStorage: typeof window !== "undefined" && (Boolean(window.indexedDB) || Boolean(window.localStorage)),
		hasPwaOfflineCache: typeof navigator !== "undefined" && "serviceWorker" in navigator,
	};

	return {
		environment,
		pointerType,
		formFactor,
		isDesktop,
		isAndroid,
		isPwa,
		isWeb,
		isTouch,
		isMouse,
		isTablet,
		isPhone,
		safeArea,
		controlHeights,
		capabilities,
	};
}

/**
 * Synchronizes platform and pointer data attributes on document.documentElement.
 * Enables zero-JS CSS selectors:
 * `[data-pointer="coarse"] .btn { min-height: 44px; }`
 * `[data-pointer="fine"] .btn { min-height: 32px; }`
 * `[data-platform="desktop"] .titlebar { display: flex; }`
 */
export function syncPlatformDomAttributes(info?: OmniPlatformInfo): void {
	if (typeof document === "undefined" || !document.documentElement) return;

	const platformInfo = info ?? getOmniPlatformInfo();
	const root = document.documentElement;

	const platformMap: Record<OmniEnvironment, string> = {
		desktop_exe: "desktop",
		android_apk: "android",
		pwa_standalone: "pwa",
		web_browser: "web",
	};

	root.setAttribute("data-platform", platformMap[platformInfo.environment]);
	root.setAttribute("data-pointer", platformInfo.pointerType);
	root.setAttribute("data-form-factor", platformInfo.formFactor);

	if (platformInfo.isTouch) {
		root.classList.add("pointer-coarse");
		root.classList.remove("pointer-fine");
	} else {
		root.classList.add("pointer-fine");
		root.classList.remove("pointer-coarse");
	}

	// Synchronize Safe Area Insets as CSS custom properties for notch and home bar.
	if (root.style && typeof root.style.setProperty === "function") {
		root.style.setProperty("--sat", `${platformInfo.safeArea.top}px`);
		root.style.setProperty("--sab", `${platformInfo.safeArea.bottom}px`);
		root.style.setProperty("--sal", `${platformInfo.safeArea.left}px`);
		root.style.setProperty("--sar", `${platformInfo.safeArea.right}px`);
	}
}
