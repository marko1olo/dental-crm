/**
 * DENTE CRM — CBCT Panoramic (OPG) Reconstruction & 3D Nerve Projection Engine
 * Decomposed from dentalCurveEngine.ts per Mandate 8b.
 * Standards: DICOM Part 3, Misch CE, Buser
 */

import {
	type CbctVoxelVolume,
	get16BitLut,
	sampleVoxelTrilinearHU,
	worldMmToVoxelContinuous,
} from "./cbctMprMath";
import {
	type Point2D,
	type Point3D,
	calculateSplineLength3DMm,
	MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
} from "./cbctCaliperNerveMath";
import {
	type DentalArchCurve,
	calculateArchTangentsAndNormals,
} from "./cbctArchSplineMath";
import { findOcclusalZPlane } from "./cbctAutoArchEngine";

export interface PanoramicReconstructionResult {
	readonly widthPx: number;
	readonly heightPx: number;
	readonly focalThicknessMm: number;
	readonly centerZMm?: number;
	readonly pixelData: Uint8ClampedArray; // RGBA grayscale image
	readonly toothMarkersOnPano: ReadonlyArray<{
		readonly toothFdi: string;
		readonly xPx: number;
		readonly labelRu: string;
	}>;
}

export interface PanoramicReconstructionOptions {
	readonly heightMm?: number;
	readonly heightPx?: number;
	readonly widthPx?: number;
	readonly centerZMm?: number;
	readonly windowWidth?: number;
	readonly windowLevel?: number;
	readonly projectionMode?: "mip" | "average" | "ray_sum" | "raysum" | "minip" | string;
	readonly focalTroughThicknessMm?: number;
	readonly sampleStepMm?: number;
	readonly invert?: boolean;
}

/**
 * Resolves the optimal Z height (mm) for the panoramic reconstruction.
 * Prioritizes:
 * 1. Explicit user-provided centerZMm in options
 * 2. Explicit planeZMm or centerZMm in DentalArchCurve
 * 3. Average Z coordinate from 3D anchor points (archCurve.anchors)
 * 4. Analytical detection via findOcclusalZPlane from the CBCT voxel volume density profile
 * 5. Fallback to 0.0 mm
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
 * Reconstructs a full panoramic radiograph (OPG) by sweeping along the dental spline.
 * Default projectionMode is clinical "mip" for crisp, high-contrast bone and enamel visualization.
 */
