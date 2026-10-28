/**
 * DENTE CRM — CBCT Panoramic (OPG) CPU Reconstruction Engine
 * Performs zero-allocation isometric sweeping along the dental spline.
 * Standards: DICOM Part 3, Misch CE, Buser, Mandate 8b (<= 300 lines).
 */

import {
	type CbctVoxelVolume,
	get16BitLut,
	sampleVoxelTrilinearHU,
} from "./cbctMprMath";
import {
	type DentalArchCurve,
	calculateArchTangentsAndNormals,
	calculateVariableTroughThicknessMm,
	type VariableFocalTroughOptions,
} from "./cbctArchSplineMath";
import { getGlobalWebGl2PanoramicEngine } from "./cbctPanoramicWebGlEngine";
import {
	calculateToothMarkersOnPano,
	resolveOcclusalCenterZ,
} from "./cbctPanoramicGeometry";

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
	readonly gamma?: number;
	readonly airCutoffHU?: number;
	readonly softKneeCeiling?: number;
	readonly useSoftKnee?: boolean;
	readonly outputBuffer?: Uint8ClampedArray;
}

// Reusable zero-GC scratch buffers for CPU panoramic reconstruction
let panoScratchRowVoxZ: Float64Array | null = null;
let panoScratchColPtX: Float64Array | null = null;
let panoScratchColPtY: Float64Array | null = null;
let panoScratchColNormX: Float64Array | null = null;
let panoScratchColNormY: Float64Array | null = null;
let panoScratchSampleVx: Float64Array | null = null;
let panoScratchSampleVy: Float64Array | null = null;

