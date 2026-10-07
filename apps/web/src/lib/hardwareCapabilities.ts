/**
 * hardwareCapabilities.ts — Universal Hardware Profiler & Performance Adaptation Engine
 *
 * CANONICAL ENGINE FOR HARDWARE EVALUATION & ADAPTATION:
 * 1. Probes hardware parameters at boot (<15ms): CPU logical cores, RAM (with privacy sandbox
 *    clamping awareness), WebGL2/WebGPU, GPU renderer (discrete vs integrated vs Apple Silicon
 *    vs software), screen fillrate micro-benchmark (<10ms with guaranteed WebGL context teardown).
 * 2. Collects network and energy telemetry: navigator.connection (Save-Data, effectiveType: 2g/3g/4g),
 *    Battery API (battery saving <= 20% on discharge).
 * 3. Integrates disk speed heuristics (mechanical 5400 RPM HDD vs SSD).
 * 4. Computes Hardware Capability Score (0..100) and maps to canonical HardwareTier:
 *    - "potato" (0..25): Celeron/Atom, <=4GB RAM, software/Intel HD, or slow mechanical HDD
 *    - "low" (26..50): Office desktop/laptop, 4-6 cores, 4-6GB RAM, Intel UHD
 *    - "balanced" (51..75): Standard clinic PC, 6-8 cores, 8-16GB RAM, modern iGPU/entry dGPU
 *    - "ultra" (76..100): High-end workstation (RTX/Apple Silicon), 8+ cores, 16+GB RAM, CBCT ready
 * 5. Applies adaptive CSS classes and DOM attributes (data-hardware-tier, data-low-spec, data-perf).
 * 6. Supports 24h localStorage TTL caching and instant manual URL override:
 *    `?perf_tier=potato|low|balanced|ultra`
 * 7. Exports reactive hooks: `useHardwareProfile()`, `useHardwareTier()`, `useHardwareAdaptiveSettings()`.
 */

import { useEffect, useState } from "react";
import {
	type HardwareTier,
	type HardwareGpuType,
	type HardwareProfile,
	type HardwareAdaptiveSettings,
	getHardwareAdaptiveSettings,
} from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "./safeLocalStorage";

// ============================================================================
// CONSTANTS & KEYS
// ============================================================================

export const LOW_SPEC_STORAGE_KEY = "dente:low-spec-mode";
export const HARDWARE_PROFILE_STORAGE_KEY = "dente_hardware_profile_v1";
export const HARDWARE_PROFILE_LEGACY_KEY = "dente:hardware-profile-v1";
export const HARDWARE_TIER_OVERRIDE_KEY = "dente:hardware-tier-override";
export const HARDWARE_PROFILE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (604,800,000 ms)
export const HARDWARE_PROFILE_SCHEMA_VERSION = 1;

/**
 * Computes deterministic hardware fingerprint string from vendor, renderer, and CPU cores.
 * Used for instant cache validation (0ms overhead on F5) and automatic cache invalidation
 * if physical GPU hardware or CPU topology changes.
 */
export function computeHardwareFingerprint(
	vendor: string | null,
	renderer: string | null,
	cpuCores: number | null,
	discreteGpu?: string | null,
): string {
	const v = (vendor ?? "unknown").trim().toLowerCase();
	const r = (renderer ?? "unknown").trim().toLowerCase();
	const c = cpuCores ?? "unknown";
	const base = `${v}|${r}|${c}`;
	if (discreteGpu && discreteGpu.trim().length > 0) {
		return `${base}|${discreteGpu.trim().toLowerCase()}`;
	}
	return base;
}

/**
 * Legacy interface retained for 100% backwards compatibility with existing call sites.
 */
