/**
 * hardwareCapabilities/domAdapter.ts — Layer 3: DOM Attributes & CSS Adaptation Engine
 *
 * Synchronizes hardware profile and dynamic performance states with HTML root element:
 * - data-hardware-tier, data-perf-tier, data-hardware-score, data-gpu-type
 * - data-perf-state (healthy | degraded), data-ct-active (true | false)
 * - data-low-spec, .low-spec-mode, .low-spec-perf
 * - Safe transitionend / animationend temporary will-change cleanup
 */

import type { HardwareProfile } from "@dental/shared";
import type {
	CtActiveListener,
	PerfState,
	PerfStateListener,
} from "./types";
import { getHardwareProfile } from "./profileEvaluator";

let currentPerfState: PerfState = "healthy";
let isCtScanActive = false;

const perfStateListeners = new Set<PerfStateListener>();
const ctActiveListeners = new Set<CtActiveListener>();

export function getPerfState(): PerfState {
	if (typeof document !== "undefined" && document.documentElement) {
		const attr = document.documentElement.getAttribute("data-perf-state");
		if (attr === "degraded" || attr === "healthy") {
			return attr;
		}
	}
	return currentPerfState;
}

export function setDynamicPerfState(state: PerfState): void {
	if (currentPerfState === state) return;
	currentPerfState = state;
	if (typeof document !== "undefined" && document.documentElement) {
		document.documentElement.setAttribute("data-perf-state", state);
	}
	for (const listener of perfStateListeners) {
		try {
			listener(state);
		} catch {
			// ignore subscriber errors
		}
	}
	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente:perf-state-changed", {
					detail: { perfState: state },
				}),
			);
		} catch {
			// ignore dispatch errors
		}
	}
}

export function getCtScanActive(): boolean {
	if (typeof document !== "undefined" && document.documentElement) {
		return document.documentElement.getAttribute("data-ct-active") === "true";
	}
	return isCtScanActive;
}

export function setCtScanActive(active: boolean): void {
	if (isCtScanActive === active) return;
	isCtScanActive = active;
	if (typeof document !== "undefined" && document.documentElement) {
		document.documentElement.setAttribute(
			"data-ct-active",
			active ? "true" : "false",
		);
	}
	for (const listener of ctActiveListeners) {
		try {
			listener(active);
		} catch {
			// ignore subscriber errors
		}
	}
	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente:ct-active-changed", {
					detail: { isCtActive: active },
				}),
			);
		} catch {
			// ignore dispatch errors
		}
	}
}

export function onPerfStateChange(
	listener: PerfStateListener,
): () => void {
	perfStateListeners.add(listener);
	return () => {
		perfStateListeners.delete(listener);
	};
}

export function onCtActiveChange(
	listener: CtActiveListener,
): () => void {
	ctActiveListeners.add(listener);
	return () => {
		ctActiveListeners.delete(listener);
	};
}

/**
 * Applies canonical performance attributes to the document root element:
 * - `data-hardware-tier="potato|low|balanced|ultra"`
 * - `data-perf-tier="potato|low|balanced|ultra"`
 * - `data-hardware-score="0..100"`
 * - `data-gpu-type="discrete|integrated|apple_silicon|software|unknown"`
 * - `data-perf-state="healthy|degraded"`
 * - `data-ct-active="true|false"`
 * - `data-low-spec="true|false"`
 * - `data-perf="low|balanced|ultra"`
 * - `.low-spec-mode` / `.low-spec-perf` classes when tier is potato or low.
 */