export function reconstructPanoramicView(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	options: PanoramicReconstructionOptions = {},
): PanoramicReconstructionResult {
	const {
		heightMm = 38.0,
		heightPx = 220,
		widthPx,
		windowWidth = 3500,
		windowLevel = 800,
		projectionMode = "mip",
		centerZMm: userCenterZMm,
		invert = false,
	} = options;

	const effectiveThickness = options.focalTroughThicknessMm ?? archCurve?.focalTroughThicknessMm ?? 14.0;
	const outH = heightPx;

	if (!volume || !volume.data || volume.isDisposed || !archCurve || !archCurve.splinePointsMm || archCurve.splinePointsMm.length === 0) {
		const safeW = widthPx ?? 500;
		return {
			widthPx: safeW,
			heightPx: outH,
			focalThicknessMm: effectiveThickness,
			centerZMm: userCenterZMm ?? 0.0,
			pixelData: new Uint8ClampedArray(safeW * outH * 4),
			toothMarkersOnPano: [],
		};
	}

	const centerZMm = resolveOcclusalCenterZ(volume, archCurve, userCenterZMm);

	const splinePoints = archCurve.splinePointsMm;
	const vectorField = calculateArchTangentsAndNormals(splinePoints);
	const outW = widthPx ?? Math.max(500, Math.round(archCurve.totalArcLengthMm / (volume.spacingMm?.x || 0.35)));
	const pixelBuffer = new Uint8ClampedArray(outW * outH * 4);

	// Adaptive focal trough slab sampling (default 12-16 mm, dense sampling step 0.35 - 0.4 mm)
	const focalRadiusMm = effectiveThickness / 2.0;
	const sampleStepMm = options.sampleStepMm ?? 0.4;
	const slabSamples = Math.max(4, Math.round(focalRadiusMm / sampleStepMm));

	const zTopMm = centerZMm + heightMm / 2.0;
	const zBottomMm = centerZMm - heightMm / 2.0;
	const zStepMm = (zTopMm - zBottomMm) / outH;
	const nNodes = vectorField.length;
	const totalLengthMm = archCurve.totalArcLengthMm || 100;

	// Enhanced clinical OPG contrast LUT: maps bone/enamel range cleanly
	const effectiveWW = windowWidth ?? (volume.defaultWindowWidth && volume.defaultWindowWidth <= 3800 ? volume.defaultWindowWidth : 3500);
	const effectiveWL = windowLevel ?? (volume.defaultWindowLevel && volume.defaultWindowLevel <= 1000 && volume.defaultWindowLevel >= 500 ? volume.defaultWindowLevel : 800);
	const lut = get16BitLut(effectiveWW, effectiveWL, invert);

	// Sweep along the spline with constant physical arc-length distance
	const denomW = Math.max(1, outW - 1);
	for (let col = 0; col < outW; col++) {
		const targetDistMm = (col / denomW) * totalLengthMm;

		// Find bracketing vectorField nodes by distanceAlongArchMm
		let i0 = 0;
		let i1 = 0;
		let frac = 0;

		for (let i = 0; i < nNodes - 1; i++) {
			const d0 = vectorField[i]!.distanceAlongArchMm;
			const d1 = vectorField[i + 1]!.distanceAlongArchMm;
			if (targetDistMm >= d0 && targetDistMm <= d1) {
				i0 = i;
				i1 = i + 1;
				const segLen = d1 - d0;
				frac = segLen > 0.0001 ? (targetDistMm - d0) / segLen : 0;
				break;
			}
			if (i === nNodes - 2) {
				i0 = i;
				i1 = i + 1;
				frac = 1;
			}
		}

		const n0 = vectorField[i0] || vectorField[0]!;
		const n1 = vectorField[i1] || n0;

		const ptX = n0.point.x + (n1.point.x - n0.point.x) * frac;
		const ptY = n0.point.y + (n1.point.y - n0.point.y) * frac;
		const rawNormX = n0.normal.x + (n1.normal.x - n0.normal.x) * frac;
		const rawNormY = n0.normal.y + (n1.normal.y - n0.normal.y) * frac;
		const normLen = Math.hypot(rawNormX, rawNormY) || 1.0;
		const normX = rawNormX / normLen;
		const normY = rawNormY / normLen;

		for (let row = 0; row < outH; row++) {
			const zMm = zTopMm - row * zStepMm;

			// Ray sampling along focal trough normal with continuous anti-aliased sub-voxel interpolation
			let maxHU = -32768;
			let minHU = 32767;
			let sumHU = 0;
			let sampleCount = 0;

			for (let s = -slabSamples; s <= slabSamples; s++) {
				const offsetMm = (s / slabSamples) * focalRadiusMm;
				const sampleX = ptX + normX * offsetMm;
				const sampleY = ptY + normY * offsetMm;

				const vox = worldMmToVoxelContinuous({ x: sampleX, y: sampleY, z: zMm }, volume);
				const hu = sampleVoxelTrilinearHU(vox.x, vox.y, vox.z, volume);
				if (hu > maxHU) maxHU = hu;
				if (hu < minHU) minHU = hu;
				sumHU += hu;
				sampleCount++;
			}

			let finalHU = maxHU;
			if (projectionMode === "minip") {
				finalHU = minHU;
			} else if (projectionMode === "average") {
				finalHU = sampleCount > 0 ? Math.round(sumHU / sampleCount) : maxHU;
			} else if (projectionMode === "ray_sum" || projectionMode === "raysum") {
				// Clinical weighted ray-sum: blends 70% MIP sharpness with 30% soft tissue average
				const avgHU = sampleCount > 0 ? sumHU / sampleCount : maxHU;
				finalHU = Math.round(0.7 * maxHU + 0.3 * Math.max(0, avgHU));
			} else {
				// Default: clinical MIP (Maximum Intensity Projection)
				finalHU = maxHU;
			}

			const gray = lut[(finalHU + 32768) & 0xffff]!;
			const idx = (row * outW + col) * 4;
			pixelBuffer[idx] = gray;
			pixelBuffer[idx + 1] = gray;
			pixelBuffer[idx + 2] = gray;
			pixelBuffer[idx + 3] = 255;
		}
	}

	// Calculate tooth marker positions on the panoramic image based on exact arc distance & symmetric margins >= 20px
	const toothMarkers = archCurve.anchors.map((anchor) => {
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
		// Ensure symmetrical dental arch landmarks with equal margins on left and right (>= 20px)
		const minMarginPx = 20;
		const availableWidth = Math.max(0, outW - 2 * minMarginPx);
		const mappedCol = Math.round(minMarginPx + ratio * availableWidth);
		const clampedCol = Math.max(minMarginPx, Math.min(outW - minMarginPx, mappedCol));

		return {
			toothFdi: anchor.toothFdi,
			xPx: clampedCol,
			labelRu: anchor.labelRu,
		};
	});

	return {
		widthPx: outW,
		heightPx: outH,
		focalThicknessMm: effectiveThickness,
		centerZMm,
		pixelData: pixelBuffer,
		toothMarkersOnPano: toothMarkers,
	};
}

