/**
 * DENTE CRM — Platform Capabilities & Diagnostic Reports
 */

import type { PlatformCapabilitiesMatrix } from "@dental/shared";
import { getOmniPlatformInfo } from "../../lib/omniPlatformAdapter.js";
import { getHardwareProfile } from "../../lib/hardwareCapabilities.js";
import { getDynamicPerformanceSnapshot, type DynamicLoadState } from "../telemetry/runtimePerformanceMonitor.js";
import {
	detectPlatform,
	getHardwareResourceTier,
	isHighPerformanceWorkstation,
	isLowSpecHardware,
} from "./platformDetector.js";
import {
	getAdaptivePollingIntervalMs,
	getControlDimensions,
	shouldVirtualizeListsAggressively,
} from "./pointerErgonomics.js";

export function getPlatformCapabilities(): PlatformCapabilitiesMatrix {
	const info = getOmniPlatformInfo();
	return {
		canSilentPrintThermal: info.capabilities.canSilentPrintThermal,
		canDirectFiscalKktTcp: info.isDesktop,
		canPrintA4: info.capabilities.canPrintA4,
		canDirectTwainVisiograph: info.capabilities.canDirectTwainVisiograph,
		canCameraCapturePhoto: typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
		canCameraScanBarcode: info.capabilities.canCameraScanBarcode,
		canUsbHidScanner: info.capabilities.canUsbHidScanner,
		canNativeBiometrics: info.capabilities.canNativeBiometrics,
		canOfflineStorage: info.capabilities.canOfflineStorage,
		canHardwareHotkeys: info.isDesktop,
	};
}

export function getDynamicPerformanceState(): DynamicLoadState {
	return getDynamicPerformanceSnapshot().state;
}

export function isHostUnderHeavyLoad(): boolean {
	const s = getDynamicPerformanceState();
	return s === "DEGRADED" || s === "CRITICAL";
}

export function getAdaptiveDicomDownscaleFactor(): number {
	const snapshot = getDynamicPerformanceSnapshot();
	const p = getHardwareProfile();
	const staticFactor = p.tier === "potato" ? 0.5 : p.tier === "low" ? 0.75 : 1.0;
	return Math.min(staticFactor, snapshot.downscaleFactor);
}

export function getDeviceDiagnosticReport(): Record<string, unknown> {
	const info = getOmniPlatformInfo();
	const profile = getHardwareProfile();
	return {
		platform: detectPlatform(),
		environment: info.environment,
		pointerType: info.pointerType,
		formFactor: info.formFactor,
		isDesktop: info.isDesktop,
		isAndroid: info.isAndroid,
		isPwa: info.isPwa,
		isWeb: info.isWeb,
		isTouch: info.isTouch,
		isTablet: info.isTablet,
		controlDimensions: getControlDimensions(),
		capabilities: getPlatformCapabilities(),
		safeAreaInsets: info.safeArea,
		isLowSpec: isLowSpecHardware(),
		hardwareTier: getHardwareResourceTier(),
		canonicalTier: profile.tier,
		hardwareScore: profile.score,
		gpuType: profile.gpuType,
		hardwareProfile: profile,
		isHighPerformance: isHighPerformanceWorkstation(),
		dynamicPerformance: getDynamicPerformanceSnapshot(),
		cores: typeof navigator !== "undefined" ? (navigator.hardwareConcurrency ?? null) : null,
		deviceMemoryGb: typeof navigator !== "undefined" ? ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null) : null,
		shouldVirtualizeAggressively: shouldVirtualizeListsAggressively(),
		adaptivePollingInterval10s: getAdaptivePollingIntervalMs(10_000),
		adaptiveDicomDownscaleFactor: getAdaptiveDicomDownscaleFactor(),
		userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "ssr",
		screenWidth: typeof window !== "undefined" ? window.innerWidth : 0,
		screenHeight: typeof window !== "undefined" ? window.innerHeight : 0,
		devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
	};
}
