/**
 * DENTE CRM — CBCT Panoramic Arch Geometry & Occlusal Detection
 * Standards: DICOM Part 3, Mandate 8b (<= 200 lines).
 */

import { type CbctVoxelVolume } from "./cbctMprMath";
import { type Point2D } from "./cbctCaliperNerveMath";
import { type DentalArchCurve } from "./cbctArchSplineMath";
import { findOcclusalZPlane } from "./cbctAutoArchEngine";

/**
 * Resolves the optimal Z height (mm) for the panoramic reconstruction.
 */
export function resolveOcclusalCenterZ(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	userCenterZMm?: number,
): number {
	if (typeof userCenterZMm === "number" && Number.isFinite(userCenterZMm)) {
		return userCenterZMm;
	}
	if (typeof (archCurve as any).planeZMm === "number" && Number.isFinite((archCurve as any).planeZMm)) {
		return (archCurve as any).planeZMm;
	}
	if (typeof (archCurve as any).centerZMm === "number" && Number.isFinite((archCurve as any).centerZMm)) {
		return (archCurve as any).centerZMm;
	}
	if (archCurve.anchors && archCurve.anchors.length > 0) {
		const zList = archCurve.anchors
			.map((a: any) => a.zMm ?? (typeof a.positionMm?.z === "number" ? a.positionMm.z : undefined))
			.filter((z): z is number => typeof z === "number" && Number.isFinite(z));
		if (zList.length > 0) {
			return Number((zList.reduce((sum, val) => sum + val, 0) / zList.length).toFixed(2));
		}
	}
	try {
		return findOcclusalZPlane(volume, archCurve.jawType);
	} catch {
		return 0.0;
	}
}

/**
 * Downsamples 3D voxel volume data by integer factor (e.g. 2x, 4x)
 * to fit strictly within gl.MAX_3D_TEXTURE_SIZE on low-end integrated GPUs.
 */
export function downsampleVolumeData(
	data: Int16Array,
	dim: { width: number; height: number; depth: number },
	factor: number,
): { data: Int16Array; width: number; height: number; depth: number; factor: number } {
	if (factor <= 1) {
		return { data, width: dim.width, height: dim.height, depth: dim.depth, factor: 1 };
	}
	const w2 = Math.max(1, Math.floor(dim.width / factor));
	const h2 = Math.max(1, Math.floor(dim.height / factor));
	const d2 = Math.max(1, Math.floor(dim.depth / factor));
	const out = new Int16Array(w2 * h2 * d2);
	const srcSlice = dim.width * dim.height;
	const dstSlice = w2 * h2;

	for (let z = 0; z < d2; z++) {
		const srcZ = z * factor * srcSlice;
		const dstZ = z * dstSlice;
		for (let y = 0; y < h2; y++) {
			const srcY = srcZ + y * factor * dim.width;
			const dstY = dstZ + y * w2;
			for (let x = 0; x < w2; x++) {
				out[dstY + x] = data[srcY + x * factor] ?? -1000;
			}
		}
	}
	return { data: out, width: w2, height: h2, depth: d2, factor };
}

/**
 * Calculates symmetrical tooth marker positions on the panoramic image.
 */
export function calculateToothMarkersOnPano(
	archCurve: DentalArchCurve,
	vectorField: ReadonlyArray<{ point: Point2D; normal: Point2D; tangent: Point2D; distanceAlongArchMm: number }>,
	totalLengthMm: number,
	outW: number,
): Array<{ toothFdi: string; xPx: number; labelRu: string; isUpper: boolean; isLower: boolean }> {
	const nNodes = vectorField.length;
	return archCurve.anchors.map((anchor) => {
		let minDistance = Infinity;
		let bestArcDistMm = 0;

		for (let i = 0; i < nNodes - 1; i++) {
			const n0 = vectorField[i]!;
			const n1 = vectorField[i + 1]!;
			const segDx = n1.point.x - n0.point.x;
			const segDy = n1.point.y - n0.point.y;
			const segL2 = segDx * segDx + segDy * segDy;
			let t = 0;
			if (segL2 > 1e-6) {
				const pDx = anchor.positionMm.x - n0.point.x;
				const pDy = anchor.positionMm.y - n0.point.y;
				t = Math.max(0, Math.min(1, (pDx * segDx + pDy * segDy) / segL2));
			}
			const projX = n0.point.x + t * segDx;
			const projY = n0.point.y + t * segDy;
			const dist = Math.hypot(anchor.positionMm.x - projX, anchor.positionMm.y - projY);
			if (dist < minDistance) {
				minDistance = dist;
				const segLen = n1.distanceAlongArchMm - n0.distanceAlongArchMm;
				bestArcDistMm = n0.distanceAlongArchMm + t * segLen;
			}
		}

		const ratio = totalLengthMm > 0 ? Math.max(0, Math.min(1, bestArcDistMm / totalLengthMm)) : 0;
		const minMarginPx = 20;
		const availableWidth = Math.max(0, outW - 2 * minMarginPx);
		const mappedCol = Math.round(minMarginPx + ratio * availableWidth);
		const clampedCol = Math.max(minMarginPx, Math.min(outW - minMarginPx, mappedCol));

		const fdiNum = parseInt(anchor.toothFdi, 10);
		const quadrant = Math.floor(fdiNum / 10);
		const isUpper = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
		const isLower = quadrant === 3 || quadrant === 4 || quadrant === 7 || quadrant === 8;

		return {
			toothFdi: anchor.toothFdi,
			xPx: clampedCol,
			labelRu: anchor.labelRu,
			isUpper,
			isLower,
		};
	});
}
