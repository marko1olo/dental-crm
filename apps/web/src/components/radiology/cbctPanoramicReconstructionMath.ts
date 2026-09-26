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

export interface PanoramicReconstructionResult {
	readonly widthPx: number;
	readonly heightPx: number;
	readonly focalThicknessMm: number;
	readonly pixelData: Uint8ClampedArray; // RGBA grayscale image
	readonly toothMarkersOnPano: ReadonlyArray<{
		readonly toothFdi: string;
		readonly xPx: number;
		readonly labelRu: string;
	}>;
}

/**
 * Reconstructs a full panoramic radiograph (OPG) by sweeping along the dental spline.
 */
export function reconstructPanoramicView(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	options: {
		heightMm?: number;
		heightPx?: number;
		widthPx?: number;
		windowWidth?: number;
		windowLevel?: number;
		projectionMode?: string;
		invert?: boolean;
	} = {},
): PanoramicReconstructionResult {
	const {
		heightMm = 38.0,
		heightPx = 220,
		widthPx,
		windowWidth = 4400,
		windowLevel = 1300,
		projectionMode = "average",
		invert = false,
	} = options as { heightMm?: number; heightPx?: number; widthPx?: number; windowWidth?: number; windowLevel?: number; projectionMode?: string; invert?: boolean };

	const splinePoints = archCurve.splinePointsMm;
	const vectorField = calculateArchTangentsAndNormals(splinePoints);
	const outW = widthPx ?? Math.max(500, Math.round(archCurve.totalArcLengthMm / (volume.spacingMm.x || 0.35)));
	const outH = heightPx;
	const pixelBuffer = new Uint8ClampedArray(outW * outH * 4);

	// Focal trough slab sampling
	const focalRadiusMm = archCurve.focalTroughThicknessMm / 2.0;
	const slabSamples = Math.max(3, Math.round(focalRadiusMm / 0.5));

	const zTopMm = heightMm / 2.0;
	const zBottomMm = -heightMm / 2.0;
	const zStepMm = (zTopMm - zBottomMm) / outH;
	const nNodes = vectorField.length;
	const totalLengthMm = archCurve.totalArcLengthMm || 100;

	const lut = get16BitLut(windowWidth, windowLevel, invert);

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

			// MIP along focal trough thickness with continuous anti-aliased sub-voxel sampling
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
			if (projectionMode === "minip") finalHU = minHU;
			else if (projectionMode === "average") finalHU = sampleCount > 0 ? Math.round(sumHU / sampleCount) : maxHU;

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
		focalThicknessMm: archCurve.focalTroughThicknessMm,
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
	const zTopMm = heightMm / 2.0;
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
