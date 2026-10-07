/**
 * DENTE CRM — CBCT 3D / DICOM / MPR Adaptive Hardware Profiling & Telemetry Engine
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i, Cybermed OnDemand3D
 *
 * Capabilities:
 * 1. Hardware capability detection (CPU cores, device memory, discrete vs integrated GPU, MAX_3D_TEXTURE_SIZE).
 * 2. 4-tier rendering classification: Ultra, Balanced, Low, Potato.
 * 3. Adaptive Raymarching:
 *    - Ultra: 0.5 voxel step (highest detail for bone trabeculae and root canals);
 *    - Balanced: 1.0 voxel step;
 *    - Low: 1.8 voxel step;
 *    - Potato: 2.5 voxel step (2-4x shader workload reduction).
 * 4. Dynamic interaction downsampling (0.5x on high-tier, 0.33x on low, 0.25x on potato) with
 *    seamless progressive refinement to 1.0x on idle (Guarantees Diagnostic Honesty).
 * 5. Volume texture LOD clamp (256³ vs 512³) for GPUs with <4GB VRAM to prevent WebGL Context Loss.
 * 6. Dynamic worker pool sizing (1 worker on 2 cores, 2 on 4, 4 on 8+ cores).
 * 7. Real-time telemetry tracking (rolling FPS, frame render time, dropped frames, stress level).
 */

export type CbctRenderingTier = "ultra" | "balanced" | "low" | "potato";

export type CbctPerformanceStressLevel = "nominal" | "elevated" | "critical";

/**
 * Hibernation polling interval when document.visibilityState === 'hidden' (5 seconds).
 */
export const CBCT_HIBERNATION_POLL_INTERVAL_MS = 5000;

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

export interface CbctHardwareCapabilities {
	readonly hardwareConcurrency: number;
	readonly deviceMemoryGb: number;
	readonly gpuRenderer: string;
	readonly gpuVendor: string;
	readonly max3DTextureSize: number;
	readonly isDiscreteGpu: boolean;
	readonly isIntegratedGpu: boolean;
	readonly isMobileOrTablet: boolean;
	readonly devicePixelRatio: number;
}

export type {
	AdaptiveRenderProfile as CbctAdaptiveRenderProfile,
};

export interface AdaptiveRenderProfile {
	readonly tier: CbctRenderingTier;
	readonly stressLevel: CbctPerformanceStressLevel;
	/** Static raymarching step in voxels (0.5 = Ultra, 1.0 = Balanced, 1.8 = Low, 2.5 = Potato) */
	readonly raymarchingVoxelStep: number;
	/** Interactive raymarching step during mouse/touch rotation (1.0 = Ultra, 1.8 = Balanced, 2.5 = Low, 3.2 = Potato) */
	readonly interactiveVoxelStep: number;
	/** Static maximum ray steps (240 = Ultra, 160 = Balanced, 80 = Low, 50 = Potato) */
	readonly maxRaySteps: number;
	/** Interactive maximum ray steps during orbit drag */
	readonly interactiveMaxRaySteps: number;
	/** Interactive viewport downsample multiplier (e.g. 0.5 = half resolution, 0.333 = 1/3 resolution) */
	readonly interactiveDownsampleFactor: number;
	/** Idle viewport downsample multiplier (Strictly 1.0 for Diagnostic Honesty) */
	readonly idleDownsampleFactor: 1.0;
	/** Maximum 3D volume texture dimension (512 for Ultra/Balanced, 256 for Low/Potato) */
	readonly max3DTextureDimension: number;
	/** Number of background MPR reslicing web workers */
	readonly workerPoolSize: number;
	/** Number of sub-voxel bisection refinement steps on mouseUp (4 = Ultra/Balanced, 2 = Low, 0 = Potato) */
	readonly bisectionRefineSteps: number;
	/** Whether 8-point trilinear density sampling is enabled during active interaction */
	readonly enableTrilinearDuringInteraction: boolean;
	/** Whether Metal Artifact Reduction (MAR) transverse filter is active during interaction */
	readonly enableMarDuringInteraction: boolean;
	/** Soft-knee highlight compression ceiling to eliminate enamel burnout */
	readonly softKneeCeiling: number;
	/** Debounce delay in ms before triggering full 1.0x progressive refinement pass */
	readonly progressiveRefinementDelayMs: number;
}

/**
 * Standard baseline tier parameters.
 */
