/**
 * DENTE CRM — CBCT Auto-Arch Core Types and MIP Sampling Primitives
 * Strict adherence to Mandate 8b (<= 800 lines).
 */

import type { Point2D } from "./cbctCaliperNerveMath";
import type { CbctVoxelVolume } from "./cbctMprMath";

export interface AxialMIPSlab {
	readonly data: Float32Array;
	readonly width: number;
	readonly height: number;
	readonly originMm: Point2D;
	readonly spacingMm: Point2D;
	readonly centerZMm: number;
	readonly thicknessMm: number;
	readonly mode?: "mip" | "average" | "single";
}

export interface OcclusalDensitySliceProfile {
	readonly zIndex: number;
	readonly zMm: number;
	readonly enamelIntegral: number;
	readonly boneIntegral: number;
	readonly cancellousIntegral: number;
	readonly smoothedEnamel: number;
	readonly smoothedBone: number;
	readonly smoothedCancellous: number;
}

export interface PolarRidgeRayResult {
	readonly angleRad: number;
	readonly optimalRadiusMm: number;
	readonly peakHU: number;
	readonly centroidWorldMm: Point2D;
}

/**
 * Samples HU density from an AxialMIPSlab at continuous world coordinates (in mm)
 * using bilinear sub-pixel interpolation.
 */
export function sampleMipHUContinuous(
	mip: AxialMIPSlab | { data: Float32Array; width: number; height: number; originMm: Point2D; spacingMm: Point2D },
	worldX: number,
	worldY: number,
): number {
	const vx = (worldX - mip.originMm.x) / (mip.spacingMm.x || 0.25);
	const vy = (worldY - mip.originMm.y) / (mip.spacingMm.y || 0.25);

	if (vx < 0 || vx > mip.width - 1 || vy < 0 || vy > mip.height - 1) {
		return -1000;
	}

	const x0 = Math.floor(vx);
	const y0 = Math.floor(vy);
	const x1 = Math.min(mip.width - 1, x0 + 1);
	const y1 = Math.min(mip.height - 1, y0 + 1);

	const dx = vx - x0;
	const dy = vy - y0;

	const w = mip.width;
	const d = mip.data;

	const v00 = d[y0 * w + x0] ?? -1000;
	const v10 = d[y0 * w + x1] ?? -1000;
	const v01 = d[y1 * w + x0] ?? -1000;
	const v11 = d[y1 * w + x1] ?? -1000;

	const top = v00 + dx * (v10 - v00);
	const bottom = v01 + dx * (v11 - v01);

	return top + dy * (bottom - top);
}

/**
 * Computes Z-axis enamel, cortical bone, and cancellous ridge density profiles across the CBCT volume.
 * Multi-tier thresholds:
 * - Enamel integral (HU >= 2000) for dentate crowns
 * - Cortical bone integral (HU >= 800) for alveolar bone crest
 * - Cancellous/trabecular ridge integral (HU >= 350) for edentulous and osteoporotic jaws
 * Metal artifact clipping (<= 3500 HU) prevents streak distortions.
 */
export function computeOcclusalDensityProfile(
	volume: CbctVoxelVolume,
	sampleStepX = 4,
	sampleStepY = 4,
): OcclusalDensitySliceProfile[] {
	if (!volume || !volume.data || volume.isDisposed || volume.dimensions.depth <= 0) {
		return [];
	}

	const { width, height, depth } = volume.dimensions;
	const { z: spacingZ } = volume.spacingMm;
	const originZ = volume.originMm.z;
	const totalSliceVoxels = width * height;
	const data = volume.data;

	const rawProfiles: Array<{
		zIndex: number;
		zMm: number;
		enamelIntegral: number;
		boneIntegral: number;
		cancellousIntegral: number;
	}> = new Array(depth);

	for (let z = 0; z < depth; z++) {
		const zOffset = z * totalSliceVoxels;
		const zMm = Number((originZ + z * spacingZ).toFixed(2));
		let enamelSum = 0;
		let boneSum = 0;
		let cancellousSum = 0;

		for (let y = 0; y < height; y += sampleStepY) {
			const yOffset = zOffset + y * width;
			for (let x = 0; x < width; x += sampleStepX) {
				const rawHu = data[yOffset + x] ?? -1000;
				// Metal artifact clipping to 3500 HU
				const hu = Math.min(rawHu, 3500);

				if (hu >= 2000) {
					// Enamel threshold (dentate crowns)
					enamelSum += hu - 2000;
					boneSum += hu - 800;
					cancellousSum += hu - 350;
				} else if (hu >= 800) {
					// Cortical bone threshold (alveolar ridge)
					boneSum += hu - 800;
					cancellousSum += hu - 350;
				} else if (hu >= 350) {
					// Cancellous bone / edentulous ridge threshold
					cancellousSum += hu - 350;
				}
			}
		}

		rawProfiles[z] = {
			zIndex: z,
			zMm,
			enamelIntegral: enamelSum,
			boneIntegral: boneSum,
			cancellousIntegral: cancellousSum,
		};
	}

	// 1D Gaussian kernel smoothing (sigma = 1.5 slices, radius = 2)
	const kernel = [0.06136, 0.24477, 0.38774, 0.24477, 0.06136];
	const kRadius = 2;

	return rawProfiles.map((p, idx) => {
		let smoothEnamel = 0;
		let smoothBone = 0;
		let smoothCancellous = 0;
		let weightSum = 0;

		for (let k = -kRadius; k <= kRadius; k++) {
			const neighborIdx = idx + k;
			if (neighborIdx >= 0 && neighborIdx < depth) {
				const w = kernel[k + kRadius] ?? 0;
				smoothEnamel += (rawProfiles[neighborIdx]?.enamelIntegral ?? 0) * w;
				smoothBone += (rawProfiles[neighborIdx]?.boneIntegral ?? 0) * w;
				smoothCancellous += (rawProfiles[neighborIdx]?.cancellousIntegral ?? 0) * w;
				weightSum += w;
			}
		}

		const smoothedEnamel = weightSum > 0 ? smoothEnamel / weightSum : p.enamelIntegral;
		const smoothedBone = weightSum > 0 ? smoothBone / weightSum : p.boneIntegral;
		const smoothedCancellous = weightSum > 0 ? smoothCancellous / weightSum : p.cancellousIntegral;

		return {
			zIndex: p.zIndex,
			zMm: p.zMm,
			enamelIntegral: p.enamelIntegral,
			boneIntegral: p.boneIntegral,
			cancellousIntegral: p.cancellousIntegral,
			smoothedEnamel,
			smoothedBone,
			smoothedCancellous,
		};
	});
}

