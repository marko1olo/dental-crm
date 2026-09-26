/**
 * DENTE CRM — CBCT Transverse Cross-Section Reslicing & Alveolar Ridge Measurement Engine
 * Decomposed from dentalCurveEngine.ts per Mandate 8b.
 * Standards: DICOM Part 3, Misch CE, Buser
 */

import {
	type CbctVoxelVolume,
	get16BitLut,
	sampleVoxelTrilinearHU,
	worldMmToVoxelContinuous,
} from "./cbctMprMath";
import type { Point2D, Point3D } from "./cbctCaliperNerveMath";
import {
	type DentalArchAnchor,
	type DentalArchCurve,
	calculateArchTangentsAndNormals,
	fitSmoothDentalArchSpline,
} from "./cbctArchSplineMath";

export interface CrossSectionSliceData {
	readonly sliceIndex: number;
	readonly distanceAlongArchMm: number; // Distance from right end (0 mm) to left end
	readonly centerPointMm: Point3D;
	readonly normalVector2D: Point2D; // Perpendicular direction across ridge (Buccal - Lingual)
	readonly tangentVector2D: Point2D; // Direction along arch (Mesial - Distal)
	readonly nearestToothFdi: string;
	readonly toothLabelRu: string;
	readonly widthMm: number; // Typically 24 mm
	readonly heightMm: number; // Typically 32 mm
	readonly pixelSpacingMm: number; // Typically 0.25 mm/px
	readonly widthPx: number;
	readonly heightPx: number;
	readonly pixelData: Uint8ClampedArray; // RGBA grayscale
	readonly corticalCrestHeightMm?: number;
	readonly alveolarRidgeWidthMm?: number;
}

/**
 * Reslices a single perpendicular transverse cross-section slice at a specific curve point.
 */
export function extractSingleCrossSectionSlice(
	volume: CbctVoxelVolume,
	centerMm: Point3D,
	normal2D: Point2D,
	sliceIndex: number,
	distanceAlongArchMm: number,
	nearestAnchor: DentalArchAnchor,
	options: {
		widthMm?: number;
		heightMm?: number;
		pixelSpacingMm?: number;
		windowWidth?: number;
		windowLevel?: number;
		invert?: boolean;
	} = {},
): CrossSectionSliceData {
	const {
		widthMm = 24.0,
		heightMm = 32.0,
		pixelSpacingMm = 0.25,
		windowWidth = 4400,
		windowLevel = 1300,
		invert = false,
	} = options;

	const widthPx = Math.round(widthMm / pixelSpacingMm);
	const heightPx = Math.round(heightMm / pixelSpacingMm);
	const pixelData = new Uint8ClampedArray(widthPx * heightPx * 4);
	const lut = get16BitLut(windowWidth, windowLevel, invert);

	const halfW = widthMm / 2.0;
	const halfH = heightMm / 2.0;

	for (let y = 0; y < heightPx; y++) {
		const zOffsetMm = halfH - y * pixelSpacingMm;
		const sampleZ = centerMm.z + zOffsetMm;

		for (let x = 0; x < widthPx; x++) {
			const normalOffsetMm = -halfW + x * pixelSpacingMm;
			const sampleX = centerMm.x + normal2D.x * normalOffsetMm;
			const sampleY = centerMm.y + normal2D.y * normalOffsetMm;

			const vox = worldMmToVoxelContinuous({ x: sampleX, y: sampleY, z: sampleZ }, volume);
			const hu = sampleVoxelTrilinearHU(vox.x, vox.y, vox.z, volume);
			const gray = lut[(hu + 32768) & 0xffff]!;

			const idx = (y * widthPx + x) * 4;
			pixelData[idx] = gray;
			pixelData[idx + 1] = gray;
			pixelData[idx + 2] = gray;
			pixelData[idx + 3] = 255;
		}
	}

	return {
		sliceIndex,
		distanceAlongArchMm,
		centerPointMm: centerMm,
		normalVector2D: normal2D,
		tangentVector2D: { x: normal2D.y, y: -normal2D.x },
		nearestToothFdi: nearestAnchor.toothFdi,
		toothLabelRu: nearestAnchor.labelRu,
		widthMm,
		heightMm,
		pixelSpacingMm,
		widthPx,
		heightPx,
		pixelData,
	};
}