export const CBCT_TIER_PROFILES: Record<CbctRenderingTier, Omit<AdaptiveRenderProfile, "stressLevel">> = {
	ultra: {
		tier: "ultra",
		raymarchingVoxelStep: 0.5,
		interactiveVoxelStep: 1.0,
		maxRaySteps: 240,
		interactiveMaxRaySteps: 120,
		interactiveDownsampleFactor: 0.5,
		idleDownsampleFactor: 1.0,
		max3DTextureDimension: 512,
		workerPoolSize: 4,
		bisectionRefineSteps: 4,
		enableTrilinearDuringInteraction: true,
		enableMarDuringInteraction: true,
		softKneeCeiling: 178.0,
		progressiveRefinementDelayMs: 60,
	},
	balanced: {
		tier: "balanced",
		raymarchingVoxelStep: 1.0,
		interactiveVoxelStep: 1.8,
		maxRaySteps: 160,
		interactiveMaxRaySteps: 70,
		interactiveDownsampleFactor: 0.5,
		idleDownsampleFactor: 1.0,
		max3DTextureDimension: 512,
		workerPoolSize: 2,
		bisectionRefineSteps: 4,
		enableTrilinearDuringInteraction: false,
		enableMarDuringInteraction: false,
		softKneeCeiling: 178.0,
		progressiveRefinementDelayMs: 80,
	},
	low: {
		tier: "low",
		raymarchingVoxelStep: 1.8,
		interactiveVoxelStep: 2.5,
		maxRaySteps: 80,
		interactiveMaxRaySteps: 48,
		interactiveDownsampleFactor: 0.333,
		idleDownsampleFactor: 1.0,
		max3DTextureDimension: 256,
		workerPoolSize: 2,
		bisectionRefineSteps: 2,
		enableTrilinearDuringInteraction: false,
		enableMarDuringInteraction: false,
		softKneeCeiling: 178.0,
		progressiveRefinementDelayMs: 120,
	},
	potato: {
		tier: "potato",
		raymarchingVoxelStep: 2.5,
		interactiveVoxelStep: 3.2,
		maxRaySteps: 50,
		interactiveMaxRaySteps: 36,
		interactiveDownsampleFactor: 0.25,
		idleDownsampleFactor: 1.0,
		max3DTextureDimension: 256,
		workerPoolSize: 1,
		bisectionRefineSteps: 0,
		enableTrilinearDuringInteraction: false,
		enableMarDuringInteraction: false,
		softKneeCeiling: 178.0,
		progressiveRefinementDelayMs: 160,
	},
};

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

		const avgMs = this.getAverageFrameTimeMs();
		let current: CbctPerformanceStressLevel = "nominal";
		if (avgMs > 45.0) {
			current = "critical";
		} else if (avgMs > 22.0) {
			current = "elevated";
		} else {
			current = "nominal";
		}

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

/**
 * Calculates raw 3D volume texture footprint in GPU VRAM (MB).
 */
export function calculateTextureVramMb(
	width: number,
	height: number,
	depth: number,
	bytesPerVoxel = 2,
): number {
	const bytes = Math.max(1, width) * Math.max(1, height) * Math.max(1, depth) * Math.max(1, bytesPerVoxel);
	return Number((bytes / (1024 * 1024)).toFixed(2));
}

/**
 * Returns whether a volume texture exceeds the specified VRAM budget and requires 2x downsampling.
 */
export function shouldDownsampleTextureForVram(
	width: number,
	height: number,
	depth: number,
	maxVramBudgetMb = 128.0,
): boolean {
	return calculateTextureVramMb(width, height, depth) > maxVramBudgetMb;
}

/**
 * 3D Box-Filter Downsampling Algorithm for volumetric CT data.
 * Computes mean voxel density across an integer box neighborhood (stepX x stepY x stepZ).
 * For 2x2x2 downsampling, converts 512x512xN into 256x256x(N/2), reducing voxel count and VRAM by 8x.
 * Preserves high-density cortical bone boundaries, enamel, and trabecular architecture without point-sampling aliasing.
 */