export interface HardwareCapabilities {
	/** Estimated device memory in GiB from navigator.deviceMemory */
	deviceMemoryGb: number | null;
	/** Number of logical processor cores from navigator.hardwareConcurrency */
	cpuCores: number | null;
	/** Whether device is running on low battery / battery saver */
	isBatterySaving: boolean;
	/** Whether browser network/system reports Save-Data mode */
	isSaveDataActive: boolean;
	/** Whether OS preference prefers reduced motion */
	prefersReducedMotion: boolean;
	/** Detected GPU renderer string from WebGL debug info, if available */
	gpuRenderer: string | null;
	/** Whether the GPU appears to be integrated / low-spec (Intel HD, software) */
	isIntegratedGpu: boolean;
	/** Whether low-spec hardware profile is active (tier === "potato" || tier === "low") */
	isLowSpec: boolean;
	/** Reasons that triggered tier activation */
	reasons: string[];
}

interface ExtendedNavigator extends Navigator {
	deviceMemory?: number;
	connection?: {
		saveData?: boolean;
		effectiveType?: string;
	};
	getBattery?: () => Promise<{
		charging: boolean;
		level: number;
		addEventListener?: (type: string, listener: () => void) => void;
		removeEventListener?: (type: string, listener: () => void) => void;
	}>;
}

// ============================================================================
// 1. GPU PROBING WITH SAFE WEBGL CONTEXT TEARDOWN
// ============================================================================

interface GpuDetails {
	renderer: string | null;
	vendor: string | null;
	gpuType: HardwareGpuType;
	webgl2Supported: boolean;
	maxTextureSize: number | null;
	max3dTextureSize: number | null;
}

let cachedGpuDetails: GpuDetails | null = null;

/**
 * Classifies GPU architecture from unmasked renderer and vendor strings.
 */
export function classifyGpuArchitecture(
	renderer: string | null,
	vendor: string | null,
): HardwareGpuType {
	const raw = `${vendor ?? ""} ${renderer ?? ""}`.toLowerCase();
	if (!raw.trim()) return "unknown";
	const str = raw.replace(/\((r|tm)\)/gi, " ").replace(/\s+/g, " ");

	// 1. Software rasterizers
	if (
		str.includes("swiftshader") ||
		str.includes("llvmpipe") ||
		str.includes("softpipe") ||
		str.includes("software rasterizer") ||
		str.includes("basic render") ||
		str.includes("microsoft basic")
	) {
		return "software";
	}

	// 2. Apple Silicon (M1/M2/M3/M4 / Apple GPU)
	if (
		str.includes("apple") &&
		(str.includes("m1") ||
			str.includes("m2") ||
			str.includes("m3") ||
			str.includes("m4") ||
			str.includes("gpu"))
	) {
		return "apple_silicon";
	}

	// 3. Discrete GPUs (NVIDIA, AMD Radeon RX/Pro, Intel Arc)
	if (
		str.includes("nvidia") ||
		str.includes("geforce") ||
		str.includes("quadro") ||
		str.includes("rtx") ||
		str.includes("gtx") ||
		(str.includes("radeon") &&
			(str.includes("rx") || str.includes("pro") || str.includes("xt"))) ||
		str.includes("arc ") ||
		str.includes("arc(") ||
		str.includes("arc a") ||
		str.includes("intel arc") ||
		str.includes("iris xe max")
	) {
		return "discrete";
	}

	// 4. Integrated GPUs (Intel HD/UHD/Iris, AMD Radeon APU, mobile GPUs)
	if (
		str.includes("intel") ||
		str.includes("hd graphics") ||
		str.includes("uhd graphics") ||
		str.includes("iris") ||
		str.includes("adreno") ||
		str.includes("mali") ||
		str.includes("powervr") ||
		str.includes("radeon")
	) {
		return "integrated";
	}

	return "unknown";
}

// ============================================================================
// 1b. WEBGPU ADAPTER ENUMERATION & HYBRID DUAL-GPU AUTO-AWAKENING
// ============================================================================

export interface WebGpuAdapterInfo {
	vendor: string | null;
	architecture: string | null;
	device: string | null;
	description: string | null;
	isDiscrete: boolean;
}