/**
 * Finds the nearest dental arch anchor to a given distance along the arch curve.
 */
export function findNearestToothAnchorToDistance(
	distanceAlongArchMm: number,
	archCurve: DentalArchCurve,
): DentalArchAnchor {
	if (!archCurve.anchors || archCurve.anchors.length === 0) {
		return {
			id: "a-46",
			toothFdi: "46",
			labelRu: "46 (1-й моляр)",
			positionMm: { x: -32.0, y: -26.0 },
			isQuadrantRight: true,
		};
	}

	const vectorField = calculateArchTangentsAndNormals(archCurve.splinePointsMm);
	if (vectorField.length === 0) {
		return archCurve.anchors[0]!;
	}

	let queryPoint = vectorField[0]!.point;
	for (const node of vectorField) {
		if (node.distanceAlongArchMm >= distanceAlongArchMm) {
			queryPoint = node.point;
			break;
		}
	}

	let closestAnchor = archCurve.anchors[0]!;
	let minDistance = Infinity;

	for (const anchor of archCurve.anchors) {
		const dist = Math.hypot(
			anchor.positionMm.x - queryPoint.x,
			anchor.positionMm.y - queryPoint.y,
		);
		if (dist < minDistance) {
			minDistance = dist;
			closestAnchor = anchor;
		}
	}

	return closestAnchor;
}

/**
 * Generates perpendicular transverse cross-sections along the dental arch curve at a fixed step (e.g. 1.0, 1.5, 2.0 mm).
 */
export function generateCrossSectionSlices(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	stepMm = 2.0,
	sliceCenterZMm = -10.0,
	options: {
		widthMm?: number;
		heightMm?: number;
		pixelSpacingMm?: number;
		windowWidth?: number;
		windowLevel?: number;
		invert?: boolean;
	} = {},
): CrossSectionSliceData[] {
	const vectorField = calculateArchTangentsAndNormals(archCurve.splinePointsMm);
	if (vectorField.length === 0) return [];

	const slices: CrossSectionSliceData[] = [];
	let currentTargetDist = 0;
	let sliceIdx = 1;

	for (let i = 0; i < vectorField.length; i++) {
		const node = vectorField[i]!;
		if (node.distanceAlongArchMm >= currentTargetDist || i === vectorField.length - 1) {
			const nearestAnchor = findNearestToothAnchorToDistance(node.distanceAlongArchMm, archCurve);
			const slice = extractSingleCrossSectionSlice(
				volume,
				{ x: node.point.x, y: node.point.y, z: sliceCenterZMm },
				node.normal,
				sliceIdx,
				node.distanceAlongArchMm,
				nearestAnchor,
				options,
			);
			slices.push(slice);
			sliceIdx++;
			currentTargetDist += stepMm;
		}
	}

	return slices;
}

export function generateCrossSectionsAlongArch(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	stepOrOptions: number | { stepSpacingMm?: number; windowWidth?: number; windowLevel?: number; widthMm?: number; heightMm?: number } = 2.0,
): CrossSectionSliceData[] {
	if (typeof stepOrOptions === "object") {
		const step = stepOrOptions.stepSpacingMm ?? 2.0;
		return generateCrossSectionSlices(volume, archCurve, step, -10.0, stepOrOptions);
	}
	return generateCrossSectionSlices(volume, archCurve, stepOrOptions);
}

/**
 * Analyzes alveolar ridge dimensions (Height, Crest width, Mid width, Basal width) from cross-section HU data.
 * Returns null if no bone data is detected in the cross-section slice.
 */