export const reconstructPanoramicOpg = reconstructPanoramicView;

export interface Projected3DNervePoint {
	readonly x: number; // Horizontal column (px) on panorama
	readonly y: number; // Vertical row (px) on panorama
	readonly zMm: number; // Original Z coordinate in physical mm
	readonly distanceAlongArchMm: number; // Arc length (mm) along dental spline
	readonly lateralDistanceMm: number; // Perpendicular distance (mm) to dental arch spline
	readonly isInsideFocalTrough: boolean; // True if within focal trough thickness
}

export interface Projected3DNerveResult {
	readonly projectedPoints: readonly Projected3DNervePoint[];
	readonly safetyCorridorUpper: readonly Point2D[];
	readonly safetyCorridorLower: readonly Point2D[];
	readonly safetyCorridorPolygon: readonly Point2D[];
	readonly safetyMarginMm: number; // 2.0 mm
	readonly canalDiameterMm: number; // 2.8 mm
	readonly safetyBufferPx: number; // Vertical safety corridor buffer in pixels
	readonly isVisibleOnPanorama: boolean;
	readonly totalLengthMm: number; // 3D length of the nerve in mm
}

export interface Project3DNerveOptions {
	readonly heightMm?: number; // Panoramic vertical field of view in mm (default 38.0 mm)
	readonly centerZMm?: number; // Center of panoramic vertical field of view in mm (default 0 or archCurve.planeZMm)
	readonly safetyMarginMm?: number; // Safety buffer in mm (default 2.0 mm)
	readonly canalDiameterMm?: number; // Canal diameter in mm (default 2.8 mm)
}

/**
 * Projects a 3D mandibular nerve (IAN) spline onto panoramic unfolded radiograph coordinates
 * with an exact 2.0 mm safety buffer corridor envelope.
 */