export interface HybridGpuDetectionResult {
	isHybridGraphics: boolean;
	primaryRenderer: string | null;
	discreteGpuRenderer: string | null;
	hybridGraphicsNotice: string | null;
	shouldPromoteToDiscrete: boolean;
}

let cachedWebGpuInfo: WebGpuAdapterInfo | null = null;

export const WEBGPU_ADAPTER_STORAGE_KEY = "dente:webgpu-adapter-info";

/**
 * Evaluates whether a WebGPU adapter description/vendor represents a high-performance discrete GPU.
 */
export function classifyWebGpuAdapter(
	info: Partial<WebGpuAdapterInfo> | null | undefined,
): boolean {
	if (!info) return false;
	const raw = `${info.vendor ?? ""} ${info.architecture ?? ""} ${info.device ?? ""} ${info.description ?? ""}`.toLowerCase();
	if (!raw.trim()) return false;
	const str = raw.replace(/\((r|tm)\)/gi, " ").replace(/\s+/g, " ");

	return (
		str.includes("nvidia") ||
		str.includes("geforce") ||
		str.includes("quadro") ||
		str.includes("rtx") ||
		str.includes("gtx") ||
		(str.includes("radeon") &&
			(str.includes("rx") || str.includes("pro") || str.includes("xt") || str.includes("discrete"))) ||
		str.includes("arc ") ||
		str.includes("arc(") ||
		str.includes("arc a") ||
		str.includes("intel arc") ||
		str.includes("iris xe max")
	);
}

/**
 * Detects hybrid dual-GPU topologies (e.g. Intel Iris/UHD iGPU primary + NVIDIA RTX/AMD dGPU).
 * If a discrete GPU is discovered via WebGPU DXGI enumeration or ANGLE, marks the system
 * for auto-promotion to high-performance tier (Ultra/Balanced) so doctor CBCT 3D volume
 * raymarching does not run in crippled low-spec mode.
 */
export function detectHybridGpuStatus(
	webglRenderer: string | null,
	webglVendor: string | null,
	webgpuInfo: WebGpuAdapterInfo | null,
): HybridGpuDetectionResult {
	const webglArch = classifyGpuArchitecture(webglRenderer, webglVendor);

	// Scenario 1: WebGL already runs directly on a discrete GPU
	if (webglArch === "discrete") {
		return {
			isHybridGraphics: false,
			primaryRenderer: webglRenderer,
			discreteGpuRenderer: webglRenderer,
			hybridGraphicsNotice: null,
			shouldPromoteToDiscrete: false,
		};
	}

	// Scenario 2: Discrete GPU detected via WebGPU DXGI adapter auto-awakening
	if (webgpuInfo && (webgpuInfo.isDiscrete || classifyWebGpuAdapter(webgpuInfo))) {
		const discreteName =
			webgpuInfo.description ||
			webgpuInfo.architecture ||
			webgpuInfo.vendor ||
			"NVIDIA / AMD Discrete Accelerator";

		return {
			isHybridGraphics: true,
			primaryRenderer: webglRenderer,
			discreteGpuRenderer: discreteName,
			hybridGraphicsNotice: `Обнаружен аппаратный ускоритель ${discreteName} (WebGPU DXGI). Высокопроизводительный профиль КЛКТ активирован автоматически.`,
			shouldPromoteToDiscrete: true,
		};
	}

	// Scenario 3: Running on integrated GPU (Intel HD/UHD/Iris, AMD APU) with no discrete GPU awakened
	if (webglArch === "integrated") {
		return {
			isHybridGraphics: false,
			primaryRenderer: webglRenderer,
			discreteGpuRenderer: null,
			hybridGraphicsNotice:
				"Активен базовый рендер (Intel iGPU). Для ноутбуков с двойной графикой (NVIDIA Optimus) назначьте браузеру режим «Высокая производительность» в параметрах графики Windows.",
			shouldPromoteToDiscrete: false,
		};
	}

	// Scenario 4: Apple Silicon, Software or Unknown
	return {
		isHybridGraphics: false,
		primaryRenderer: webglRenderer,
		discreteGpuRenderer: null,
		hybridGraphicsNotice: null,
		shouldPromoteToDiscrete: false,
	};
}

