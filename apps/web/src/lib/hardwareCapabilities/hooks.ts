/**
 * apps/web/src/lib/hardwareCapabilities/hooks.ts
 *
 * Layer 4: React hooks, subscription listeners, and lifecycle initialization.
 * Zero circular dependencies: imports from Layer 0 (types, constants), Layer 1 (gpuProber),
 * Layer 2 (profileEvaluator), and Layer 3 (domAdapter).
 */

import { useState, useEffect } from "react";
import { clientLogger } from "../../utils/logger";
import type {
	HardwareProfile,
	HardwareTier,
	HardwareAdaptiveSettings,
	PerfState,
	HardwareCapabilities,
	HardwareProfileListener,
	LegacyHardwareListener,
	ExtendedNavigator,
} from "./types";
import { getHardwareAdaptiveSettings } from "./constants";
import { probeWebGpuAdapter, _resetGpuProberStateForTests } from "./gpuProber";
import {
	getHardwareProfile,
	evaluateHardwareProfile,
	registerProfileUpdateHandler,
	setInternalBatteryState,
	_resetEvaluatorStateForTests,
} from "./profileEvaluator";
import {
	applyHardwareProfileToRoot,
	getPerfState,
	onPerfStateChange,
	setDynamicPerfState,
	getCtScanActive,
	onCtActiveChange,
	setCtScanActive,
	_resetDomAdapterStateForTests,
} from "./domAdapter";

// ============================================================================
// REACT HOOKS & SUBSCRIPTIONS
// ============================================================================

const profileListeners = new Set<HardwareProfileListener>();
const legacyListeners = new Set<LegacyHardwareListener>();

// Wire profile evaluator callback to DOM adapter and subscriber notifications
registerProfileUpdateHandler((updated: HardwareProfile) => {
	applyHardwareProfileToRoot(updated);
	notifyListeners(updated);
});

function notifyListeners(profile: HardwareProfile): void {
	for (const listener of profileListeners) {
		try {
			listener(profile);
		} catch (listenerErr) {
			console.warn("[hardwareCapabilities] Profile listener error", listenerErr);
		}
	}

	const legacyCaps: HardwareCapabilities = {
		deviceMemoryGb: profile.deviceMemoryGb,
		cpuCores: profile.cpuCores,
		isBatterySaving: profile.isBatterySaving,
		isSaveDataActive: profile.isSaveDataActive,
		prefersReducedMotion: profile.prefersReducedMotion,
		gpuRenderer: profile.gpuRenderer,
		isIntegratedGpu:
			profile.gpuType === "integrated" || profile.gpuType === "software",
		isLowSpec: profile.tier === "potato" || profile.tier === "low",
		reasons: [...profile.reasons],
	};

	for (const listener of legacyListeners) {
		try {
			listener(legacyCaps);
		} catch (listenerErr) {
			console.warn("[hardwareCapabilities] Legacy listener error", listenerErr);
		}
	}
}

/**
 * Subscribes to hardware profile changes (battery, overrides, network transitions).
 */
export function onHardwareProfileChange(
	listener: HardwareProfileListener,
): () => void {
	profileListeners.add(listener);
	return () => {
		profileListeners.delete(listener);
	};
}

export function subscribeToHardwareProfile(
	listener: HardwareProfileListener,
): () => void {
	return onHardwareProfileChange(listener);
}

export function subscribeToHardwareChanges(
	listener: LegacyHardwareListener,
): () => void {
	legacyListeners.add(listener);
	return () => {
		legacyListeners.delete(listener);
	};
}

/**
 * React hook returning the live hardware profile.
 */
export function useHardwareProfile(): HardwareProfile {
	const [profile, setProfile] = useState<HardwareProfile>(() => getHardwareProfile());

	useEffect(() => {
		const unsubscribe = onHardwareProfileChange((newProfile) => {
			setProfile(newProfile);
		});
		return unsubscribe;
	}, []);

	return profile;
}

/**
 * React hook returning the active hardware tier: "potato" | "low" | "balanced" | "ultra".
 */
export function useHardwareTier(): HardwareTier {
	const profile = useHardwareProfile();
	return profile.tier;
}

/**
 * React hook returning the adaptive settings (blur, shadows, virtualization, debounces).
 */