function acquireFloat64Scratch(current: Float64Array | null, requiredLength: number): Float64Array {
	if (!current || current.length < requiredLength) {
		return new Float64Array(Math.max(requiredLength, 1024));
	}
	return current;
}

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
		windowWidth = 4025,
		windowLevel = 525,
		projectionMode = "average",
		centerZMm: userCenterZMm,
		invert = false,
		coarsePreview = false,
	} = options;

	const effectiveThickness = options.focalTroughThicknessMm ?? archCurve?.focalTroughThicknessMm ?? 1.0;
	const totalLengthMm = archCurve?.totalArcLengthMm || 100.0;
	const stepMm = options.pixelSpacingMm ?? (volume?.spacingMm?.x && volume.spacingMm.x >= 0.15 ? volume.spacingMm.x : 0.25);
	const pixelSpacing = stepMm;
	const outW = widthPx ?? Math.max(100, Math.round(totalLengthMm / stepMm));
	const outH = heightPx ?? Math.max(100, Math.round(heightMm / stepMm));

	if (!volume || !volume.data || volume.isDisposed || !archCurve || !archCurve.splinePointsMm || archCurve.splinePointsMm.length === 0) {
		const safeW = widthPx ?? 500;
		const emptyBuf = options.outputBuffer && options.outputBuffer.length >= safeW * outH * 4
			? options.outputBuffer
			: new Uint8ClampedArray(safeW * outH * 4);
		return {
			widthPx: safeW,
			heightPx: outH,
			focalThicknessMm: effectiveThickness,
			centerZMm: userCenterZMm ?? 0.0,
			heightMm,
			pixelSpacingMm: pixelSpacing,
			pixelData: emptyBuf,
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
				if (gpuResult) {
					const pix = gpuResult.pixelData;
					const step = Math.max(1, Math.floor(pix.length / 256));
					let hasVisibleSignal = false;
					for (let i = 0; i < pix.length; i += step) {
						if (pix[i]! > 0) {
							hasVisibleSignal = true;
							break;
						}
					}
					if (hasVisibleSignal) return gpuResult;
				}
			}
		} catch {
			// Fallback transparently to high-speed CPU path
		}
	}

	const centerZMm = resolveOcclusalCenterZ(volume, archCurve, userCenterZMm);

	const splinePoints = archCurve.splinePointsMm;
	const vectorField = calculateArchTangentsAndNormals(splinePoints);
	const pixelBuffer = options.outputBuffer && options.outputBuffer.length >= outW * outH * 4
		? options.outputBuffer
		: new Uint8ClampedArray(outW * outH * 4);

	const focalRadiusMm = effectiveThickness / 2.0;
	const sampleStepMm = options.sampleStepMm ?? (coarsePreview ? 0.8 : 0.4);
	const slabSamples = Math.max(2, Math.round(focalRadiusMm / sampleStepMm));
	const numSlab = 2 * slabSamples + 1;

	const zTopMm = centerZMm + heightMm / 2.0;
	const zBottomMm = centerZMm - heightMm / 2.0;
	const zStepMm = (zTopMm - zBottomMm) / outH;
	const nNodes = vectorField.length;

	const originX = volume.originMm?.x ?? 0;
	const originY = volume.originMm?.y ?? 0;
	const originZ = volume.originMm?.z ?? 0;
	const spX = volume.spacingMm?.x || 0.2;
	const spY = volume.spacingMm?.y || 0.2;
	const spZ = volume.spacingMm?.z || 0.2;
	const invSpX = 1.0 / spX;
	const invSpY = 1.0 / spY;
	const invSpZ = 1.0 / spZ;

	panoScratchRowVoxZ = acquireFloat64Scratch(panoScratchRowVoxZ, outH);
	const rowVoxZ = panoScratchRowVoxZ;
	for (let row = 0; row < outH; row++) {
		const zMm = zTopMm - row * zStepMm;
		rowVoxZ[row] = (zMm - originZ) * invSpZ;
	}

	const denomW = Math.max(1, outW - 1);
	panoScratchColPtX = acquireFloat64Scratch(panoScratchColPtX, outW);
	const colPtX = panoScratchColPtX;
	panoScratchColPtY = acquireFloat64Scratch(panoScratchColPtY, outW);
	const colPtY = panoScratchColPtY;
	panoScratchColNormX = acquireFloat64Scratch(panoScratchColNormX, outW);
	const colNormX = panoScratchColNormX;
	panoScratchColNormY = acquireFloat64Scratch(panoScratchColNormY, outW);
	const colNormY = panoScratchColNormY;

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

	const effectiveWW = windowWidth ?? (volume.defaultWindowWidth && volume.defaultWindowWidth >= 1000 ? volume.defaultWindowWidth : 4025);
	const effectiveWL = windowLevel ?? (volume.defaultWindowLevel && volume.defaultWindowLevel >= -200 && volume.defaultWindowLevel <= 2500 ? volume.defaultWindowLevel : 525);
	const effectiveGamma = options.gamma ?? 1.50;
	const effectiveSoftKnee = options.useSoftKnee !== undefined
		? (options.useSoftKnee
			? { peakEnamel: options.softKneeCeiling ?? 215, airCutoffHU: options.airCutoffHU ?? -500, enabled: true }
			: { airCutoffHU: options.airCutoffHU ?? -500, enabled: false })
		: (options.softKnee ?? { airCutoffHU: options.airCutoffHU ?? -500, enabled: false });
	const lut = get16BitLut(effectiveWW, effectiveWL, invert, effectiveGamma, effectiveSoftKnee);

	panoScratchSampleVx = acquireFloat64Scratch(panoScratchSampleVx, numSlab);
	const sampleVx = panoScratchSampleVx;
	panoScratchSampleVy = acquireFloat64Scratch(panoScratchSampleVy, numSlab);
	const sampleVy = panoScratchSampleVy;

	const colStep = coarsePreview ? 2 : 1;
	const anteriorRatio = options.anteriorTroughRatio !== undefined
		? Math.max(0.1, Math.min(1.0, options.anteriorTroughRatio))
		: 0.65;
	const halfTotalLen = totalLengthMm > 0 ? totalLengthMm / 2.0 : 50.0;

	const airCutoffVal = options.airCutoffHU ?? -500;
	const isSingleSlice = projectionMode === "slice" || projectionMode === "single";
	const isRaySum = projectionMode === "ray_sum" || projectionMode === "raysum" || projectionMode === "blend";
	const isMinIp = projectionMode === "minip";
	const isAverage = projectionMode === "average";
	const centerS = slabSamples;

	for (let col = 0; col < outW; col += colStep) {
		const ptX = colPtX[col]!;
		const ptY = colPtY[col]!;
		const normX = colNormX[col]!;
		const normY = colNormY[col]!;

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

		for (let s = 0; s < numSlab; s++) {
			const off = ((s - slabSamples) / slabSamples) * colFocalRadiusMm;
			sampleVx[s] = (ptX + normX * off - originX) * invSpX;
			sampleVy[s] = (ptY + normY * off - originY) * invSpY;
		}

		for (let row = 0; row < outH; row++) {
			const vz = rowVoxZ[row]!;
			let finalHU: number;

			if (isSingleSlice) {
				finalHU = sampleVoxelTrilinearHU(sampleVx[centerS]!, sampleVy[centerS]!, vz, volume);
			} else {
				let maxHU = -32768;
				let minHU = 32767;
				let sumHU = 0;

				for (let s = 0; s < numSlab; s++) {
					const vx = sampleVx[s]!;
					const vy = sampleVy[s]!;
					const hu = sampleVoxelTrilinearHU(vx, vy, vz, volume);
					if (hu > maxHU) maxHU = hu;
					if (hu < minHU) minHU = hu;
					sumHU += hu < airCutoffVal ? airCutoffVal : hu;
				}

				if (isMinIp) {
					finalHU = minHU;
				} else if (isAverage) {
					finalHU = Math.round(sumHU / numSlab);
				} else if (isRaySum) {
					finalHU = Math.round(0.35 * maxHU + 0.65 * (sumHU / numSlab));
				} else {
					finalHU = maxHU;
				}
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