/**
 * Probes WebGPU adapter with 'high-performance' power preference.
 * On dual-GPU laptops (NVIDIA Optimus / AMD Enduro), this signals the OS/DXGI runtime
 * to query the discrete GPU, causing it to report its device description (e.g. RTX 3060).
 */
export async function probeWebGpuAdapter(): Promise<WebGpuAdapterInfo | null> {
	if (cachedWebGpuInfo !== null) {
		return cachedWebGpuInfo;
	}

	// Check local storage persistence first
	try {
		const stored = safeLocalStorageGetItem(WEBGPU_ADAPTER_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as WebGpuAdapterInfo;
			if (parsed && typeof parsed.isDiscrete === "boolean") {
				cachedWebGpuInfo = parsed;
				return parsed;
			}
		}
	} catch {
		// ignore
	}

	if (typeof navigator === "undefined" || !("gpu" in navigator) || !(navigator as any).gpu) {
		return null;
	}

	try {
		const gpu = (navigator as any).gpu;
		if (!gpu || typeof gpu.requestAdapter !== "function") {
			return null;
		}
		const adapter = await gpu.requestAdapter({
			powerPreference: "high-performance",
		});
		if (!adapter) {
			return null;
		}

		let rawInfo: any = null;
		if ("info" in adapter && (adapter as any).info) {
			rawInfo = (adapter as any).info;
		} else if (typeof (adapter as any).requestAdapterInfo === "function") {
			rawInfo = await (adapter as any).requestAdapterInfo();
		}

		const vendor = typeof rawInfo?.vendor === "string" ? rawInfo.vendor : null;
		const architecture = typeof rawInfo?.architecture === "string" ? rawInfo.architecture : null;
		const device = typeof rawInfo?.device === "string" ? rawInfo.device : null;
		const description = typeof rawInfo?.description === "string" ? rawInfo.description : null;

		const isDiscrete = classifyWebGpuAdapter({ vendor, architecture, device, description });

		const result: WebGpuAdapterInfo = {
			vendor,
			architecture,
			device,
			description,
			isDiscrete,
		};

		cachedWebGpuInfo = result;

		try {
			safeLocalStorageSetItem(WEBGPU_ADAPTER_STORAGE_KEY, JSON.stringify(result));
		} catch {
			// ignore storage quota
		}

		return result;
	} catch {
		return null;
	}
}

export function getCachedWebGpuInfo(): WebGpuAdapterInfo | null {
	if (cachedWebGpuInfo !== null) return cachedWebGpuInfo;
	try {
		const stored = safeLocalStorageGetItem(WEBGPU_ADAPTER_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as WebGpuAdapterInfo;
			if (parsed && typeof parsed.isDiscrete === "boolean") {
				cachedWebGpuInfo = parsed;
				return parsed;
			}
		}
	} catch {
		// ignore
	}
	return null;
}

/**
 * Probes WebGL 1/2 capabilities and safely tears down the context
 * via WEBGL_lose_context to avoid exhausting the browser's context pool.
 */
