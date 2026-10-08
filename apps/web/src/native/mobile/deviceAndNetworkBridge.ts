/**
 * DENTE CRM — Device, Network & Platform Bridge (Layer 2)
 *
 * Screen Wake Lock, Form Factor detection, Safe Area Insets, Lifecycle Protection,
 * and re-exports of platform detection, modal stack, deep linking and push notifications.
 */

import type { DeviceFormFactor } from "./types";
import { getMobileNativeApi } from "./platform";

// Re-export core platform classifications
export {
	isNativePlatform,
	isMobileApp,
	isDesktopApp,
	isPwaApp,
	isWebApp,
	getMobilePlatform,
	getMobileNativeApi,
} from "./platform";

// Re-export modal back stack mechanics
export {
	pushModalBackHandler,
	popModalBackHandler,
	getModalBackStackDepth,
	clearModalBackStack,
	handleHardwareBackAction,
	initHardwareBackButtonListener,
} from "./modalBackStack";

// Re-export deep linking and document share mechanics
export {
	parseDenteDeepLink,
	createDenteDeepLink,
	generateWhatsAppDocShareLink,
	generateTelegramDocShareLink,
	shareClinicalDocumentMobile,
} from "./shareAndDeepLinkBridge";

// Re-export push notifications and channel management
export {
	requestPushNotificationPermission,
	createAndroidNotificationChannels,
	triggerBackgroundWakeUp,
	initMobilePushNotifications,
	setAppBadgeCount,
	clearAppBadgeCount,
} from "./pushNotificationsBridge";

// ============================================================================
// SCREEN WAKE LOCK API (DOCTOR IPAD / SURGICAL OPERATORY SUPPORT)
// ============================================================================

// biome-ignore lint/suspicious/noExplicitAny: Screen Wake Lock Sentinel instance
let activeWakeLockSentinel: any = null;

/**
 * Acquires Screen Wake Lock to prevent iPad / tablet screen dimming during clinical appointments.
 */
export async function acquireScreenWakeLock(): Promise<boolean> {
	if (typeof window === "undefined") return false;

	// 1. Native Bridge if available
	const nativeApi = getMobileNativeApi();
	if (nativeApi?.acquireWakeLock) {
		try {
			const res = await nativeApi.acquireWakeLock();
			return res.success;
		} catch (err: unknown) {
			console.warn("[mobileBridge] native acquireWakeLock failed:", err);
		}
	}

	// 2. HTML5 Screen Wake Lock API (iPadOS Safari 16.4+ / Chrome Android)
	if (typeof navigator !== "undefined" && "wakeLock" in navigator && typeof (navigator as any).wakeLock?.request === "function") {
		try {
			if (!activeWakeLockSentinel) {
				activeWakeLockSentinel = await (navigator as any).wakeLock.request("screen");
				activeWakeLockSentinel.addEventListener?.("release", () => {
					activeWakeLockSentinel = null;
				});
			}
			return true;
		} catch (err: unknown) {
			console.warn("[mobileBridge] navigator wakeLock.request failed:", err);
			return false;
		}
	}

	return false;
}

/**
 * Releases Screen Wake Lock allowing normal OS power management.
 */
export async function releaseScreenWakeLock(): Promise<boolean> {
	if (typeof window === "undefined") return true;

	const nativeApi = getMobileNativeApi();
	if (nativeApi?.releaseWakeLock) {
		try {
			const res = await nativeApi.releaseWakeLock();
			return res.success;
		} catch (err: unknown) {
			console.warn("[mobileBridge] native releaseWakeLock failed:", err);
		}
	}

	if (activeWakeLockSentinel) {
		try {
			await activeWakeLockSentinel.release();
			activeWakeLockSentinel = null;
			return true;
		} catch (err: unknown) {
			console.warn("[mobileBridge] activeWakeLockSentinel.release failed:", err);
			return false;
		}
	}

	return true;
}

/**
 * Checks if screen wake lock is actively held.
 */
export function isScreenWakeLockActive(): boolean {
	return activeWakeLockSentinel !== null;
}

/**
 * Detects device form factor: Doctor Tablet vs Administrator Phone vs Desktop
 */
export function getDeviceFormFactor(): DeviceFormFactor {
	if (typeof window === "undefined") return "desktop";
	const width = window.innerWidth || 1200;
	const isTouch = typeof navigator !== "undefined" && (navigator.maxTouchPoints > 0 || "ontouchstart" in window);

	if (isTouch) {
		if (width >= 768 && width <= 1366) return "tablet";
		if (width < 768) return "phone";
	}

	if (width < 768) return "phone";
	if (width < 1200) return "tablet";
	return "desktop";
}

/**
 * Returns true if the active device is a doctor tablet (e.g. iPad, Samsung Galaxy Tab in operatory)
 */
export function isTabletDevice(): boolean {
	return getDeviceFormFactor() === "tablet";
}

/**
 * Returns true if the active device is a mobile smartphone (e.g. administrator/doctor on call)
 */
export function isMobileSmartphone(): boolean {
	return getDeviceFormFactor() === "phone";
}

/**
 * Returns safe-area insets in pixels from CSS environment variables or defaults
 */
export function getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
	if (typeof window === "undefined") {
		return { top: 0, bottom: 0, left: 0, right: 0 };
	}

	const win = window as unknown as {
		denteMobileNative?: {
			isMobileApp?: boolean;
			getSafeAreaInsets?: () => { top: number; bottom: number; left: number; right: number };
		};
		denteSafeArea?: { top: number; bottom: number; left: number; right: number };
	};

	if (win.denteSafeArea && typeof win.denteSafeArea.top === "number") {
		return {
			top: win.denteSafeArea.top,
			bottom: win.denteSafeArea.bottom || 0,
			left: win.denteSafeArea.left || 0,
			right: win.denteSafeArea.right || 0,
		};
	}

	if (typeof win.denteMobileNative?.getSafeAreaInsets === "function") {
		try {
			const res = win.denteMobileNative.getSafeAreaInsets();
			if (res && typeof res.top === "number") return res;
		} catch {
			// fallback
		}
	}

	if (typeof document === "undefined") {
		return { top: 0, bottom: 0, left: 0, right: 0 };
	}

	const getStyleFn = typeof getComputedStyle === "function"
		? getComputedStyle
		: typeof window.getComputedStyle === "function"
			? window.getComputedStyle
			: null;

	if (!getStyleFn) {
		return { top: 0, bottom: 0, left: 0, right: 0 };
	}

	const style = getStyleFn(document.documentElement);
	const parseInset = (prop: string) => {
		const val = style.getPropertyValue(prop);
		return val ? Number.parseInt(val, 10) || 0 : 0;
	};

	return {
		top: parseInset("--sat") || 0,
		bottom: parseInset("--sab") || 0,
		left: parseInset("--sal") || 0,
		right: parseInset("--sar") || 0,
	};
}

/**
 * Регистрация слушателей перехода мобильного приложения в фоновый режим / скрытия экрана
 * для гарантированного сброса черновиков и мутаций у кресла врача (Mandate 8e).
 */
export function setupMobileLifecycleProtection(onBackgroundCallback?: () => void): () => void {
	if (typeof window === "undefined") return () => {};

	const handleBackground = () => {
		try {
			onBackgroundCallback?.();
		} catch (err) {
			// Silent in background
		}
	};

	window.addEventListener("pagehide", handleBackground);
	if (typeof document !== "undefined") {
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") {
				handleBackground();
			}
		});
	}

	return () => {
		window.removeEventListener("pagehide", handleBackground);
	};
}
