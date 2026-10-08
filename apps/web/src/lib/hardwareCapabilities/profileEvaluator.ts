/**
 * hardwareCapabilities/profileEvaluator.ts — Layer 2: Composite Scoring & Profile Evaluation Engine
 *
 * Implements hardware performance scoring (0..100), tier classification (potato, low, balanced, ultra),
 * 7-day localStorage caching with hardware fingerprint validation, and manual tier overrides.
 */

import {
	type HardwareTier,
	type HardwareProfile,
} from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../safeLocalStorage";
import type {
	EvaluateProfileOptions,
	ExtendedNavigator,
	HardwareCapabilities,
} from "./types";
import {
	HARDWARE_PROFILE_CACHE_TTL_MS,
	HARDWARE_PROFILE_LEGACY_KEY,
	HARDWARE_PROFILE_SCHEMA_VERSION,
	HARDWARE_PROFILE_STORAGE_KEY,
	HARDWARE_TIER_OVERRIDE_KEY,
	LOW_SPEC_STORAGE_KEY,
	computeHardwareFingerprint,
} from "./constants";
import {
	detectGpuDetails,
	detectHybridGpuStatus,
	getCachedWebGpuInfo,
	runFillrateMicroBenchmark,
} from "./gpuProber";

let inMemoryTierOverride: HardwareTier | null = null;
let activeProfile: HardwareProfile | null = null;
let lastKnownBatteryState: { charging: boolean; level: number } | null = null;

type ProfileUpdateHandler = (profile: HardwareProfile) => void;
let onProfileUpdatedHandler: ProfileUpdateHandler | null = null;

/**
 * Registers side-effect callback (DOM root sync & listener notifications)
 * to maintain strict acyclic DAG layering.
 */
export function registerProfileUpdateHandler(handler: ProfileUpdateHandler | null): void {
	onProfileUpdatedHandler = handler;
}

/**
 * Inspects query string, localStorage, or memory state for explicit tier override:
 * 1. URL: `?perf_tier=potato|low|balanced|ultra` or `?perf-tier=...`
 * 2. URL legacy: `?lowspec=1` (potato) or `?lowspec=0` (balanced)
 * 3. localStorage `dente:hardware-tier-override`
 * 4. localStorage legacy `dente:low-spec-mode`
 */
export function getHardwareTierOverride(): HardwareTier | null {
	if (inMemoryTierOverride !== null) {
		return inMemoryTierOverride;
	}
	if (typeof window === "undefined") return null;

	// 1. URL Query parameter overrides
	try {
		const search = window.location.search;
		if (search) {
			const params = new URLSearchParams(search);
			const tierParam = params.get("perf_tier") ?? params.get("perf-tier");
			if (
				tierParam === "potato" ||
				tierParam === "low" ||
				tierParam === "balanced" ||
				tierParam === "ultra"
			) {
				return tierParam;
			}

			// Legacy flag
			const lowSpecFlag = params.get("lowspec") ?? params.get("low-spec");
			if (lowSpecFlag === "1" || lowSpecFlag === "true") return "potato";
			if (lowSpecFlag === "0" || lowSpecFlag === "false") return "balanced";
		}
	} catch {
		// Ignore URL parsing errors
	}

	// 2. LocalStorage override
	const storedTier = safeLocalStorageGetItem(HARDWARE_TIER_OVERRIDE_KEY);
	if (
		storedTier === "potato" ||
		storedTier === "low" ||
		storedTier === "balanced" ||
		storedTier === "ultra"
	) {
		return storedTier;
	}

	// Legacy stored low-spec flag
	const storedLowSpec = safeLocalStorageGetItem(LOW_SPEC_STORAGE_KEY);
	if (storedLowSpec === "true" || storedLowSpec === "1") return "potato";
	if (storedLowSpec === "false" || storedLowSpec === "0") return "balanced";

	return null;
}

/**
 * Sets explicit manual override for hardware tier.
 */
export function setHardwareTierOverride(tier: HardwareTier | null): void {
	inMemoryTierOverride = tier;
	if (tier === null) {
		safeLocalStorageRemoveItem(HARDWARE_TIER_OVERRIDE_KEY);
		safeLocalStorageRemoveItem(LOW_SPEC_STORAGE_KEY);
	} else {
		safeLocalStorageSetItem(HARDWARE_TIER_OVERRIDE_KEY, tier);
		safeLocalStorageSetItem(
			LOW_SPEC_STORAGE_KEY,
			tier === "potato" || tier === "low" ? "true" : "false",
		);
	}

	// Invalidate and evaluate fresh profile
	const profile = evaluateHardwareProfile({ forceFresh: true });
	onProfileUpdatedHandler?.(profile);
}

// Backwards-compatible alias
export function getLowSpecOverride(): boolean | null {
	const tier = getHardwareTierOverride();
	if (tier === null) return null;
	return tier === "potato" || tier === "low";
}

