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
	calculateVariableTroughThicknessMm,
	type VariableFocalTroughOptions,
} from "./cbctArchSplineMath";
import { findOcclusalZPlane } from "./cbctAutoArchEngine";
import { getGlobalWebGl2PanoramicEngine } from "./cbctPanoramicWebGlEngine";

export interface PanoramicReconstructionResult {
	readonly widthPx: number;
	readonly heightPx: number;
	readonly focalThicknessMm: number;
	readonly centerZMm?: number;
	readonly heightMm?: number;
	readonly pixelSpacingMm?: number | undefined;
	readonly pixelData: Uint8ClampedArray; // RGBA grayscale image
	readonly toothMarkersOnPano: ReadonlyArray<{
		readonly toothFdi: string;
		readonly xPx: number;
		readonly labelRu: string;
		readonly isUpper?: boolean;
		readonly isLower?: boolean;
	}>;
}

export interface PanoramicReconstructionOptions {
	readonly heightMm?: number;
	readonly heightPx?: number;
	readonly widthPx?: number;
	readonly pixelSpacingMm?: number;
	readonly centerZMm?: number;
	readonly windowWidth?: number;
	readonly windowLevel?: number;
	readonly projectionMode?: "mip" | "average" | "ray_sum" | "raysum" | "minip" | string;
	readonly focalTroughThicknessMm?: number;
	readonly sampleStepMm?: number;
	readonly invert?: boolean;
	readonly coarsePreview?: boolean;
	readonly trilinear?: boolean;
	readonly useAnalyticalPoly?: boolean;
	readonly archPolyCoeffs?: readonly [number, number, number, number];
	readonly anteriorTroughRatio?: number;
	readonly enableVariableTrough?: boolean;
	readonly variableTroughOptions?: VariableFocalTroughOptions;
	readonly softKnee?: boolean | import("./cbctLutMath").SoftKneeConfig;
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
 * Downsamples 3D voxel volume data by integer factor (e.g. 2x, 4x)
 * to fit strictly within gl.MAX_3D_TEXTURE_SIZE on low-end integrated GPUs (Intel UHD / Iris Xe / Vega).
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

export {
	CBCT_PANORAMIC_CURVED_VERTEX_SHADER,
	CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER,
	CBCT_PANORAMIC_VERTEX_SHADER,
	CBCT_PANORAMIC_FRAGMENT_SHADER,
	WebGl2PanoramicEngine,
	getGlobalWebGl2PanoramicEngine,
	reconstructPanoramicViewWebGl2,
} from "./cbctPanoramicWebGlEngine";

/**
 * Reconstructs a full panoramic radiograph (OPG) by sweeping along the dental spline.
 * Default projectionMode is clinical "mip" for crisp, high-contrast bone and enamel visualization.
 * GPU-accelerated on WebGL2 (< 1ms per frame) with instant fallback to high-speed CPU path.
 */
export function reconstructPanoramicView(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	options: PanoramicReconstructionOptions = {},
): PanoramicReconstructionResult {
	const defaultHeightMm = volume?.physicalSizeMm?.z ? Math.min(78.0, Math.max(55.0, volume.physicalSizeMm.z * 0.98)) : 74.0;
	const {
		heightMm = defaultHeightMm,
		heightPx,
		widthPx,
		windowWidth = 4200,
		windowLevel = 1100,
		projectionMode = "ray_sum",
		centerZMm: userCenterZMm,
		invert = false,
		coarsePreview = false,
	} = options;

	const effectiveThickness = options.focalTroughThicknessMm ?? archCurve?.focalTroughThicknessMm ?? 7.0;
	const totalLengthMm = archCurve?.totalArcLengthMm || 100.0;
	// Strict Isometric CPR resolution: 1 physical mm along arch = 1 physical mm along Z axis
	const stepMm = options.pixelSpacingMm ?? (volume?.spacingMm?.x && volume.spacingMm.x >= 0.15 ? volume.spacingMm.x : 0.25);
	const pixelSpacing = stepMm;
	const outW = widthPx ?? Math.max(100, Math.round(totalLengthMm / stepMm));
	const outH = heightPx ?? Math.max(100, Math.round(heightMm / stepMm));

	if (!volume || !volume.data || volume.isDisposed || !archCurve || !archCurve.splinePointsMm || archCurve.splinePointsMm.length === 0) {
		const safeW = widthPx ?? 500;
		return {
			widthPx: safeW,
			heightPx: outH,
			focalThicknessMm: effectiveThickness,
			centerZMm: userCenterZMm ?? 0.0,
			heightMm,
			pixelSpacingMm: pixelSpacing,
			pixelData: new Uint8ClampedArray(safeW * outH * 4),
			toothMarkersOnPano: [],
		};
	}

	// Try GPU WebGL2 hardware acceleration first if in browser environment
	if (typeof document !== "undefined") {
		try {
			const engine = getGlobalWebGl2PanoramicEngine();
			if (engine) {
				const gpuResult = engine.reconstruct(volume, archCurve, {
					...options,
					heightMm,
					heightPx: outH,
					widthPx: outW,
					focalTroughThicknessMm: effectiveThickness,
				});
				if (gpuResult) return gpuResult;
			}
		} catch {
			// Fallback transparently to high-speed CPU path
		}
	}

	const centerZMm = resolveOcclusalCenterZ(volume, archCurve, userCenterZMm);

	const splinePoints = archCurve.splinePointsMm;
	const vectorField = calculateArchTangentsAndNormals(splinePoints);
	const pixelBuffer = new Uint8ClampedArray(outW * outH * 4);

	// Adaptive focal trough slab sampling (default 12-16 mm, dense sampling step 0.35 - 0.4 mm, or 0.8 mm for coarse preview)
	const focalRadiusMm = effectiveThickness / 2.0;
	const sampleStepMm = options.sampleStepMm ?? (coarsePreview ? 0.8 : 0.4);
	const slabSamples = Math.max(2, Math.round(focalRadiusMm / sampleStepMm));
	const numSlab = 2 * slabSamples + 1;

	// Precompute slab offsets along focal trough normal
	const slabOffsets = new Float64Array(numSlab);
	for (let s = -slabSamples; s <= slabSamples; s++) {
		slabOffsets[s + slabSamples] = (s / slabSamples) * focalRadiusMm;
	}

	const zTopMm = centerZMm + heightMm / 2.0;
	const zBottomMm = centerZMm - heightMm / 2.0;
	const zStepMm = (zTopMm - zBottomMm) / outH;
	const nNodes = vectorField.length;

	// Volume voxel spacing and origins for direct zero-allocation transformation
	const originX = volume.originMm?.x ?? 0;
	const originY = volume.originMm?.y ?? 0;
	const originZ = volume.originMm?.z ?? 0;
	const spX = volume.spacingMm?.x || 0.2;
	const spY = volume.spacingMm?.y || 0.2;
	const spZ = volume.spacingMm?.z || 0.2;
	const invSpX = 1.0 / spX;
	const invSpY = 1.0 / spY;
	const invSpZ = 1.0 / spZ;

	// Precompute Z voxel positions for all rows
	const rowVoxZ = new Float64Array(outH);
	for (let row = 0; row < outH; row++) {
		const zMm = zTopMm - row * zStepMm;
		rowVoxZ[row] = (zMm - originZ) * invSpZ;
	}

	// Precompute 2D positions and normalized normals along the dental spline for all columns
	const denomW = Math.max(1, outW - 1);
	const colPtX = new Float64Array(outW);
	const colPtY = new Float64Array(outW);
	const colNormX = new Float64Array(outW);
	const colNormY = new Float64Array(outW);

	let currNode = 0;
	for (let col = 0; col < outW; col++) {
		const targetDistMm = (col / denomW) * totalLengthMm;
		while (currNode < nNodes - 2 && vectorField[currNode + 1]!.distanceAlongArchMm < targetDistMm) {
			currNode++;
		}
		const n0 = vectorField[currNode]!;
		const n1 = vectorField[currNode + 1] || n0;
		const d0 = n0.distanceAlongArchMm;
		const d1 = n1.distanceAlongArchMm;
		const segLen = d1 - d0;
		const frac = segLen > 0.0001 ? Math.max(0, Math.min(1, (targetDistMm - d0) / segLen)) : 0;

		const ptX = n0.point.x + (n1.point.x - n0.point.x) * frac;
		const ptY = n0.point.y + (n1.point.y - n0.point.y) * frac;
		const rawNormX = n0.normal.x + (n1.normal.x - n0.normal.x) * frac;
		const rawNormY = n0.normal.y + (n1.normal.y - n0.normal.y) * frac;
		const normLen = Math.hypot(rawNormX, rawNormY) || 1.0;

		colPtX[col] = ptX;
		colPtY[col] = ptY;
		colNormX[col] = rawNormX / normLen;
		colNormY[col] = rawNormY / normLen;
	}

	// Clinical soft-tone radiologic OPG contrast LUT: wide window 4200 / 1100 (enamel ~210..225/255, clear dentin, pulp & trabeculae)
	const effectiveWW = windowWidth ?? (volume.defaultWindowWidth && volume.defaultWindowWidth >= 3000 ? volume.defaultWindowWidth : 4200);
	const effectiveWL = windowLevel ?? (volume.defaultWindowLevel && volume.defaultWindowLevel >= 900 ? volume.defaultWindowLevel : 1100);
	const lut = get16BitLut(effectiveWW, effectiveWL, invert, 1.0, options.softKnee);

	// Zero-allocation sample voxel buffers per column
	const sampleVx = new Float64Array(numSlab);
	const sampleVy = new Float64Array(numSlab);

	const colStep = coarsePreview ? 2 : 1;

	const anteriorRatio = options.anteriorTroughRatio !== undefined
		? Math.max(0.1, Math.min(1.0, options.anteriorTroughRatio))
		: 0.65;
	const halfTotalLen = totalLengthMm > 0 ? totalLengthMm / 2.0 : 50.0;

	// Sweep along the spline with constant physical arc-length distance
	for (let col = 0; col < outW; col += colStep) {
		const ptX = colPtX[col]!;
		const ptY = colPtY[col]!;
		const normX = colNormX[col]!;
		const normY = colNormY[col]!;

		// Calculate local focal radius with physiological anterior narrowing (0.5..0.8) or variable trough
		let colFocalRadiusMm = focalRadiusMm;
		const targetDistMm = (col / denomW) * totalLengthMm;
		if (options.enableVariableTrough) {
			colFocalRadiusMm = calculateVariableTroughThicknessMm(targetDistMm, totalLengthMm, options.variableTroughOptions) / 2.0;
		} else if (anteriorRatio < 1.0 && halfTotalLen > 0) {
			const centerNorm = Math.min(1.0, Math.abs(targetDistMm - halfTotalLen) / halfTotalLen);
			const t = Math.max(0, Math.min(1, (centerNorm - 0.15) / 0.35));
			const taper = anteriorRatio + (1.0 - anteriorRatio) * (t * t * (3 - 2 * t));
			colFocalRadiusMm = focalRadiusMm * taper;
		}

		// Precompute voxel X, Y for all slab samples in this column (invariant across rows)
		for (let s = 0; s < numSlab; s++) {
			const off = ((s - slabSamples) / slabSamples) * colFocalRadiusMm;
			sampleVx[s] = (ptX + normX * off - originX) * invSpX;
			sampleVy[s] = (ptY + normY * off - originY) * invSpY;
		}

		for (let row = 0; row < outH; row++) {
			const vz = rowVoxZ[row]!;

			let maxHU = -32768;
			let minHU = 32767;
			let sumHU = 0;

			// Direct trilinear sampling without object allocations
			for (let s = 0; s < numSlab; s++) {
				const vx = sampleVx[s]!;
				const vy = sampleVy[s]!;
				const hu = sampleVoxelTrilinearHU(vx, vy, vz, volume);
				if (hu > maxHU) maxHU = hu;
				if (hu < minHU) minHU = hu;
				sumHU += hu;
			}

			let finalHU = maxHU;
			if (projectionMode === "minip") {
				finalHU = minHU;
			} else if (projectionMode === "average") {
				finalHU = Math.round(sumHU / numSlab);
			} else if (projectionMode === "slice" || projectionMode === "single") {
				const centerS = slabSamples;
				finalHU = sampleVoxelTrilinearHU(sampleVx[centerS]!, sampleVy[centerS]!, vz, volume);
			} else if (projectionMode === "ray_sum" || projectionMode === "raysum" || projectionMode === "blend") {
				// Clinical weighted ray-sum: blends 35% MIP sharpness with 65% soft tissue average
				// Preserves dark pulp chambers, root canals, and trabecular patterns inside bright teeth!
				const avgHU = sumHU / numSlab;
				finalHU = Math.round(0.35 * maxHU + 0.65 * avgHU);
			} else {
				// Explicit pure MIP
				finalHU = maxHU;
			}

			const gray = lut[(finalHU + 32768) & 0xffff]!;
			const idx = (row * outW + col) * 4;
			pixelBuffer[idx] = gray;
			pixelBuffer[idx + 1] = gray;
			pixelBuffer[idx + 2] = gray;
			pixelBuffer[idx + 3] = 255;

			if (coarsePreview && col + 1 < outW) {
				const nextIdx = (row * outW + col + 1) * 4;
				pixelBuffer[nextIdx] = gray;
				pixelBuffer[nextIdx + 1] = gray;
				pixelBuffer[nextIdx + 2] = gray;
				pixelBuffer[nextIdx + 3] = 255;
			}
		}
	}

	// Calculate tooth marker positions on the panoramic image based on exact arc distance & symmetric margins >= 20px
	const toothMarkers = calculateToothMarkersOnPano(archCurve, vectorField, totalLengthMm, outW);

	return {
		widthPx: outW,
		heightPx: outH,
		focalThicknessMm: effectiveThickness,
		centerZMm,
		heightMm,
		pixelSpacingMm: pixelSpacing,
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
	readonly heightMm?: number; // Panoramic vertical field of view in mm (default 74.0 mm)
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
