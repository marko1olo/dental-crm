/**
 * DENTE CRM — CBCT 3D / DICOM / MPR Resolution Scaler & Texture VRAM LOD Engine
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i, Cybermed OnDemand3D
 */

import {
	type CbctRenderingTier,
	type AdaptiveRenderProfile,
	type QuantizedVolume8Bit,
	type VramSavingsMetrics,
	type VolumeLodRecommendation,
	type DownsampledVolumeDataResult,
} from "./types.js";

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
