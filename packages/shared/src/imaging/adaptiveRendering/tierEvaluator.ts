/**
 * DENTE CRM — CBCT 3D / DICOM / MPR Hardware Tier Evaluator & Dynamic Stress Engine
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i, Cybermed OnDemand3D
 */

import {
	type CbctRenderingTier,
	type CbctPerformanceStressLevel,
	type CbctHardwareCapabilities,
	type AdaptiveRenderProfile,
	CBCT_TIER_PROFILES,
} from "./types.js";

/**
 * Downgrades rendering tier strictly one step lower upon WebGL context loss or critical GPU stress:
 * ultra -> balanced -> low -> potato -> potato
 */
export function getDowngradedRenderingTier(currentTier: CbctRenderingTier): CbctRenderingTier {
	switch (currentTier) {
		case "ultra":
			return "balanced";
		case "balanced":
			return "low";
		case "low":
		case "potato":
		default:
			return "potato";
	}
}

/**
 * Calculates dynamic worker pool size based on hardware concurrency (physical/logical CPU cores).
 * - 1 worker on <= 2 cores
 * - 2 workers on 3-5 cores
 * - 3 workers on 6-7 cores
 * - 4 workers on 8+ cores
 */
export function calculateDynamicWorkerPoolSize(cores?: number): number {
	const validCores = typeof cores === "number" && Number.isFinite(cores) && cores > 0 ? cores : 4;
	if (validCores <= 2) return 1;
	if (validCores <= 5) return 2;
	if (validCores <= 7) return 3;
	return 4;
}

/**
 * Detects hardware capabilities from WebGL context and browser navigator APIs.
 */
export function detectCbctHardwareCapabilities(
	gl?: WebGL2RenderingContext | null,
	nav?: Navigator | null,
	win?: Window | null,
): CbctHardwareCapabilities {
	const navigatorObj = nav ?? (typeof navigator !== "undefined" ? navigator : null);
	const windowObj = win ?? (typeof window !== "undefined" ? window : null);

	const hardwareConcurrency = navigatorObj?.hardwareConcurrency ?? 4;
	const deviceMemoryGb = (navigatorObj as unknown as { deviceMemory?: number })?.deviceMemory ?? 8;
	const devicePixelRatio = windowObj?.devicePixelRatio ?? 1.0;

	let max3DTextureSize = 2048;
	let gpuRenderer = "Generic WebGL2";
	let gpuVendor = "Generic";

	if (gl) {
		try {
			if (typeof gl.getParameter === "function") {
				if (gl.MAX_3D_TEXTURE_SIZE !== undefined) {
					const max3D = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE) as number;
					if (typeof max3D === "number" && max3D > 0) {
						max3DTextureSize = max3D;
					}
				}

				const debugInfo = gl.getExtension ? gl.getExtension("WEBGL_debug_renderer_info") : null;
				if (debugInfo) {
					const unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
					const unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
					if (typeof unmaskedRenderer === "string" && unmaskedRenderer.length > 0) {
						gpuRenderer = unmaskedRenderer;
					}
					if (typeof unmaskedVendor === "string" && unmaskedVendor.length > 0) {
						gpuVendor = unmaskedVendor;
					}
				} else {
					const r = gl.getParameter(gl.RENDERER);
					const v = gl.getParameter(gl.VENDOR);
					if (typeof r === "string") gpuRenderer = r;
					if (typeof v === "string") gpuVendor = v;
				}
			}
		} catch {
			// WebGL parameter read fallback
		}
	}

	const lowerRenderer = gpuRenderer.toLowerCase();
	const lowerVendor = gpuVendor.toLowerCase();

	const isSoftwareOrWeak =
		lowerRenderer.includes("swiftshader") ||
		lowerRenderer.includes("llvmpipe") ||
		lowerRenderer.includes("software") ||
		lowerRenderer.includes("basic render") ||
		lowerRenderer.includes("microsoft basic");

	const isDiscreteGpu =
		!isSoftwareOrWeak &&
		(lowerRenderer.includes("nvidia") ||
			lowerRenderer.includes("geforce") ||
			lowerRenderer.includes("rtx") ||
			lowerRenderer.includes("gtx") ||
			lowerRenderer.includes("quadro") ||
			lowerRenderer.includes("radeon rx") ||
			lowerRenderer.includes("radeon pro") ||
			lowerRenderer.includes("apple m1 pro") ||
			lowerRenderer.includes("apple m1 max") ||
			lowerRenderer.includes("apple m1 ultra") ||
			lowerRenderer.includes("apple m2 pro") ||
			lowerRenderer.includes("apple m2 max") ||
			lowerRenderer.includes("apple m2 ultra") ||
			lowerRenderer.includes("apple m3 pro") ||
			lowerRenderer.includes("apple m3 max") ||
			lowerRenderer.includes("apple m4 pro") ||
			lowerRenderer.includes("apple m4 max"));

	const isIntegratedGpu =
		!isDiscreteGpu &&
		(lowerRenderer.includes("intel") ||
			lowerRenderer.includes("iris") ||
			lowerRenderer.includes("uhd") ||
			lowerRenderer.includes("hd graphics") ||
			lowerRenderer.includes("mali") ||
			lowerRenderer.includes("adreno") ||
			lowerRenderer.includes("apple m") ||
			lowerVendor.includes("intel") ||
			isSoftwareOrWeak);

	const isMobileOrTablet =
		(windowObj !== null && windowObj.innerWidth < 768) ||
		(navigatorObj !== null && (navigatorObj.maxTouchPoints ?? 0) > 0 && (windowObj?.innerWidth ?? 1024) < 1024);

	return {
		hardwareConcurrency,
		deviceMemoryGb,
		gpuRenderer,
		gpuVendor,
		max3DTextureSize,
		isDiscreteGpu,
		isIntegratedGpu,
		isMobileOrTablet,
		devicePixelRatio,
	};
}

