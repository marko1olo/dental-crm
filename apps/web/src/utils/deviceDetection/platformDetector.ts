/**
 * DENTE CRM — Multi-Platform Runtime & Resource Tier Detector
 */

import {
	detectOmniEnvironment,
	detectPointerType,
	isAndroidNativeApp,
	isDesktopExecutable,
	isStandalonePwa,
} from "../../lib/omniPlatformAdapter.js";
import { getDeviceFormFactor } from "../../native/mobileBridge.js";
import {
	getHardwareProfile,
	isLowSpecDevice as isLowSpecCanonical,
	getHardwareTierOverride,
} from "../../lib/hardwareCapabilities.js";

export type RuntimeDevicePlatform = "desktop" | "android" | "pwa" | "web";
export type HardwareResourceTier = "low" | "medium" | "high";

export function detectPlatform(): RuntimeDevicePlatform {
	const env = detectOmniEnvironment();
	switch (env) {
		case "desktop_exe": return "desktop";
		case "android_apk": return "android";
		case "pwa_standalone": return "pwa";
		default: return "web";
	}
}

export const isDesktopExe = (): boolean => isDesktopExecutable();
export const isAndroidApk = (): boolean => isAndroidNativeApp();
export const isPwa = (): boolean => isStandalonePwa();
export const isTouchDevice = (): boolean => detectPointerType() === "coarse";
export const isFinePointerDevice = (): boolean => detectPointerType() === "fine";
export const isTablet = (): boolean => getDeviceFormFactor() === "tablet";
export const isPhone = (): boolean => getDeviceFormFactor() === "phone";

export function isLowSpecHardware(): boolean {
	if (typeof document !== "undefined" && document.documentElement) {
		const el = document.documentElement;
		const tier = el.getAttribute("data-hardware-tier") || el.getAttribute("data-perf-tier") || el.getAttribute("data-perf");
		if (el.getAttribute("data-low-spec") === "true" || tier === "potato" || tier === "low" || el.classList.contains("low-spec-mode")) {
			return true;
		}
		if (tier === "balanced" || tier === "ultra" || tier === "high") return false;
	}

	const override = getHardwareTierOverride();
	if (override !== null) return override === "potato" || override === "low";

	if (typeof navigator !== "undefined") {
		const navMem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
		const cores = navigator.hardwareConcurrency;
		if (typeof navMem === "number" && navMem <= 4) return true;
		if (typeof cores === "number" && cores > 0 && cores <= 4) return true;
		const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
		if (conn?.saveData || conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g" || conn?.effectiveType === "3g") return true;
		if (typeof cores === "number" && cores >= 6 && (typeof navMem !== "number" || navMem >= 6)) return false;
	}

	return isLowSpecCanonical();
}

export function getHardwareResourceTier(): HardwareResourceTier {
	if (typeof document !== "undefined" && document.documentElement) {
		const tier = document.documentElement.getAttribute("data-hardware-tier") || document.documentElement.getAttribute("data-perf-tier");
		if (tier === "potato" || tier === "low") return "low";
		if (tier === "balanced" || tier === "medium") return "medium";
		if (tier === "ultra" || tier === "high") return "high";
	}

	const override = getHardwareTierOverride();
	if (override !== null) {
		if (override === "potato" || override === "low") return "low";
		if (override === "balanced") return "medium";
		if (override === "ultra") return "high";
	}

	if (typeof navigator !== "undefined") {
		const cores = navigator.hardwareConcurrency;
		const navMem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
		if (typeof cores === "number" && cores >= 8 && (typeof navMem !== "number" || navMem >= 8)) return "high";
		if ((typeof cores === "number" && cores >= 6) || (typeof navMem === "number" && navMem >= 6)) return "medium";
	}

	const p = getHardwareProfile();
	if (p.tier === "potato" || p.tier === "low") return "low";
	if (p.tier === "balanced") return "medium";
	if (p.tier === "ultra") return "high";

	return isLowSpecHardware() ? "low" : "medium";
}

export function isHighPerformanceWorkstation(): boolean {
	return getHardwareResourceTier() === "high";
}