export function setLowSpecOverride(enabled: boolean | null): void {
	if (enabled === null) {
		setHardwareTierOverride(null);
	} else {
		setHardwareTierOverride(enabled ? "potato" : "balanced");
	}
}

/**
 * Evaluates current host hardware capabilities, checks cache TTL (7 days) and
 * hardware fingerprint, calculates composite score (0..100) and maps to canonical HardwareTier.
 * If fingerprint matches cached profile within 7 days, skips fillrate benchmark (0ms overhead).
 */
export function evaluateHardwareProfile(options?: EvaluateProfileOptions): HardwareProfile {
	const overrideTier = getHardwareTierOverride();

	const nav = (typeof navigator !== "undefined" ? navigator : undefined) as
		| ExtendedNavigator
		| undefined;

	// Collect metrics
	const deviceMemoryGb = typeof nav?.deviceMemory === "number" ? nav.deviceMemory : null;
	const cpuCores = typeof nav?.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null;

	// 1. Check cached profile in localStorage if not forcing fresh evaluation and no URL override
	if (!options?.forceFresh && !overrideTier) {
		try {
			let cachedRaw = safeLocalStorageGetItem(HARDWARE_PROFILE_STORAGE_KEY);
			if (!cachedRaw) {
				cachedRaw = safeLocalStorageGetItem(HARDWARE_PROFILE_LEGACY_KEY);
			}

			if (cachedRaw) {
				const parsed = JSON.parse(cachedRaw) as {
					version?: number;
					cachedAt?: number;
					fingerprint?: string;
					profile?: HardwareProfile;
				};

				if (
					parsed.version === HARDWARE_PROFILE_SCHEMA_VERSION &&
					typeof parsed.cachedAt === "number" &&
					Date.now() - parsed.cachedAt < HARDWARE_PROFILE_CACHE_TTL_MS &&
					parsed.profile?.tier
				) {
					// Verify hardware fingerprint (vendor + renderer + cores + discrete GPU)
					const quickGpu = detectGpuDetails();
					const quickWebGpu = getCachedWebGpuInfo();
					const quickHybrid = detectHybridGpuStatus(quickGpu.renderer, quickGpu.vendor, quickWebGpu);
					const currentFingerprint = computeHardwareFingerprint(
						quickGpu.vendor,
						quickGpu.renderer,
						cpuCores,
						quickHybrid.discreteGpuRenderer,
					);

					if (!parsed.fingerprint || parsed.fingerprint === currentFingerprint) {
						let currentIsBatterySaving = parsed.profile.isBatterySaving;
						if (options?.batteryState) {
							currentIsBatterySaving =
								!options.batteryState.charging && options.batteryState.level <= 0.20;
						} else if (lastKnownBatteryState) {
							currentIsBatterySaving =
								!lastKnownBatteryState.charging && lastKnownBatteryState.level <= 0.20;
						}

						if (currentIsBatterySaving !== parsed.profile.isBatterySaving) {
							const updatedProfile: HardwareProfile = {
								...parsed.profile,
								isBatterySaving: currentIsBatterySaving,
							};
							activeProfile = updatedProfile;
							return updatedProfile;
						}

						activeProfile = parsed.profile;
						return parsed.profile;
					} else {
						// Fingerprint mismatch — evict stale cache
						safeLocalStorageRemoveItem(HARDWARE_PROFILE_STORAGE_KEY);
						safeLocalStorageRemoveItem(HARDWARE_PROFILE_LEGACY_KEY);
					}
				} else {
					// Expired or corrupt cache — evict
					safeLocalStorageRemoveItem(HARDWARE_PROFILE_STORAGE_KEY);
					safeLocalStorageRemoveItem(HARDWARE_PROFILE_LEGACY_KEY);
				}
			}
		} catch {
			// Cache read failure — proceed with fresh evaluation
		}
	}

	let isBatterySaving = false;
	if (options?.batteryState) {
		isBatterySaving =
			!options.batteryState.charging && options.batteryState.level <= 0.20;
	} else if (lastKnownBatteryState) {
		isBatterySaving =
			!lastKnownBatteryState.charging && lastKnownBatteryState.level <= 0.20;
	}

	const isSaveDataActive = Boolean(nav?.connection?.saveData);
	const effectiveConnectionType = nav?.connection?.effectiveType ?? null;

	const prefersReducedMotion =
		typeof window !== "undefined" && typeof window.matchMedia === "function"
			? window.matchMedia("(prefers-reduced-motion: reduce)").matches
			: false;

	const gpu = detectGpuDetails();
	const webgpuInfo = getCachedWebGpuInfo();
	const hybridGpu = detectHybridGpuStatus(gpu.renderer, gpu.vendor, webgpuInfo);
	const effectiveGpuType = hybridGpu.shouldPromoteToDiscrete ? "discrete" : gpu.gpuType;
	const webgpuSupported = typeof navigator !== "undefined" && "gpu" in navigator;
	const fillrateScore = runFillrateMicroBenchmark();
	const isSlowDisk = options?.isSlowDisk;

	const effectiveMaxTextureSize = hybridGpu.shouldPromoteToDiscrete
		? Math.max(gpu.maxTextureSize ?? 8192, 8192)
		: gpu.maxTextureSize;
	const effectiveMax3dTextureSize = hybridGpu.shouldPromoteToDiscrete
		? Math.max(gpu.max3dTextureSize ?? 2048, 2048)
		: gpu.max3dTextureSize;

	const reasons: string[] = [];
	let score = 0;

	// Calculate Score (0..100)
	// A. RAM (0..25 pts)
	if (deviceMemoryGb !== null) {
		if (deviceMemoryGb >= 16) {
			score += 25;
			reasons.push(`ram:16GB+ (+25)`);
		} else if (deviceMemoryGb >= 8) {
			score += 20;
			reasons.push(`ram:${deviceMemoryGb}GB (+20)`);
		} else if (deviceMemoryGb >= 6) {
			score += 15;
			reasons.push(`ram:${deviceMemoryGb}GB (+15)`);
		} else if (deviceMemoryGb >= 4) {
			score += 10;
			reasons.push(`ram:${deviceMemoryGb}GB (+10)`);
		} else {
			score += 4;
			reasons.push(`ram:${deviceMemoryGb}GB (+4)`);
		}
	} else {
		score += 14; // Default unannounced memory
	}

	// B. CPU Cores (0..25 pts)
	if (cpuCores !== null) {
		if (cpuCores >= 16) {
			score += 25;
			reasons.push(`cores:${cpuCores} (+25)`);
		} else if (cpuCores >= 8) {
			score += 20;
			reasons.push(`cores:${cpuCores} (+20)`);
		} else if (cpuCores >= 6) {
			score += 15;
			reasons.push(`cores:${cpuCores} (+15)`);
		} else if (cpuCores >= 4) {
			score += 10;
			reasons.push(`cores:${cpuCores} (+10)`);
		} else {
			score += 4;
			reasons.push(`cores:${cpuCores} (+4)`);
		}
	} else {
		score += 10;
	}

	// C. GPU Class & Fillrate (0..40 pts)
	switch (effectiveGpuType) {
		case "discrete":
			score += 35;
			if (hybridGpu.shouldPromoteToDiscrete) {
				reasons.push(
					`gpu:discrete_awakened (${hybridGpu.discreteGpuRenderer ?? "dGPU"}) (+35)`,
				);
			} else {
				reasons.push(`gpu:discrete (${gpu.renderer ?? "dGPU"}) (+35)`);
			}
			break;
		case "apple_silicon":
			score += 35;
			reasons.push(`gpu:apple_silicon (${gpu.renderer ?? "Apple"}) (+35)`);
			break;
		case "integrated":
			if (fillrateScore !== null && fillrateScore >= 70) {
				score += 20;
				reasons.push(`gpu:integrated_fast (+20)`);
			} else if (fillrateScore !== null && fillrateScore <= 25) {
				score += 8;
				reasons.push(`gpu:integrated_slow (${gpu.renderer ?? "iGPU"}) (+8)`);
			} else {
				score += 14;
				reasons.push(`gpu:integrated (${gpu.renderer ?? "iGPU"}) (+14)`);
			}
			break;
		case "software":
			score += 0;
			reasons.push(`gpu:software_rasterizer (+0)`);
			break;
		case "unknown":
		default:
			score += 10;
			break;
	}

	if (gpu.webgl2Supported) {
		score += 5;
	}

	// D. Penalties
	if (isBatterySaving) {
		score -= 20;
		reasons.push(`battery-saving (-20)`);
	}
	if (isSaveDataActive) {
		score -= 10;
		reasons.push(`save-data-active (-10)`);
	}
	if (effectiveConnectionType === "slow-2g" || effectiveConnectionType === "2g") {
		score -= 15;
		reasons.push(`slow-network:${effectiveConnectionType} (-15)`);
	} else if (effectiveConnectionType === "3g") {
		score -= 8;
		reasons.push(`slow-network:3g (-8)`);
	}
	if (isSlowDisk) {
		score -= 15;
		reasons.push(`slow-hdd (-15)`);
	}
	if (prefersReducedMotion) {
		score -= 5;
		reasons.push(`reduced-motion (-5)`);
	}

	let finalScore = Math.max(0, Math.min(100, Math.round(score)));
	let tier: HardwareTier;

	if (overrideTier !== null) {
		tier = overrideTier;
		finalScore =
			overrideTier === "ultra"
				? 95
				: overrideTier === "balanced"
					? 65
					: overrideTier === "low"
						? 40
						: 15;
		reasons.unshift(`manual-override:${overrideTier}`);
	} else {
		if (finalScore <= 25) {
			tier = "potato";
		} else if (finalScore <= 50) {
			tier = "low";
		} else if (finalScore <= 75) {
			tier = "balanced";
		} else {
			tier = "ultra";
		}
	}

	const profile: HardwareProfile = {
		tier,
		score: finalScore,
		deviceMemoryGb,
		cpuCores,
		gpuType: effectiveGpuType,
		gpuRenderer: gpu.renderer,
		gpuVendor: gpu.vendor,
		webgl2Supported: gpu.webgl2Supported,
		webgpuSupported,
		maxTextureSize: effectiveMaxTextureSize,
		max3dTextureSize: effectiveMax3dTextureSize,
		fillrateScore,
		isBatterySaving,
		isSaveDataActive,
		effectiveConnectionType,
		prefersReducedMotion,
		isSlowDisk,
		isHybridGraphics: hybridGpu.isHybridGraphics,
		discreteGpuRenderer: hybridGpu.discreteGpuRenderer,
		hybridGraphicsNotice: hybridGpu.hybridGraphicsNotice,
		reasons,
		detectedAt: Date.now(),
		version: HARDWARE_PROFILE_SCHEMA_VERSION,
	};

	activeProfile = profile;

	// Save to localStorage if no temporary override is active
	if (overrideTier === null) {
		try {
			safeLocalStorageSetItem(
				HARDWARE_PROFILE_STORAGE_KEY,
				JSON.stringify({
					version: HARDWARE_PROFILE_SCHEMA_VERSION,
					cachedAt: Date.now(),
					fingerprint: computeHardwareFingerprint(
						gpu.vendor,
						gpu.renderer,
						cpuCores,
						hybridGpu.discreteGpuRenderer,
					),
					profile,
				}),
			);
		} catch {
			// ignore storage quota errors
		}
	}

	return profile;
}