export function applyHardwareProfileToRoot(
	profile: HardwareProfile,
	root?: HTMLElement | null,
): void {
	const el =
		root ?? (typeof document !== "undefined" ? document.documentElement : null);
	if (!el) return;

	el.setAttribute("data-hardware-tier", profile.tier);
	el.setAttribute("data-perf-tier", profile.tier);
	el.setAttribute("data-hardware-score", String(profile.score));
	el.setAttribute("data-gpu-type", profile.gpuType);
	el.setAttribute("data-perf-state", currentPerfState);
	el.setAttribute("data-ct-active", isCtScanActive ? "true" : "false");

	if (profile.isBatterySaving) {
		el.setAttribute("data-battery-saving", "true");
	} else {
		el.removeAttribute("data-battery-saving");
	}

	if (profile.isHybridGraphics) {
		el.setAttribute("data-hybrid-gpu", "true");
	} else {
		el.removeAttribute("data-hybrid-gpu");
	}

	if (profile.discreteGpuRenderer) {
		el.setAttribute("data-discrete-gpu", profile.discreteGpuRenderer);
	} else {
		el.removeAttribute("data-discrete-gpu");
	}

	const isLow = profile.tier === "potato" || profile.tier === "low";

	if (isLow) {
		el.setAttribute("data-low-spec", "true");
		el.setAttribute("data-perf", "low");
		el.classList.add("low-spec-mode");
		el.classList.add("low-spec-perf");
	} else {
		el.removeAttribute("data-low-spec");
		el.setAttribute(
			"data-perf",
			profile.tier === "ultra" ? "ultra" : "balanced",
		);
		el.classList.remove("low-spec-mode");
		el.classList.remove("low-spec-perf");
	}
}

/**
 * Legacy root applicator for backwards compatibility.
 */
export function applyLowSpecToRoot(isLowSpec: boolean, root?: HTMLElement | null): void {
	const el =
		root ?? (typeof document !== "undefined" ? document.documentElement : null);
	if (!el) return;

	if (isLowSpec) {
		el.setAttribute("data-low-spec", "true");
		el.setAttribute("data-hardware-tier", "low");
		el.setAttribute("data-perf-tier", "low");
		el.setAttribute("data-perf-state", currentPerfState);
		el.setAttribute("data-ct-active", isCtScanActive ? "true" : "false");
		el.setAttribute("data-perf", "low");
		el.classList.add("low-spec-mode");
		el.classList.add("low-spec-perf");
	} else {
		el.removeAttribute("data-low-spec");
		el.setAttribute("data-hardware-tier", "high");
		el.setAttribute("data-perf-tier", "balanced");
		el.setAttribute("data-perf-state", currentPerfState);
		el.setAttribute("data-ct-active", isCtScanActive ? "true" : "false");
		el.setAttribute("data-perf", "high");
		el.classList.remove("low-spec-mode");
		el.classList.remove("low-spec-perf");
	}
}

/**
 * Returns whether low-spec hardware mode is currently active.
 */
export function isLowSpecDevice(): boolean {
	if (typeof document !== "undefined" && document.documentElement) {
		const tier = document.documentElement.getAttribute("data-hardware-tier");
		const perfTier = document.documentElement.getAttribute("data-perf-tier");
		if (tier === "potato" || tier === "low" || perfTier === "potato" || perfTier === "low") return true;
		if (document.documentElement.getAttribute("data-perf-state") === "degraded") return true;
		if (document.documentElement.getAttribute("data-ct-active") === "true") return true;
		if (tier === "balanced" || tier === "ultra" || perfTier === "balanced" || perfTier === "ultra") return false;

		if (document.documentElement.getAttribute("data-low-spec") === "true")
			return true;
		if (document.documentElement.classList.contains("low-spec-mode"))
			return true;
	}
	const profile = getHardwareProfile();
	return profile.tier === "potato" || profile.tier === "low" || currentPerfState === "degraded" || isCtScanActive;
}

/**
 * Returns whether the device is an ultra-high-performance workstation (RTX/Apple Silicon).
 */
export function isUltraWorkstation(): boolean {
	return getHardwareProfile().tier === "ultra";
}

/**
 * Applies will-change: transform strictly during active animation and removes it
 * immediately upon transitionend / animationend to prevent GPU layer memory leaks.
 */
export function attachTemporaryWillChange(
	element: HTMLElement | null,
	property: "transform" | "opacity" | "transform, opacity" = "transform",
): () => void {
	if (!element) return () => {};
	element.style.willChange = property;
	const cleanup = () => {
		element.style.willChange = "auto";
		element.removeEventListener("transitionend", cleanup);
		element.removeEventListener("animationend", cleanup);
	};
	element.addEventListener("transitionend", cleanup, { once: true });
	element.addEventListener("animationend", cleanup, { once: true });
	const timer = setTimeout(cleanup, 600);
	return () => {
		clearTimeout(timer);
		cleanup();
	};
}

export function _resetDomAdapterStateForTests(): void {
	currentPerfState = "healthy";
	isCtScanActive = false;
	perfStateListeners.clear();
	ctActiveListeners.clear();
}
