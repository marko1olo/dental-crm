/**
 * DENTE CRM — CBCT 3D / DICOM / MPR Adaptive Rendering Core Types & Contracts
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i, Cybermed OnDemand3D
 */

export type CbctRenderingTier = "ultra" | "balanced" | "low" | "potato";

export type CbctPerformanceStressLevel = "nominal" | "elevated" | "critical";

/**
 * Hibernation polling interval when document.visibilityState === 'hidden' (5 seconds).
 */
export const CBCT_HIBERNATION_POLL_INTERVAL_MS = 5000;

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

export interface VramSavingsMetrics {
	readonly originalMb: number;
	readonly targetMb: number;
	readonly savingsMb: number;
	readonly savingsRatio: number;
}

export interface VolumeLodRecommendation {
	readonly downsampleStep: number;
	readonly use8BitQuantization: boolean;
	readonly targetDim: { width: number; height: number; depth: number };
	readonly vramMb: number;
	readonly savingsRatio: number;
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