/**
 * Clears hardware profile cache from localStorage and resets memory instances.
 */
export function clearHardwareProfileCache(): void {
	safeLocalStorageRemoveItem(HARDWARE_PROFILE_STORAGE_KEY);
	safeLocalStorageRemoveItem(HARDWARE_PROFILE_LEGACY_KEY);
	activeProfile = null;
}

/**
 * Forces re-evaluation of hardware profile (manual trigger from Doctor UI / settings).
 * Clears cache, runs fresh probing and micro-benchmarks, updates root and listeners.
 */
export function reevaluateHardwareProfile(options?: EvaluateProfileOptions): HardwareProfile {
	clearHardwareProfileCache();
	const newProfile = evaluateHardwareProfile({ ...options, forceFresh: true });
	onProfileUpdatedHandler?.(newProfile);
	return newProfile;
}

/**
 * Returns latest known battery state (if probed by Battery API).
 */
export function getBatteryState(): { charging: boolean; level: number } | null {
	return lastKnownBatteryState;
}

export function setInternalBatteryState(state: { charging: boolean; level: number } | null): void {
	lastKnownBatteryState = state;
}

/**
 * Returns whether battery-saving mode is currently active (battery discharging and <= 20%).
 */
export function isBatterySavingActive(): boolean {
	if (lastKnownBatteryState) {
		return !lastKnownBatteryState.charging && lastKnownBatteryState.level <= 0.20;
	}
	return activeProfile?.isBatterySaving ?? false;
}

/**
 * Returns currently active hardware profile (evaluating on first access).
 */
export function getHardwareProfile(): HardwareProfile {
	if (activeProfile !== null) {
		return activeProfile;
	}
	return evaluateHardwareProfile();
}

/**
 * Returns legacy HardwareCapabilities structure for backwards compatibility.
 */
export function detectHardwareCapabilities(batteryState?: {
	charging: boolean;
	level: number;
}): HardwareCapabilities {
	const profile = evaluateHardwareProfile({ batteryState });
	const isLowSpec = profile.tier === "potato" || profile.tier === "low";

	return {
		deviceMemoryGb: profile.deviceMemoryGb,
		cpuCores: profile.cpuCores,
		isBatterySaving: profile.isBatterySaving,
		isSaveDataActive: profile.isSaveDataActive,
		prefersReducedMotion: profile.prefersReducedMotion,
		gpuRenderer: profile.gpuRenderer,
		isIntegratedGpu:
			profile.gpuType === "integrated" || profile.gpuType === "software",
		isLowSpec,
		reasons: [...profile.reasons],
	};
}

export function _resetEvaluatorStateForTests(): void {
	activeProfile = null;
	lastKnownBatteryState = null;
	inMemoryTierOverride = null;
}