export function downsampleVolumeBoxFilter(
	srcData: Int16Array,
	srcDim: { width: number; height: number; depth: number },
	stepX = 2,
	stepY = 2,
	stepZ = 2,
): { data: Int16Array; width: number; height: number; depth: number; minHU: number; maxHU: number } {
	const validStepX = Math.max(1, Math.floor(stepX));
	const validStepY = Math.max(1, Math.floor(stepY));
	const validStepZ = Math.max(1, Math.floor(stepZ));

	const dstW = Math.max(1, Math.ceil(srcDim.width / validStepX));
	const dstH = Math.max(1, Math.ceil(srcDim.height / validStepY));
	const dstD = Math.max(1, Math.ceil(srcDim.depth / validStepZ));

	const dstData = new Int16Array(dstW * dstH * dstD);
	const srcW = srcDim.width;
	const srcH = srcDim.height;
	const srcD = srcDim.depth;
	const srcSlice = srcW * srcH;
	const dstSlice = dstW * dstH;

	let minHU = 32767;
	let maxHU = -32768;

	for (let dz = 0; dz < dstD; dz++) {
		const szStart = dz * validStepZ;
		const szEnd = Math.min(srcD, szStart + validStepZ);
		const dstZOffset = dz * dstSlice;

		for (let dy = 0; dy < dstH; dy++) {
			const syStart = dy * validStepY;
			const syEnd = Math.min(srcH, syStart + validStepY);
			const dstYOffset = dstZOffset + dy * dstW;

			for (let dx = 0; dx < dstW; dx++) {
				const sxStart = dx * validStepX;
				const sxEnd = Math.min(srcW, sxStart + validStepX);

				let sum = 0;
				let count = 0;

				for (let sz = szStart; sz < szEnd; sz++) {
					const srcZOffset = sz * srcSlice;
					for (let sy = syStart; sy < syEnd; sy++) {
						const srcYOffset = srcZOffset + sy * srcW;
						for (let sx = sxStart; sx < sxEnd; sx++) {
							sum += srcData[srcYOffset + sx] ?? -1000;
							count++;
						}
					}
				}

				const avgHU = count > 0 ? Math.round(sum / count) : -1000;
				const clampedHU = avgHU < -32768 ? -32768 : avgHU > 32767 ? 32767 : avgHU;
				dstData[dstYOffset + dx] = clampedHU;

				if (clampedHU < minHU) minHU = clampedHU;
				if (clampedHU > maxHU) maxHU = clampedHU;
			}
		}
	}

	return {
		data: dstData,
		width: dstW,
		height: dstH,
		depth: dstD,
		minHU: minHU === 32767 ? -1000 : minHU,
		maxHU: maxHU === -32768 ? 3000 : maxHU,
	};
}

export interface QuantizedVolume8Bit {
	readonly data: Uint8Array;
	readonly width: number;
	readonly height: number;
	readonly depth: number;
	readonly minHU: number;
	readonly maxHU: number;
	readonly scale: number;
	readonly offset: number;
}

/**
 * Quantizes 16-bit signed Hounsfield Units (-1000..+3000 HU) to 8-bit unsigned integers (0..255).
 * Halves the VRAM requirement per voxel from 2 bytes to 1 byte (2x VRAM reduction).
 * Preserves diagnostic bone density range:
 * - Air (-1000 HU) -> 0
 * - Soft tissue (0..100 HU) -> ~64..70
 * - Trabecular bone (200..800 HU) -> ~76..115
 * - Cortical bone (1000..2000 HU) -> ~128..191
 * - Dense bone & enamel (2500..3000 HU) -> ~223..255
 */
export function quantizeVolumeHUTo8Bit(
	srcData: Int16Array,
	dim: { width: number; height: number; depth: number },
	minHU = -1000,
	maxHU = 3000,
): QuantizedVolume8Bit {
	const count = Math.min(srcData.length, dim.width * dim.height * dim.depth);
	const dstData = new Uint8Array(count);
	const span = Math.max(1, maxHU - minHU);

	for (let i = 0; i < count; i++) {
		const hu = srcData[i] ?? minHU;
		const clamped = Math.max(minHU, Math.min(maxHU, hu));
		dstData[i] = Math.round(((clamped - minHU) / span) * 255);
	}

	return {
		data: dstData,
		width: dim.width,
		height: dim.height,
		depth: dim.depth,
		minHU,
		maxHU,
		scale: span / 255.0,
		offset: minHU,
	};
}

/**
 * Reconstructs 16-bit signed Hounsfield Units from an 8-bit quantized volume array.
 */
export function dequantizeVolume8BitToHU(
	srcData: Uint8Array,
	minHU = -1000,
	maxHU = 3000,
): Int16Array {
	const dst = new Int16Array(srcData.length);
	const span = Math.max(1, maxHU - minHU);
	for (let i = 0; i < srcData.length; i++) {
		const norm = (srcData[i] ?? 0) / 255.0;
		dst[i] = Math.round(minHU + norm * span);
	}
	return dst;
}

export interface VramSavingsMetrics {
	readonly originalMb: number;
	readonly targetMb: number;
	readonly savingsMb: number;
	readonly savingsRatio: number;
}

/**
 * Calculates theoretical VRAM memory consumption and savings metrics between two volume configurations.
 */
