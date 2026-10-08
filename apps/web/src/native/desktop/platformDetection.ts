/**
 * DENTE CRM — Desktop Windows (.EXE) Platform Detection (Layer 1)
 *
 * Zero-dependency pure platform and runtime environment detector:
 * - DENTE Desktop (.EXE / Electron / WebView2 / Tauri).
 * - Progressive Web App (PWA standalone / display-mode / WebAPK).
 * - Web Browser fallback.
 */

import { isMobileApp } from "../mobile/platform";
import type { DesktopNativeApi } from "./types";

export function isDesktopApp(): boolean {
	if (typeof window === "undefined") return false;

	// 1. Direct DENTE Desktop native bridge
	if (Boolean(window.denteDesktopNative?.isDesktop)) return true;

	// 2. Electron window object or process
	const win = window as unknown as {
		electron?: unknown;
		process?: { type?: string; versions?: { electron?: string } };
		chrome?: { webview?: unknown };
		__DENTE_DESKTOP__?: boolean;
		__WEBVIEW2__?: boolean;
	};
	if (win.electron !== undefined || win.process?.versions?.electron !== undefined) {
		return true;
	}

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

export { isMobileApp };

/**
 * Detects whether the app is running in a Progressive Web App (PWA) environment
 * (e.g. standalone window, installed home screen app, or Subway offline mode).
 */
export function isPwaApp(): boolean {
	if (typeof window === "undefined") return false;

	// 1. Explicit PWA flag
	if ((window as unknown as { __DENTE_PWA__?: boolean }).__DENTE_PWA__ === true) {
		return true;
	}

	// 2. CSS display-mode standalone, minimal-ui, or window-controls-overlay
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

	// 3. iOS Safari standalone home-screen mode
	const nav = typeof navigator !== "undefined" ? (navigator as unknown as { standalone?: boolean }) : undefined;
	if (nav?.standalone === true) {
		return true;
	}

	// 4. Android WebAPK launch intent referrer
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
 * Detects whether the app is running in a standard web browser tab.
 */
export function isWebApp(): boolean {
	return !isDesktopApp() && !isMobileApp() && !isPwaApp();
}

export function getDesktopNativeApi(): DesktopNativeApi | null {
	if (typeof window === "undefined" || !window.denteDesktopNative) {
		return null;
	}
	return window.denteDesktopNative;
}