export function detectGpuDetails(): GpuDetails {
	if (cachedGpuDetails !== null) {
		return cachedGpuDetails;
	}

	if (typeof document === "undefined" && typeof OffscreenCanvas === "undefined") {
		return {
			renderer: null,
			vendor: null,
			gpuType: "unknown",
			webgl2Supported: false,
			maxTextureSize: null,
			max3dTextureSize: null,
		};
	}

	let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
	let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
	let isWebgl2 = false;

	try {
		if (typeof OffscreenCanvas !== "undefined") {
			canvas = new OffscreenCanvas(32, 32);
		} else if (typeof document !== "undefined") {
			canvas = document.createElement("canvas");
			canvas.width = 32;
			canvas.height = 32;
		}

		if (canvas) {
			try {
				gl = canvas.getContext("webgl2", {
					powerPreference: "high-performance",
					desynchronized: true,
				}) as WebGL2RenderingContext | null;
				if (gl) isWebgl2 = true;
			} catch {
				gl = null;
			}

			if (!gl) {
				try {
					gl = (canvas.getContext("webgl", {
						powerPreference: "high-performance",
						desynchronized: true,
					}) ||
						canvas.getContext("experimental-webgl" as any, {
							powerPreference: "high-performance",
							desynchronized: true,
						})) as WebGLRenderingContext | null;
				} catch {
					gl = null;
				}
			}
		}

		if (!gl) {
			const fallback: GpuDetails = {
				renderer: null,
				vendor: null,
				gpuType: "unknown",
				webgl2Supported: false,
				maxTextureSize: null,
				max3dTextureSize: null,
			};
			cachedGpuDetails = fallback;
			return fallback;
		}

		let renderer: string | null = null;
		let vendor: string | null = null;

		try {
			const ext = gl.getExtension("WEBGL_debug_renderer_info") as {
				UNMASKED_RENDERER_WEBGL: number;
				UNMASKED_VENDOR_WEBGL: number;
			} | null;

			if (ext) {
				const r = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
				if (typeof r === "string" && r.trim().length > 0) renderer = r.trim();
				const v = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
				if (typeof v === "string" && v.trim().length > 0) vendor = v.trim();
			}
		} catch {
			// Extension blocked by security/privacy policy
		}

		if (!renderer) {
			try {
				const r = gl.getParameter(gl.RENDERER);
				if (typeof r === "string" && r.trim().length > 0) renderer = r.trim();
			} catch {
				// ignore
			}
		}

		if (!vendor) {
			try {
				const v = gl.getParameter(gl.VENDOR);
				if (typeof v === "string" && v.trim().length > 0) vendor = v.trim();
			} catch {
				// ignore
			}
		}

		let maxTextureSize: number | null = null;
		let max3dTextureSize: number | null = null;

		try {
			const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
			if (typeof maxTex === "number") maxTextureSize = maxTex;
		} catch {
			// ignore
		}

		if (isWebgl2 && "MAX_3D_TEXTURE_SIZE" in gl) {
			try {
				const max3d = gl.getParameter((gl as WebGL2RenderingContext).MAX_3D_TEXTURE_SIZE);
				if (typeof max3d === "number") max3dTextureSize = max3d;
			} catch {
				// ignore
			}
		}

		const gpuType = classifyGpuArchitecture(renderer, vendor);

		const result: GpuDetails = {
			renderer,
			vendor,
			gpuType,
			webgl2Supported: isWebgl2,
			maxTextureSize,
			max3dTextureSize,
		};
		cachedGpuDetails = result;
		return result;
	} finally {
		// Mandatory context teardown (Blind-Spot Radar #2)
		if (gl) {
			try {
				const loseExt = gl.getExtension("WEBGL_lose_context") as {
					loseContext: () => void;
				} | null;
				loseExt?.loseContext();
			} catch {
				// ignore teardown errors
			}
		}
	}
}

// ============================================================================
// 2. ULTRA-FAST FILLRATE MICRO-BENCHMARK (<10ms)
// ============================================================================

let cachedFillrateScore: number | null = null;

/**
 * Runs a micro-benchmark (rendering 3 simple color fills on an offscreen canvas)
 * to measure GPU raster fillrate without triggering browser Long Tasks (>20ms).
 */
