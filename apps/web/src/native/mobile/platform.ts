/**
 * DENTE CRM — Mobile/Desktop/PWA Platform Detection (Layer 1)
 *
 * Core runtime platform classification: Capacitor vs Desktop vs PWA vs Web.
 */

import type { MobileNativeApi } from "./types";

/**
 * Returns true if the app is running in native Capacitor shell (Android / iOS)
 * or has native Android/iOS bridge bindings injected.
 */
export function isNativePlatform(): boolean {
	if (typeof window === "undefined") return false;
	if (window.Capacitor?.isNativePlatform?.()) return true;
	if (window.denteMobileNative?.isMobileApp === true) return true;
	return false;
}

export function isMobileApp(): boolean {
	if (typeof window === "undefined") return false;
	if (isNativePlatform()) return true;

	// Android WebView or Capacitor user agent inspection
	if (typeof navigator !== "undefined" && navigator.userAgent) {
		const ua = navigator.userAgent;
		if (/Android/i.test(ua) && (/wv|Version\/.*Chrome/i.test(ua) || /Capacitor/i.test(ua))) {
			return true;
		}
	}

	return false;
}

/**
 * Returns true if the app is running in desktop Windows (.exe) via Electron or Tauri.
 */
export function isDesktopApp(): boolean {
	if (typeof window === "undefined") return false;
	const win = window as unknown as {
		denteDesktopNative?: { isDesktop?: boolean };
		electron?: unknown;
		process?: { type?: string; versions?: { electron?: string } };
		chrome?: { webview?: unknown };
		__TAURI__?: unknown;
		__TAURI_INTERNALS__?: unknown;
		__DENTE_DESKTOP__?: boolean;
		__WEBVIEW2__?: boolean;
	};
	if (Boolean(win.denteDesktopNative?.isDesktop)) return true;
	if (win.electron !== undefined || win.process?.versions?.electron !== undefined) return true;
	if (win.chrome?.webview !== undefined || win.__WEBVIEW2__ === true || win.__DENTE_DESKTOP__ === true) {
		return true;
	}
	if (win.__TAURI__ !== undefined || win.__TAURI_INTERNALS__ !== undefined) return true;
	if (typeof navigator !== "undefined" && navigator.userAgent) {
		if (/Electron|Tauri|DenteDesktop|WebView2|DenteWin/i.test(navigator.userAgent)) return true;
	}
	return false;
}

/**
 * Returns true if the app is running as an installed Progressive Web App (PWA).
 */
export function isPwaApp(): boolean {
	if (typeof window === "undefined") return false;
	if ((window as unknown as { __DENTE_PWA__?: boolean }).__DENTE_PWA__ === true) return true;
	try {
		if (
			window.matchMedia &&
			(window.matchMedia("(display-mode: standalone)").matches ||
				window.matchMedia("(display-mode: minimal-ui)").matches ||
				window.matchMedia("(display-mode: window-controls-overlay)").matches)
		) {
			return true;
		}
	} catch {
		// Ignore matchMedia errors in non-browser / test environments
	}
	const nav = typeof navigator !== "undefined" ? (navigator as unknown as { standalone?: boolean }) : undefined;
	if (nav?.standalone === true) return true;
	if (
		typeof document !== "undefined" &&
		typeof document.referrer === "string" &&
		document.referrer.startsWith("android-app://")
	) {
		return true;
	}
	return false;
}

/**
 * Returns true if the app is running in a standard web browser tab.
 */
export function isWebApp(): boolean {
	return !isDesktopApp() && !isMobileApp() && !isPwaApp();
}

/**
 * Returns detected mobile operating system platform ('android', 'ios', or 'web').
 */
export function getMobilePlatform(): "android" | "ios" | "web" {
	if (typeof window === "undefined") return "web";
	if (window.denteMobileNative?.platform) return window.denteMobileNative.platform;
	if (window.Capacitor?.getPlatform) {
		const plat = window.Capacitor.getPlatform();
		if (plat === "android" || plat === "ios") return plat;
	}
	if (typeof navigator !== "undefined") {
		const ua = navigator.userAgent || "";
		if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
			return "ios";
		}
		if (/Android/.test(ua)) {
			return "android";
		}
	}
	return "web";
}

export function getMobileNativeApi(): MobileNativeApi | null {
	if (typeof window === "undefined") return null;
	if (window.denteMobileNative) return window.denteMobileNative;
	return null;
}