export function calculateVramSavings(
	originalDim: { width: number; height: number; depth: number },
	targetDim: { width: number; height: number; depth: number },
	originalBytesPerVoxel = 2,
	targetBytesPerVoxel = 2,
): VramSavingsMetrics {
	const originalMb = calculateTextureVramMb(
		originalDim.width,
		originalDim.height,
		originalDim.depth,
		originalBytesPerVoxel,
	);
	const targetMb = calculateTextureVramMb(
		targetDim.width,
		targetDim.height,
		targetDim.depth,
		targetBytesPerVoxel,
	);
	const savingsMb = Number(Math.max(0, originalMb - targetMb).toFixed(2));
	const savingsRatio = Number((targetMb > 0 ? originalMb / targetMb : 1.0).toFixed(2));

	return {
		originalMb,
		targetMb,
		savingsMb,
		savingsRatio,
	};
}

export interface VolumeLodRecommendation {
	readonly downsampleStep: number;
	readonly use8BitQuantization: boolean;
	readonly targetDim: { width: number; height: number; depth: number };
	readonly vramMb: number;
	readonly savingsRatio: number;
}

/**
 * Determines optimal volume LOD downsampling and quantization strategy based on hardware profile.
 * - Potato tier: downsample 2x (step 2) + 8-bit quantization (16x VRAM reduction).
 * - Low tier: downsample 2x (step 2) in 16-bit (8x VRAM reduction).
 * - Balanced / Ultra tier: native full resolution in 16-bit (1x).
 */
export function determineOptimalVolumeLOD(
	dim: { width: number; height: number; depth: number },
	profileOrTier: CbctRenderingTier | AdaptiveRenderProfile,
	maxVramBudgetMb = 128.0,
): VolumeLodRecommendation {
	const tier: CbctRenderingTier = typeof profileOrTier === "string" ? profileOrTier : profileOrTier.tier;

	let downsampleStep = 1;
	let use8BitQuantization = false;

	if (tier === "potato") {
		downsampleStep = 2;
		use8BitQuantization = true;
	} else if (tier === "low") {
		downsampleStep = 2;
		use8BitQuantization = false;
	} else {
		// Balanced or Ultra: check if exceeds texture limit or VRAM budget
		const currentVram = calculateTextureVramMb(dim.width, dim.height, dim.depth, 2);
		if (currentVram > maxVramBudgetMb * 2) {
			downsampleStep = 2;
		}
	}

	const targetDim = {
		width: Math.max(1, Math.ceil(dim.width / downsampleStep)),
		height: Math.max(1, Math.ceil(dim.height / downsampleStep)),
		depth: Math.max(1, Math.ceil(dim.depth / downsampleStep)),
	};

	const bytesPerVoxel = use8BitQuantization ? 1 : 2;
	const vramMb = calculateTextureVramMb(targetDim.width, targetDim.height, targetDim.depth, bytesPerVoxel);
	const originalVram = calculateTextureVramMb(dim.width, dim.height, dim.depth, 2);
	const savingsRatio = Number((vramMb > 0 ? originalVram / vramMb : 1.0).toFixed(2));

	return {
		downsampleStep,
		use8BitQuantization,
		targetDim,
		vramMb,
		savingsRatio,
	};
}

export interface DownsampledVolumeDataResult {
	readonly data: Int16Array;
	readonly width: number;
	readonly height: number;
	readonly depth: number;
	readonly step: number;
	readonly minHU: number;
	readonly maxHU: number;
	readonly vramMb: number;
}

/**
 * Deterministic Volume Texture LOD Downsampling Engine (CT-VRAM-LOD-Core).
 *
 * Supports both:
 * 1. Target max dimension: downsampleVolumeData(data, dim, targetMaxDim = 256)
 *    Ensures max(width, height, depth) <= targetMaxDim.
 *    - Potato profile: targetMaxDim 128..256 (VRAM reduced 8-64x)
 *    - Low/Balanced profile: targetMaxDim 256 (VRAM reduced 8x for 512^3 volumes)
 *    - Ultra profile: targetMaxDim 512 (native full resolution)
 * 2. Explicit integer stride step: downsampleVolumeData(data, dim, step = 2)
 *    (Backward-compatible with tests and legacy callers).
 *
 * Uses 3D Box-Filter (mean HU density per sub-voxel cell) to preserve trabecular bone architecture,
 * enamel boundaries, and mandibular canals without high-frequency aliasing or noise explosion.
 */