export function project3DNerveToPanorama(
	interpolatedNerve3D: readonly Point3D[],
	archCurve: DentalArchCurve,
	panoWidthPx = 500,
	panoHeightPx = 220,
	options: Project3DNerveOptions = {},
): Projected3DNerveResult {
	const heightMm = options.heightMm ?? 38.0;
	const centerZMm = options.centerZMm ?? (archCurve.planeZMm ?? 0.0);
	const safetyMarginMm = options.safetyMarginMm ?? MANDIBULAR_NERVE_SAFETY_MARGIN_MM;
	const canalDiameterMm = options.canalDiameterMm ?? 2.8;

	if (interpolatedNerve3D.length === 0 || archCurve.splinePointsMm.length === 0 || panoWidthPx <= 0 || panoHeightPx <= 0) {
		return {
			projectedPoints: [],
			safetyCorridorUpper: [],
			safetyCorridorLower: [],
			safetyCorridorPolygon: [],
			safetyMarginMm,
			canalDiameterMm,
			safetyBufferPx: 0,
			isVisibleOnPanorama: false,
			totalLengthMm: 0,
		};
	}

	const vectorField = calculateArchTangentsAndNormals(archCurve.splinePointsMm);
	const totalLengthMm = archCurve.totalArcLengthMm || 100.0;
	const denomW = Math.max(1, panoWidthPx - 1);
	const zTopMm = centerZMm + heightMm / 2.0;
	const pxPerMmY = panoHeightPx / heightMm;
	const pxPerMmX = denomW / totalLengthMm;
	const safetyBufferPx = Number((safetyMarginMm * pxPerMmY).toFixed(2));
	const halfFocalTroughMm = (archCurve.focalTroughThicknessMm ?? 12.0) / 2.0;

	const projectedPoints: Projected3DNervePoint[] = [];

	for (const pt of interpolatedNerve3D) {
		let minDistance = Infinity;
		let bestArcDistMm = 0;

		for (let i = 0; i < vectorField.length - 1; i++) {
			const n0 = vectorField[i]!;
			const n1 = vectorField[i + 1]!;

			const segDx = n1.point.x - n0.point.x;
			const segDy = n1.point.y - n0.point.y;
			const segL2 = segDx * segDx + segDy * segDy;

			let t = 0;
			if (segL2 > 1e-6) {
				const pDx = pt.x - n0.point.x;
				const pDy = pt.y - n0.point.y;
				t = Math.max(0, Math.min(1, (pDx * segDx + pDy * segDy) / segL2));
			}

			const projX = n0.point.x + t * segDx;
			const projY = n0.point.y + t * segDy;
			const dist = Math.hypot(pt.x - projX, pt.y - projY);

			if (dist < minDistance) {
				minDistance = dist;
				const segLen = n1.distanceAlongArchMm - n0.distanceAlongArchMm;
				bestArcDistMm = n0.distanceAlongArchMm + t * segLen;
			}
		}

		const ratio = Math.max(0, Math.min(1, bestArcDistMm / totalLengthMm));
		const panoX = Number((ratio * denomW).toFixed(2));
		const panoY = Number((((zTopMm - pt.z) / heightMm) * panoHeightPx).toFixed(2));

		projectedPoints.push({
			x: panoX,
			y: panoY,
			zMm: pt.z,
			distanceAlongArchMm: Number(bestArcDistMm.toFixed(2)),
			lateralDistanceMm: Number(minDistance.toFixed(2)),
			isInsideFocalTrough: minDistance <= halfFocalTroughMm,
		});
	}

	const safetyCorridorUpper: Point2D[] = [];
	const safetyCorridorLower: Point2D[] = [];
	const nPts = projectedPoints.length;

	for (let i = 0; i < nPts; i++) {
		const cur = projectedPoints[i]!;
		let tx = 0;
		let ty = 0;

		if (nPts === 1) {
			tx = 1;
			ty = 0;
		} else if (i === 0) {
			const next = projectedPoints[1]!;
			tx = next.x - cur.x;
			ty = next.y - cur.y;
		} else if (i === nPts - 1) {
			const prev = projectedPoints[i - 1]!;
			tx = cur.x - prev.x;
			ty = cur.y - prev.y;
		} else {
			const prev = projectedPoints[i - 1]!;
			const next = projectedPoints[i + 1]!;
			tx = next.x - prev.x;
			ty = next.y - prev.y;
		}

		const len = Math.hypot(tx, ty) || 1.0;
		const nx = -ty / len;
		const ny = tx / len;

		const offX = nx * (safetyMarginMm * pxPerMmX);
		const offY = ny * (safetyMarginMm * pxPerMmY);

		safetyCorridorUpper.push({
			x: Number((cur.x + offX).toFixed(2)),
			y: Number((cur.y + offY).toFixed(2)),
		});
		safetyCorridorLower.push({
			x: Number((cur.x - offX).toFixed(2)),
			y: Number((cur.y - offY).toFixed(2)),
		});
	}

	const safetyCorridorPolygon: Point2D[] = [
		...safetyCorridorUpper,
		...safetyCorridorLower.slice().reverse(),
	];

	const total3DLength = calculateSplineLength3DMm(interpolatedNerve3D as Point3D[]);

	return {
		projectedPoints,
		safetyCorridorUpper,
		safetyCorridorLower,
		safetyCorridorPolygon,
		safetyMarginMm,
		canalDiameterMm,
		safetyBufferPx,
		isVisibleOnPanorama: projectedPoints.some((p) => p.isInsideFocalTrough),
		totalLengthMm: total3DLength,
	};
}