export function runFillrateMicroBenchmark(): number | null {
	if (cachedFillrateScore !== null) {
		return cachedFillrateScore;
	}
	if (typeof document === "undefined" && typeof OffscreenCanvas === "undefined") {
		return null;
	}
	if (typeof performance === "undefined" || typeof performance.now !== "function") {
		return null;
	}

	let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
	let gl: WebGLRenderingContext | null = null;

	try {
		if (typeof OffscreenCanvas !== "undefined") {
			canvas = new OffscreenCanvas(128, 128);
		} else if (typeof document !== "undefined") {
			canvas = document.createElement("canvas");
			canvas.width = 128;
			canvas.height = 128;
		}
		if (!canvas) return null;

		gl = (canvas.getContext("webgl", { powerPreference: "high-performance" }) ||
			canvas.getContext("experimental-webgl" as any, { powerPreference: "high-performance" })) as WebGLRenderingContext | null;
		if (!gl) return null;

		const t0 = performance.now();
		gl.viewport(0, 0, 128, 128);

		for (let i = 0; i < 3; i++) {
			gl.clearColor((i * 0.3) % 1.0, 0.4, 0.7, 1.0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.finish();
		}
		const durationMs = performance.now() - t0;

		let score = 50;
		if (durationMs <= 2.5) {
			score = 100;
		} else if (durationMs <= 6.0) {
			score = 80;
		} else if (durationMs <= 14.0) {
			score = 50;
		} else if (durationMs <= 25.0) {
			score = 25;
		} else {
			score = 10;
		}

		cachedFillrateScore = score;
		return score;
	} catch {
		return null;
	} finally {
		if (gl) {
			try {
				const loseExt = gl.getExtension("WEBGL_lose_context") as {
					loseContext: () => void;
				} | null;
				loseExt?.loseContext();
			} catch {
				// ignore
			}
		}
	}
}

// ============================================================================
// 3. HARDWARE TIER OVERRIDE RESOLUTION (URL, STORAGE, MEMORY)
// ============================================================================

let inMemoryTierOverride: HardwareTier | null = null;

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
	applyHardwareProfileToRoot(profile);
	notifyListeners(profile);
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

// ============================================================================
// 4. CANONICAL HARDWARE PROFILE EVALUATION ENGINE
// ============================================================================

export interface EvaluateProfileOptions {
	forceFresh?: boolean | undefined;
	batteryState?: { charging: boolean; level: number } | undefined;
	isSlowDisk?: boolean | undefined;
}

let activeProfile: HardwareProfile | null = null;
let lastKnownBatteryState: { charging: boolean; level: number } | null = null;

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
						// Cache hit! Skip fillrate benchmark completely (0ms overhead).
						if (parsed.profile.fillrateScore !== null && parsed.profile.fillrateScore !== undefined) {
							cachedFillrateScore = parsed.profile.fillrateScore;
						}

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
	safeLocalStorageRemoveItem(WEBGPU_ADAPTER_STORAGE_KEY);
	activeProfile = null;
	cachedFillrateScore = null;
	cachedWebGpuInfo = null;
}

/**
 * Forces re-evaluation of hardware profile (manual trigger from Doctor UI / settings).
 * Clears cache, runs fresh probing and micro-benchmarks, updates root and listeners.
 */
export function reevaluateHardwareProfile(options?: EvaluateProfileOptions): HardwareProfile {
	clearHardwareProfileCache();
	const newProfile = evaluateHardwareProfile({ ...options, forceFresh: true });
	applyHardwareProfileToRoot(newProfile);
	notifyListeners(newProfile);
	return newProfile;
}

/**
 * Returns latest known battery state (if probed by Battery API).
 */