/**
 * Evaluates performance stress category based on rolling average frame time in ms:
 * - nominal: avg frame time <= 22 ms (>= 45 FPS)
 * - elevated: avg frame time 22..45 ms (22..45 FPS)
 * - critical: avg frame time > 45 ms (< 22 FPS)
 */
export function evaluateCbctPerformanceStress(avgFrameTimeMs: number): CbctPerformanceStressLevel {
	if (avgFrameTimeMs > 45.0) {
		return "critical";
	}
	if (avgFrameTimeMs > 22.0) {
		return "elevated";
	}
	return "nominal";
}

/**
 * Derives the optimal AdaptiveRenderProfile based on hardware capabilities and dynamic stress level.
 */
export function deriveAdaptiveRenderProfile(
	caps?: Partial<CbctHardwareCapabilities>,
	stressLevel: CbctPerformanceStressLevel = "nominal",
	manualTierOverride?: CbctRenderingTier,
): AdaptiveRenderProfile {
	let baseTier: CbctRenderingTier;

	if (manualTierOverride) {
		baseTier = manualTierOverride;
	} else {
		const cores = caps?.hardwareConcurrency ?? 4;
		const memGb = caps?.deviceMemoryGb ?? 8;
		const isDiscrete = caps?.isDiscreteGpu ?? false;
		const isMobile = caps?.isMobileOrTablet ?? false;
		const max3d = caps?.max3DTextureSize ?? 2048;

		if (isMobile) {
			baseTier = memGb >= 6 && cores >= 6 ? "balanced" : "low";
		} else if (isDiscrete && cores >= 8 && memGb >= 12 && max3d >= 2048) {
			baseTier = "ultra";
		} else if ((cores >= 6 || memGb >= 8) && max3d >= 512) {
			baseTier = "balanced";
		} else if (cores >= 4 && memGb >= 4 && max3d >= 256) {
			baseTier = "low";
		} else {
			baseTier = "potato";
		}
	}

	// Apply dynamic stress adjustment (downgrade 1 tier on elevated stress, 2 tiers on critical)
	let activeTier: CbctRenderingTier = baseTier;
	if (stressLevel === "elevated") {
		if (activeTier === "ultra") activeTier = "balanced";
		else if (activeTier === "balanced") activeTier = "low";
		else activeTier = "potato";
	} else if (stressLevel === "critical") {
		activeTier = "potato";
	}

	const baseConfig = CBCT_TIER_PROFILES[activeTier];
	const workerPoolSize = calculateDynamicWorkerPoolSize(caps?.hardwareConcurrency);

	return {
		...baseConfig,
		stressLevel,
		workerPoolSize,
	};
}

