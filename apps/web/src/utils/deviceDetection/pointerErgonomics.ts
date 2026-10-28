/**
 * DENTE CRM — Clinical Pointer Ergonomics & Low-Spec DOM Tuning
 */

import {
	DESKTOP_FINE_ERGONOMICS,
	PHONE_TOUCH_ERGONOMICS,
	TABLET_TOUCH_ERGONOMICS,
	type ControlDimensions,
} from "@dental/shared";
import { detectPointerType } from "../../lib/omniPlatformAdapter.js";
import { getDeviceFormFactor } from "../../native/mobileBridge.js";
import { getHardwareResourceTier, isLowSpecHardware } from "./platformDetector.js";

export function getControlDimensions(): ControlDimensions {
	const pointer = detectPointerType();
	if (pointer === "fine") return DESKTOP_FINE_ERGONOMICS;
	if (getDeviceFormFactor() === "phone") return PHONE_TOUCH_ERGONOMICS;
	return TABLET_TOUCH_ERGONOMICS;
}

export function getAdaptivePollingIntervalMs(baseIntervalMs: number): number {
	if (baseIntervalMs <= 0) return baseIntervalMs;
	const tier = getHardwareResourceTier();
	if (tier === "low") return Math.max(Math.round(baseIntervalMs * 2.5), 15_000);
	if (tier === "medium") return Math.max(Math.round(baseIntervalMs * 1.5), baseIntervalMs);
	return baseIntervalMs;
}

export function shouldVirtualizeListsAggressively(): boolean {
	return isLowSpecHardware();
}

export function applyLowSpecOptimizationsToDom(forcedLow?: boolean): void {
	if (typeof document === "undefined" || !document.documentElement) return;
	const isLow = forcedLow !== undefined ? forcedLow : isLowSpecHardware();
	const root = document.documentElement;

	if (isLow) {
		root.setAttribute("data-low-spec", "true");
		root.setAttribute("data-hardware-tier", "low");
		root.setAttribute("data-perf", "low");
		root.classList.add("low-spec-mode");
		root.classList.add("low-spec-perf");
	} else {
		root.removeAttribute("data-low-spec");
		root.setAttribute("data-hardware-tier", "high");
		root.setAttribute("data-perf", "high");
		root.classList.remove("low-spec-mode");
		root.classList.remove("low-spec-perf");
	}
}