export function useHardwareAdaptiveSettings(): HardwareAdaptiveSettings {
	const profile = useHardwareProfile();
	return getHardwareAdaptiveSettings(profile.tier, {
		isBatterySaving: profile.isBatterySaving,
	});
}

/**
 * Legacy hook returning whether client is running on low-spec hardware.
 */
export function useLowSpecHardware(): boolean {
	const tier = useHardwareTier();
	return tier === "potato" || tier === "low";
}

/**
 * React hook returning the active performance tier ("potato" | "low" | "balanced" | "ultra").
 */
export function usePerfTier(): HardwareTier {
	return useHardwareTier();
}

/**
 * React hook returning the live dynamic performance state ("healthy" | "degraded").
 */
export function usePerfState(): PerfState {
	const [state, setState] = useState<PerfState>(() => getPerfState());

	useEffect(() => {
		const unsub = onPerfStateChange((s) => setState(s));
		const onEvent = (e: Event) => {
			const detail = (e as CustomEvent<{ perfState?: PerfState }>).detail;
			if (detail?.perfState) {
				setState(detail.perfState);
			}
		};
		if (typeof window !== "undefined") {
			window.addEventListener("dente:perf-state-changed", onEvent);
		}
		return () => {
			unsub();
			if (typeof window !== "undefined") {
				window.removeEventListener("dente:perf-state-changed", onEvent);
			}
		};
	}, []);

	return state;
}

/**
 * React hook returning true if dynamic performance is currently degraded.
 */
export function useIsDegraded(): boolean {
	const state = usePerfState();
	return state === "degraded";
}

/**
 * React hook returning true if CT 3D/DICOM scan is currently active.
 */
export function useIsCtActive(): boolean {
	const [active, setActive] = useState<boolean>(() => getCtScanActive());

	useEffect(() => {
		const unsub = onCtActiveChange((a) => setActive(a));
		const onEvent = (e: Event) => {
			const detail = (e as CustomEvent<{ isCtActive?: boolean }>).detail;
			if (typeof detail?.isCtActive === "boolean") {
				setActive(detail.isCtActive);
			}
		};
		if (typeof window !== "undefined") {
			window.addEventListener("dente:ct-active-changed", onEvent);
		}
		return () => {
			unsub();
			if (typeof window !== "undefined") {
				window.removeEventListener("dente:ct-active-changed", onEvent);
			}
		};
	}, []);

	return active;
}

// ============================================================================
// LIFECYCLE & BACKGROUND TELEMETRY INITIALIZATION
// ============================================================================

let isInitialized = false;

/**
 * Initializes hardware capabilities detection, applies data-hardware-tier to root,
 * and sets up dynamic battery & media listeners.
 */
