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
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	DEFAULT_MAXILLARY_ARCH_ANCHORS,
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
	readonly sliceLabel?: string; // Formatted label, e.g. "#46 (24.0 мм)"
	readonly offsetFromMidlineMm?: number; // Distance from dental arch center point (+/- mm)
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
		offsetFromMidlineMm?: number;
	} = {},
): CrossSectionSliceData {
	const widthMm = Number.isFinite(options.widthMm) && (options.widthMm ?? 0) > 0 ? options.widthMm! : 24.0;
	const heightMm = Number.isFinite(options.heightMm) && (options.heightMm ?? 0) > 0 ? options.heightMm! : 32.0;
	const pixelSpacingMm =
		Number.isFinite(options.pixelSpacingMm) && (options.pixelSpacingMm ?? 0) > 0
			? options.pixelSpacingMm!
			: 0.25;
	const windowWidth = options.windowWidth ?? volume.defaultWindowWidth ?? 4400;
	const windowLevel = options.windowLevel ?? volume.defaultWindowLevel ?? 1300;
	const invert = options.invert ?? false;

	const widthPx = Math.round(widthMm / pixelSpacingMm);
	const heightPx = Math.round(heightMm / pixelSpacingMm);
	const pixelData = new Uint8ClampedArray(widthPx * heightPx * 4);
	const lut = get16BitLut(windowWidth, windowLevel, invert);

	const halfW = widthMm / 2.0;
	const halfH = heightMm / 2.0;

	// Normalize normal vector (guarantee non-zero, unit length)
	const nLen = Math.hypot(normal2D.x, normal2D.y);
	const unitNormal: Point2D =
		Number.isFinite(nLen) && nLen > 1e-6 ? { x: normal2D.x / nLen, y: normal2D.y / nLen } : { x: 0, y: 1 };
	const unitTangent: Point2D = { x: unitNormal.y, y: -unitNormal.x };

	for (let y = 0; y < heightPx; y++) {
		const zOffsetMm = halfH - y * pixelSpacingMm;
		const sampleZ = centerMm.z + zOffsetMm;

		for (let x = 0; x < widthPx; x++) {
			const normalOffsetMm = -halfW + x * pixelSpacingMm;
			const sampleX = centerMm.x + unitNormal.x * normalOffsetMm;
			const sampleY = centerMm.y + unitNormal.y * normalOffsetMm;

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

	const safeDistMm = Number(distanceAlongArchMm.toFixed(2));
	const sliceLabel = `#${nearestAnchor.toothFdi} (${safeDistMm.toFixed(1)} мм)`;

	return {
		sliceIndex,
		distanceAlongArchMm: safeDistMm,
		centerPointMm: centerMm,
		normalVector2D: unitNormal,
		tangentVector2D: unitTangent,
		nearestToothFdi: nearestAnchor.toothFdi,
		toothLabelRu: nearestAnchor.labelRu,
		sliceLabel,
		...(typeof options.offsetFromMidlineMm === "number" && Number.isFinite(options.offsetFromMidlineMm)
			? { offsetFromMidlineMm: Number(options.offsetFromMidlineMm.toFixed(2)) }
			: {}),
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
 * Guaranteed continuous interpolation without wrapping around at arch boundaries.
 */
export function findNearestToothAnchorToDistance(
	distanceAlongArchMm: number,
	archCurve: DentalArchCurve,
): DentalArchAnchor {
	if (!archCurve.anchors || archCurve.anchors.length === 0) {
		const fallbackAnchors =
			archCurve.jawType === "maxilla"
				? DEFAULT_MAXILLARY_ARCH_ANCHORS
				: DEFAULT_MANDIBULAR_ARCH_ANCHORS;
		return (
			fallbackAnchors[2] ?? {
				id: "a-46",
				toothFdi: "46",
				labelRu: "46 (1-й моляр)",
				positionMm: { x: -32.0, y: -26.0 },
				isQuadrantRight: true,
			}
		);
	}

	const vectorField = calculateArchTangentsAndNormals(archCurve.splinePointsMm);
	if (vectorField.length === 0) {
		return archCurve.anchors[0]!;
	}

	let queryPoint = vectorField[0]!.point;
	const lastIdx = vectorField.length - 1;

	if (distanceAlongArchMm <= vectorField[0]!.distanceAlongArchMm) {
		queryPoint = vectorField[0]!.point;
	} else if (distanceAlongArchMm >= vectorField[lastIdx]!.distanceAlongArchMm) {
		queryPoint = vectorField[lastIdx]!.point;
	} else {
		for (let i = 0; i < lastIdx; i++) {
			const n0 = vectorField[i]!;
			const n1 = vectorField[i + 1]!;
			if (distanceAlongArchMm >= n0.distanceAlongArchMm && distanceAlongArchMm <= n1.distanceAlongArchMm) {
				const span = n1.distanceAlongArchMm - n0.distanceAlongArchMm;
				const t = span > 1e-4 ? (distanceAlongArchMm - n0.distanceAlongArchMm) / span : 0;
				queryPoint = {
					x: n0.point.x + (n1.point.x - n0.point.x) * t,
					y: n0.point.y + (n1.point.y - n0.point.y) * t,
				};
				break;
			}
		}
	}

	let closestAnchor = archCurve.anchors[0]!;
	let minDistance = Infinity;

	for (const anchor of archCurve.anchors) {
		const dist = Math.hypot(anchor.positionMm.x - queryPoint.x, anchor.positionMm.y - queryPoint.y);
		if (dist < minDistance) {
			minDistance = dist;
			closestAnchor = anchor;
		}
	}

	return closestAnchor;
}

export interface CrossSectionSeriesOptions {
	readonly stepMm?: number;
	readonly stepSpacingMm?: number;
	readonly sliceCenterZMm?: number;
	readonly widthMm?: number;
	readonly heightMm?: number;
	readonly pixelSpacingMm?: number;
	readonly windowWidth?: number;
	readonly windowLevel?: number;
	readonly invert?: boolean;
}

/**
 * Extracts a complete series of perpendicular transverse cross-sections along the dental arch curve.
 * Slices are oriented along the bucco-lingual (vestibulo-oral) axis with configurable step (e.g. 1.0, 1.5, 2.0 mm).
 * Standards: DICOM Part 3, Misch CE, Buser, Planmeca Romexis 6.x.
 */
export function extractArchCrossSectionSeries(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	stepOrOptions: number | CrossSectionSeriesOptions = 2.0,
): CrossSectionSliceData[] {
	const options: CrossSectionSeriesOptions =
		typeof stepOrOptions === "object" ? stepOrOptions : { stepMm: stepOrOptions };
	const stepMm = options.stepMm ?? options.stepSpacingMm ?? 2.0;
	const validStep = Number.isFinite(stepMm) && stepMm > 0 ? stepMm : 2.0;
	const zCenter = Number.isFinite(options.sliceCenterZMm)
		? options.sliceCenterZMm!
		: (archCurve.planeZMm ?? -10.0);

	const vectorField = calculateArchTangentsAndNormals(archCurve.splinePointsMm);
	if (vectorField.length === 0) return [];

	const halfArchLength = archCurve.totalArcLengthMm > 0 ? archCurve.totalArcLengthMm / 2 : 55.0;
	const slices: CrossSectionSliceData[] = [];
	let currentTargetDist = 0;
	let sliceIdx = 1;

	for (let i = 0; i < vectorField.length; i++) {
		const node = vectorField[i]!;
		if (node.distanceAlongArchMm >= currentTargetDist || i === vectorField.length - 1) {
			const nearestAnchor = findNearestToothAnchorToDistance(node.distanceAlongArchMm, archCurve);
			const offsetFromMidlineMm = node.distanceAlongArchMm - halfArchLength;
			const slice = extractSingleCrossSectionSlice(
				volume,
				{ x: node.point.x, y: node.point.y, z: zCenter },
				node.normal,
				sliceIdx,
				node.distanceAlongArchMm,
				nearestAnchor,
				{
					...options,
					offsetFromMidlineMm,
				},
			);
			slices.push(slice);
			sliceIdx++;
			currentTargetDist += validStep;
		}
	}

	return slices;
}

/**
 * Generates perpendicular transverse cross-sections along the dental arch curve at a fixed step (e.g. 1.0, 1.5, 2.0 mm).
 * Backwards-compatible alias for extractArchCrossSectionSeries.
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
	return extractArchCrossSectionSeries(volume, archCurve, {
		stepMm,
		sliceCenterZMm,
		...options,
	});
}

export function generateCrossSectionsAlongArch(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	stepOrOptions:
		| number
		| {
				stepSpacingMm?: number;
				windowWidth?: number;
				windowLevel?: number;
				widthMm?: number;
				heightMm?: number;
		  } = 2.0,
): CrossSectionSliceData[] {
	if (typeof stepOrOptions === "object") {
		return extractArchCrossSectionSeries(volume, archCurve, {
			stepMm: stepOrOptions.stepSpacingMm ?? 2.0,
			...stepOrOptions,
		});
	}
	return extractArchCrossSectionSeries(volume, archCurve, stepOrOptions);
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

export { computeGlCrossSectionCoordinates } from "./mpr/webgl/CbctVolumeGlContext";