export function measureAlveolarRidgeCrossSection(
	crossSection: CrossSectionSliceData,
	crestDepthMm = 2.0,
): {
	heightMm: number;
	crestWidthMm: number;
	midWidthMm: number;
	baseWidthMm: number;
	isAdequateForImplant: boolean;
	clinicalAdviceRu: string;
} | null {
	if (!crossSection || !crossSection.pixelData || crossSection.pixelData.length === 0) {
		return null;
	}

	if (
		typeof crossSection.corticalCrestHeightMm === "number" &&
		typeof crossSection.alveolarRidgeWidthMm === "number" &&
		crossSection.corticalCrestHeightMm > 0 &&
		crossSection.alveolarRidgeWidthMm > 0
	) {
		const h = Number(crossSection.corticalCrestHeightMm.toFixed(1));
		const w = Number(crossSection.alveolarRidgeWidthMm.toFixed(1));
		const mid = Number((w * 1.15).toFixed(1));
		const base = Number((w * 1.35).toFixed(1));
		const isAdequate = h >= 10.0 && w >= 6.0;
		return {
			heightMm: h,
			crestWidthMm: w,
			midWidthMm: mid,
			baseWidthMm: base,
			isAdequateForImplant: isAdequate,
			clinicalAdviceRu: isAdequate
				? `Объем кости в зоне FDI #${crossSection.nearestToothFdi} достаточен для стандартного имплантата.`
				: `Внимание: Дефицит альвеолярного гребня в зоне FDI #${crossSection.nearestToothFdi}. Показана аугментация.`,
		};
	}

	const widthPx = crossSection.widthPx;
	const heightPx = crossSection.heightPx;
	const spacing = crossSection.pixelSpacingMm || 0.25;
	const pixelData = crossSection.pixelData;

	let minBoneY = -1;
	let maxBoneY = -1;
	const rowWidths: number[] = new Array(heightPx).fill(0);

	for (let y = 0; y < heightPx; y++) {
		let minX = -1;
		let maxX = -1;
		const rowOffset = y * widthPx * 4;
		for (let x = 0; x < widthPx; x++) {
			const val = pixelData[rowOffset + x * 4]!;
			if (val >= 40) {
				if (minX === -1) minX = x;
				maxX = x;
			}
		}
		if (minX !== -1 && maxX >= minX) {
			if (minBoneY === -1) minBoneY = y;
			maxBoneY = y;
			rowWidths[y] = (maxX - minX + 1) * spacing;
		}
	}

	if (minBoneY === -1 || maxBoneY <= minBoneY) {
		return null;
	}

	const measuredHeight = Number(((maxBoneY - minBoneY) * spacing).toFixed(1));
	if (measuredHeight < 2.0) {
		return null;
	}

	const crestOffsetPx = Math.min(
		maxBoneY - minBoneY,
		Math.round(crestDepthMm / spacing),
	);
	const crestY = minBoneY + crestOffsetPx;
	const midY = minBoneY + Math.round((maxBoneY - minBoneY) * 0.5);
	const baseY = Math.max(minBoneY, maxBoneY - Math.round(1.0 / spacing));

	const measuredCrestWidth = Number((rowWidths[crestY] || rowWidths[minBoneY] || 0).toFixed(1));
	const measuredMidWidth = Number((rowWidths[midY] || measuredCrestWidth).toFixed(1));
	const measuredBaseWidth = Number((rowWidths[baseY] || measuredMidWidth).toFixed(1));

	if (measuredCrestWidth <= 0) {
		return null;
	}

	const isAdequate = measuredHeight >= 10.0 && measuredCrestWidth >= 6.0;

	return {
		heightMm: measuredHeight,
		crestWidthMm: measuredCrestWidth,
		midWidthMm: measuredMidWidth,
		baseWidthMm: measuredBaseWidth,
		isAdequateForImplant: isAdequate,
		clinicalAdviceRu: isAdequate
			? `Объем кости в зоне FDI #${crossSection.nearestToothFdi} достаточен для стандартного имплантата.`
			: `Внимание: Дефицит альвеолярного гребня в зоне FDI #${crossSection.nearestToothFdi}. Показана аугментация.`,
	};
}

export type AlveolarRidgeMeasurementResult = ReturnType<typeof measureAlveolarRidgeCrossSection>;
export const interpolateArchSpline = fitSmoothDentalArchSpline;
export const getSplineNormalAndTangent = calculateArchTangentsAndNormals;

export function findNearestAnchorToPoint(pointMm: Point2D, archCurve: DentalArchCurve): DentalArchAnchor {
	let closest = archCurve.anchors[0]!;
	let minDist = Infinity;
	for (const a of archCurve.anchors) {
		const d = Math.hypot(a.positionMm.x - pointMm.x, a.positionMm.y - pointMm.y);
		if (d < minDist) {
			minDist = d;
			closest = a;
		}
	}
	return closest;
}