/**
 * Derives a downgraded profile one tier lower, used when WebGL context loss occurs
 * to prevent repeated driver TDR crashes.
 */
export function getDowngradedAdaptiveProfile(
	profile: AdaptiveRenderProfile,
	forcedStress: CbctPerformanceStressLevel = "elevated",
): AdaptiveRenderProfile {
	const nextTier = getDowngradedRenderingTier(profile.tier);
	const baseConfig = CBCT_TIER_PROFILES[nextTier];
	return {
		...baseConfig,
		tier: nextTier,
		stressLevel: forcedStress,
		workerPoolSize: profile.workerPoolSize,
	};
}

/**
 * High-precision rolling telemetry collector for CBCT rendering frame times and dynamic stress evaluation.
 */
export class CbctRenderTelemetryCollector {
	private readonly sampleWindowSize: number;
	private readonly frameTimesMs: number[] = [];
	private droppedFrames = 0;
	private totalFrames = 0;
	private lastStressLevel: CbctPerformanceStressLevel = "nominal";

	constructor(sampleWindowSize = 20) {
		this.sampleWindowSize = Math.max(5, sampleWindowSize);
	}

	/**
	 * Records a completed frame render duration in ms.
	 */
	public recordFrame(durationMs: number): void {
		const validDuration = Math.max(0.01, durationMs);
		this.totalFrames++;
		if (validDuration > 33.33) {
			// Exceeded 30 FPS budget (33.3 ms)
			this.droppedFrames++;
		}

		this.frameTimesMs.push(validDuration);
		if (this.frameTimesMs.length > this.sampleWindowSize) {
			this.frameTimesMs.shift();
		}
	}

	public recordFrameTime(durationMs: number): void {
		this.recordFrame(durationMs);
	}

	/**
	 * Returns rolling average frame time in ms.
	 */
	public getAverageFrameTimeMs(): number {
		if (this.frameTimesMs.length === 0) return 0;
		const sum = this.frameTimesMs.reduce((a, b) => a + b, 0);
		return Number((sum / this.frameTimesMs.length).toFixed(2));
	}

	/**
	 * Returns rolling average FPS (Frames Per Second).
	 */
	public getAverageFps(): number {
		const avgMs = this.getAverageFrameTimeMs();
		if (avgMs <= 0) return 60;
		const fps = 1000.0 / avgMs;
		return Number(Math.min(120, Math.max(1, fps)).toFixed(1));
	}

	public getEstimatedFps(): number {
		return this.getAverageFps();
	}

	/**
	 * Returns dropped frame percentage (0..100%).
	 */
	public getDroppedFrameRatio(): number {
		if (this.totalFrames === 0) return 0;
		return Number(((this.droppedFrames / this.totalFrames) * 100).toFixed(1));
	}

	/**
	 * Returns current dynamic performance stress level:
	 * - nominal: avg frame time <= 22 ms (>= 45 FPS)
	 * - elevated: avg frame time 22..45 ms (22..45 FPS)
	 * - critical: avg frame time > 45 ms (< 22 FPS)
	 */
	public getStressLevel(): CbctPerformanceStressLevel {
		if (this.frameTimesMs.length < 3) {
			return this.lastStressLevel;
		}

		const current = evaluateCbctPerformanceStress(this.getAverageFrameTimeMs());
		this.lastStressLevel = current;
		return current;
	}

	/**
	 * Resets telemetry buffer.
	 */
	public reset(): void {
		this.frameTimesMs.length = 0;
		this.droppedFrames = 0;
		this.totalFrames = 0;
		this.lastStressLevel = "nominal";
	}
}
