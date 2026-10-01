/**
 * DENTE CRM — CBCT Auto-Arch Core Types and MIP Sampling Primitives
 * Strict adherence to Mandate 8b (<= 800 lines).
 */

import type { Point2D } from "./cbctCaliperNerveMath";

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