export function getBatteryState(): { charging: boolean; level: number } | null {
	return lastKnownBatteryState;
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

// ============================================================================
// 5. DOM ATTRIBUTES & CSS APPLICATION
// ============================================================================

export type PerfState = "healthy" | "degraded";

let currentPerfState: PerfState = "healthy";
let isCtScanActive = false;

type PerfStateListener = (state: PerfState) => void;
type CtActiveListener = (active: boolean) => void;

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

// ============================================================================
// 6. REACT HOOKS & SUBSCRIPTIONS
// ============================================================================

type HardwareProfileListener = (profile: HardwareProfile) => void;
type LegacyHardwareListener = (caps: HardwareCapabilities) => void;

const profileListeners = new Set<HardwareProfileListener>();
const legacyListeners = new Set<LegacyHardwareListener>();

function notifyListeners(profile: HardwareProfile): void {
	for (const listener of profileListeners) {
		try {
			listener(profile);
		} catch {
			// ignore subscriber errors
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
		} catch {
			// ignore subscriber errors
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
// 7. UTILITIES & ANIMATION SAFETY
// ============================================================================

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

// ============================================================================
// 8. LIFECYCLE & BACKGROUND TELEMETRY INITIALIZATION
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
		import("../utils/telemetry/runtimePerformanceMonitor.js")
			.then((mod) => {
				mod.subscribeToPerformanceStateChange((snapshot) => {
					const isDegraded =
						snapshot.state === "DEGRADED" || snapshot.state === "CRITICAL";
					setDynamicPerfState(isDegraded ? "degraded" : "healthy");
				});
			})
			.catch(() => {});
	}

	// Dynamic battery watcher
	const nav = navigator as ExtendedNavigator;
	if (typeof nav.getBattery === "function") {
		nav.getBattery()
			.then((battery) => {
				const updateBattery = () => {
					lastKnownBatteryState = {
						charging: battery.charging,
						level: battery.level,
					};
					const isBatterySaving = !battery.charging && battery.level <= 0.20;

					try {
						import("../utils/telemetry/runtimePerformanceMonitor.js")
							.then((mod) => {
								mod.getRuntimePerformanceMonitor().setBatteryThrottling(isBatterySaving);
							})
							.catch(() => {});
					} catch {
						// ignore dynamic import errors
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
			.catch(() => {
				// Battery API unsupported or blocked
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
		} catch {
			// MatchMedia listener unsupported
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
			import("../utils/lowSpecHddOptimizer.js")
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
				.catch(() => {});
		};
		if ("requestIdleCallback" in window) {
			(
				window as unknown as { requestIdleCallback: (cb: () => void) => void }
			).requestIdleCallback(runDiskBenchmark);
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
			.catch(() => {});
	}

	return profile;
}

// ============================================================================
// 9. TEST HOOKS & CACHE RESET
// ============================================================================

/**
 * Test helper to reset internal profiler cache, state, and subscriptions.
 */
export function _resetHardwareProfileCacheForTests(): void {
	cachedGpuDetails = null;
	cachedFillrateScore = null;
	cachedWebGpuInfo = null;
	activeProfile = null;
	lastKnownBatteryState = null;
	inMemoryTierOverride = null;
	currentPerfState = "healthy";
	isCtScanActive = false;
	isInitialized = false;
	perfStateListeners.clear();
	ctActiveListeners.clear();
	profileListeners.clear();
	legacyListeners.clear();
}

/**
 * Test helper to inject specific GPU details for test matrix simulations.
 */
export function _setCachedGpuDetailsForTests(details: GpuDetails | null): void {
	cachedGpuDetails = details;
}

/**
 * Test helper to inject specific fillrate benchmark score for test matrix simulations.
 */
export function _setCachedFillrateScoreForTests(score: number | null): void {
	cachedFillrateScore = score;
}

/**
 * Test helper to inject specific WebGPU adapter details for test matrix simulations.
 */
export function _setCachedWebGpuInfoForTests(info: WebGpuAdapterInfo | null): void {
	cachedWebGpuInfo = info;
}

// Auto-run immediately when loaded in browser environment
if (typeof window !== "undefined" && typeof document !== "undefined") {
	initHardwareCapabilities();
}

