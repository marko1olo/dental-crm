/**
 * DENTE CRM — Dynamic Load State Machine & Hysteresis
 */

import type {
	DynamicLoadState,
	DynamicPerformanceMetrics,
	DynamicPerformanceSnapshot,
} from "./performanceTypes.js";
import { SEVERITY_RANK } from "./performanceTypes.js";

export function computeRawState(m: DynamicPerformanceMetrics): DynamicLoadState {
	if (
		m.averageFps < 18 ||
		m.p95FrameTimeMs > 120 ||
		m.totalLongTaskDurationMs > 800 ||
		m.maxLongTaskDurationMs > 400 ||
		(m.memoryPressureRatio !== null && m.memoryPressureRatio > 0.85)
	) {
		return "CRITICAL";
	}

	if (
		m.averageFps < 32 ||
		m.p95FrameTimeMs > 60 ||
		m.jitterMs > 25 ||
		m.totalLongTaskDurationMs > 250 ||
		m.longTaskCount >= 3 ||
		(m.memoryPressureRatio !== null && m.memoryPressureRatio > 0.8)
	) {
		return "DEGRADED";
	}

	if (
		m.averageFps < 52 ||
		m.p95FrameTimeMs > 35 ||
		m.jitterMs > 12 ||
		m.totalLongTaskDurationMs > 80 ||
		m.longTaskCount >= 1 ||
		(m.memoryPressureRatio !== null && m.memoryPressureRatio > 0.7)
	) {
		return "WARNING";
	}

	return "HEALTHY";
}

export function buildPerformanceSnapshot(
	state: DynamicLoadState,
	previousState: DynamicLoadState,
	stateChangedAt: number,
	metrics: DynamicPerformanceMetrics,
	isBatteryThrottling: boolean,
	now: number,
): DynamicPerformanceSnapshot {
	let downscaleFactor = 1.0;
	let targetFpsCap = 60;
	let recommendedBlurDisabled = false;

	switch (state) {
		case "HEALTHY": downscaleFactor = 1.0; targetFpsCap = 60; recommendedBlurDisabled = false; break;
		case "WARNING": downscaleFactor = 0.85; targetFpsCap = 45; recommendedBlurDisabled = false; break;
		case "DEGRADED": downscaleFactor = 0.65; targetFpsCap = 30; recommendedBlurDisabled = true; break;
		case "CRITICAL": downscaleFactor = 0.45; targetFpsCap = 15; recommendedBlurDisabled = true; break;
	}

	if (isBatteryThrottling) {
		targetFpsCap = Math.min(targetFpsCap, 30);
		downscaleFactor = Math.min(downscaleFactor, 0.75);
		recommendedBlurDisabled = true;
	}

	return {
		timestamp: now,
		state,
		previousState,
		stateChangedAt,
		metrics: { ...metrics },
		isThrottlingRecommended: state !== "HEALTHY" || isBatteryThrottling,
		downscaleFactor,
		targetFpsCap,
		recommendedBlurDisabled,
		isBatteryThrottling,
	};
}

export function syncDomAttributes(state: DynamicLoadState, averageFps: number, isBatteryThrottling: boolean): void {
	if (typeof document === "undefined" || !document.documentElement) return;
	const root = document.documentElement;
	root.setAttribute("data-dynamic-load", state.toLowerCase());
	root.setAttribute("data-dynamic-fps", String(averageFps));

	if (isBatteryThrottling) root.setAttribute("data-battery-saving", "true");
	else root.removeAttribute("data-battery-saving");

	if (state === "DEGRADED" || state === "CRITICAL") {
		root.setAttribute("data-blur-disabled", "true");
		root.setAttribute("data-perf-state", "degraded");
	} else {
		root.removeAttribute("data-blur-disabled");
		root.setAttribute("data-perf-state", "healthy");
	}
}

export { SEVERITY_RANK };