export function initHardwareCapabilities(): HardwareProfile {
	const profile = evaluateHardwareProfile();
	applyHardwareProfileToRoot(profile);

	if (isInitialized || typeof window === "undefined") {
		return profile;
	}
	isInitialized = true;

	// Dynamic listener for CT 3D scans and performance telemetry events
	if (typeof window !== "undefined") {
		const handleCtChange = (e: Event) => {
			const detail = (e as CustomEvent<{ isCtActive?: boolean }>).detail;
			if (typeof detail?.isCtActive === "boolean") {
				setCtScanActive(detail.isCtActive);
			}
		};
		window.addEventListener("dente:ct-active-changed", handleCtChange);

		// Synchronize with runtimePerformanceMonitor telemetry
		import("../../utils/telemetry/runtimePerformanceMonitor.js")
			.then((mod) => {
				mod.subscribeToPerformanceStateChange((snapshot) => {
					const isDegraded =
						snapshot.state === "DEGRADED" || snapshot.state === "CRITICAL";
					setDynamicPerfState(isDegraded ? "degraded" : "healthy");
				});
			})
			.catch((err) => {
				clientLogger.debug("[hardwareCapabilities] Telemetry subscription unavailable", err);
			});
	}

	// Dynamic battery watcher
	const nav = navigator as ExtendedNavigator;
	if (typeof nav.getBattery === "function") {
		nav.getBattery()
			.then((battery) => {
				const updateBattery = () => {
					setInternalBatteryState({
						charging: battery.charging,
						level: battery.level,
					});
					const isBatterySaving = !battery.charging && battery.level <= 0.20;

					try {
						import("../../utils/telemetry/runtimePerformanceMonitor.js")
							.then((mod) => {
								mod.getRuntimePerformanceMonitor().setBatteryThrottling(isBatterySaving);
							})
							.catch((err) => {
								clientLogger.debug("[hardwareCapabilities] Battery telemetry update skipped", err);
							});
					} catch (importErr) {
						clientLogger.debug("[hardwareCapabilities] Dynamic telemetry import error", importErr);
					}

					const updatedProfile = evaluateHardwareProfile({
						forceFresh: true,
						batteryState: {
							charging: battery.charging,
							level: battery.level,
						},
					});
					applyHardwareProfileToRoot(updatedProfile);
					notifyListeners(updatedProfile);
				};

				updateBattery();

				battery.addEventListener?.("chargingchange", updateBattery);
				battery.addEventListener?.("levelchange", updateBattery);
			})
			.catch((batteryErr) => {
				clientLogger.debug("[hardwareCapabilities] Battery API unavailable", batteryErr);
			});
	}

	// Dynamic reduced-motion watcher
	if (typeof window.matchMedia === "function") {
		try {
			const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
			const onMotionChange = () => {
				const updated = evaluateHardwareProfile({ forceFresh: true });
				applyHardwareProfileToRoot(updated);
				notifyListeners(updated);
			};
			if (typeof mql.addEventListener === "function") {
				mql.addEventListener("change", onMotionChange);
			} else if (typeof mql.addListener === "function") {
				mql.addListener(onMotionChange);
			}
		} catch (mediaErr) {
			clientLogger.debug("[hardwareCapabilities] MatchMedia listener unavailable", mediaErr);
		}
	}

	// Dynamic background probe for slow mechanical HDD (5400 RPM / low-spec I/O)
	if (
		typeof window !== "undefined" &&
		typeof window.indexedDB !== "undefined" &&
		typeof process !== "undefined" &&
		process.env?.NODE_ENV !== "test"
	) {
		const runDiskBenchmark = () => {
			import("../../utils/lowSpecHddOptimizer.js")
				.then((m) => m.measureIndexedDbDiskSpeed())
				.then((res) => {
					if (res?.isSlowDisk) {
						const updated = evaluateHardwareProfile({
							forceFresh: true,
							isSlowDisk: true,
						});
						applyHardwareProfileToRoot(updated);
						notifyListeners(updated);
					}
				})
				.catch((diskErr) => {
					clientLogger.debug("[hardwareCapabilities] Disk benchmark skipped", diskErr);
				});
		};
		const idleWindow: Window & { requestIdleCallback?: (cb: () => void) => void } = window;
		if (typeof idleWindow.requestIdleCallback === "function") {
			idleWindow.requestIdleCallback(runDiskBenchmark);
		} else {
			setTimeout(runDiskBenchmark, 1000);
		}
	}

	// Dynamic background auto-awakening of discrete GPU via WebGPU DXGI requestAdapter
	if (
		typeof window !== "undefined" &&
		typeof navigator !== "undefined" &&
		"gpu" in navigator &&
		navigator.gpu
	) {
		probeWebGpuAdapter()
			.then((probed) => {
				if (probed && probed.isDiscrete) {
					const current = getHardwareProfile();
					if (
						!current.isHybridGraphics ||
						current.gpuType !== "discrete" ||
						!current.discreteGpuRenderer
					) {
						const fresh = evaluateHardwareProfile({ forceFresh: true });
						applyHardwareProfileToRoot(fresh);
						notifyListeners(fresh);
					}
				}
			})
			.catch((gpuErr) => {
				clientLogger.debug("[hardwareCapabilities] WebGPU adapter probe skipped", gpuErr);
			});
	}

	return profile;
}

// ============================================================================
// TEST HOOKS & CACHE RESET
// ============================================================================

/**
 * Test helper to reset internal profiler cache, state, and subscriptions.
 */
export function _resetHardwareProfileCacheForTests(): void {
	_resetGpuProberStateForTests();
	_resetEvaluatorStateForTests();
	_resetDomAdapterStateForTests();
	isInitialized = false;
	profileListeners.clear();
	legacyListeners.clear();
}

// Initialization is explicitly invoked by main.tsx (initHardwareCapabilities()) to avoid import side-effects.