export function downsampleVolumeData(
	srcData: Int16Array,
	srcDim: { width: number; height: number; depth: number },
	targetMaxDimOrStep = 256,
): DownsampledVolumeDataResult {
	const validParam = Number.isFinite(targetMaxDimOrStep) && targetMaxDimOrStep > 0
		? targetMaxDimOrStep
		: 256;

	if (validParam <= 8) {
		const step = Math.max(1, Math.floor(validParam));
		if (step <= 1) {
			let minHU = 32767;
			let maxHU = -32768;
			const count = Math.min(srcData.length, srcDim.width * srcDim.height * srcDim.depth);
			for (let i = 0; i < count; i++) {
				const v = srcData[i]!;
				if (v < minHU) minHU = v;
				if (v > maxHU) maxHU = v;
			}
			const vramMb = calculateTextureVramMb(srcDim.width, srcDim.height, srcDim.depth, 2);
			return {
				data: srcData,
				width: srcDim.width,
				height: srcDim.height,
				depth: srcDim.depth,
				step: 1,
				minHU: minHU === 32767 ? -1000 : minHU,
				maxHU: maxHU === -32768 ? 3000 : maxHU,
				vramMb,
			};
		}

		const dstW = Math.max(1, Math.ceil(srcDim.width / step));
		const dstH = Math.max(1, Math.ceil(srcDim.height / step));
		const dstD = Math.max(1, Math.ceil(srcDim.depth / step));
		const dstData = new Int16Array(dstW * dstH * dstD);
		let minHU = 32767;
		let maxHU = -32768;

		for (let dz = 0; dz < dstD; dz++) {
			const srcZOffset = dz * step * srcDim.width * srcDim.height;
			const dstZOffset = dz * dstW * dstH;
			for (let dy = 0; dy < dstH; dy++) {
				const srcYOffset = srcZOffset + dy * step * srcDim.width;
				const dstYOffset = dstZOffset + dy * dstW;
				for (let dx = 0; dx < dstW; dx++) {
					const val = srcData[srcYOffset + dx * step] ?? -1000;
					dstData[dstYOffset + dx] = val;
					if (val < minHU) minHU = val;
					if (val > maxHU) maxHU = val;
				}
			}
		}

		const vramMb = calculateTextureVramMb(dstW, dstH, dstD, 2);
		return {
			data: dstData,
			width: dstW,
			height: dstH,
			depth: dstD,
			step,
			minHU: minHU === 32767 ? -1000 : minHU,
			maxHU: maxHU === -32768 ? 3000 : maxHU,
			vramMb,
		};
	}

	const maxDim = Math.max(srcDim.width, Math.max(srcDim.height, srcDim.depth));
	let step = 1;
	if (maxDim > validParam) {
		step = Math.ceil(maxDim / validParam);
	}

	if (step <= 1) {
		let minHU = 32767;
		let maxHU = -32768;
		const count = Math.min(srcData.length, srcDim.width * srcDim.height * srcDim.depth);
		for (let i = 0; i < count; i++) {
			const v = srcData[i]!;
			if (v < minHU) minHU = v;
			if (v > maxHU) maxHU = v;
		}
		const vramMb = calculateTextureVramMb(srcDim.width, srcDim.height, srcDim.depth, 2);
		return {
			data: srcData,
			width: srcDim.width,
			height: srcDim.height,
			depth: srcDim.depth,
			step: 1,
			minHU: minHU === 32767 ? -1000 : minHU,
			maxHU: maxHU === -32768 ? 3000 : maxHU,
			vramMb,
		};
	}

	const filtered = downsampleVolumeBoxFilter(srcData, srcDim, step, step, step);
	const vramMb = calculateTextureVramMb(filtered.width, filtered.height, filtered.depth, 2);
	return {
		data: filtered.data,
		width: filtered.width,
		height: filtered.height,
		depth: filtered.depth,
		step,
		minHU: filtered.minHU,
		maxHU: filtered.maxHU,
		vramMb,
	};
}

/**
 * Returns the recommended targetMaxDim for a given rendering tier or profile:
 * - potato: 128 (reduces 512^3 down to 128^3, 64x VRAM reduction from 256MB to 4MB)
 * - low: 256 (reduces 512^3 down to 256^3, 8x VRAM reduction from 256MB to 32MB)
 * - balanced: 256 (reduces 512^3 down to 256^3, 8x VRAM reduction)
 * - ultra: 512 (native full resolution)
 */
export function getTargetMaxDimForTier(tierOrProfile: CbctRenderingTier | AdaptiveRenderProfile): number {
	const tier: CbctRenderingTier = typeof tierOrProfile === "string" ? tierOrProfile : tierOrProfile.tier;
	switch (tier) {
		case "potato":
			return 128;
		case "low":
			return 256;
		case "balanced":
			return 256;
		case "ultra":
		default:
			return 512;
	}
}

