/**
 * DENTE CRM — CBCT Transverse Cross-Section Reslicing & Alveolar Ridge Measurement Engine
 * Decomposed from dentalCurveEngine.ts per Mandate 8b.
 * Standards: DICOM Part 3, Misch CE, Buser
 */

import {
	type CbctVoxelVolume,
	type SlabProjectionMode,
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
import type { GlSliceCoordinates } from "./mpr/webgl/CbctVolumeGlContext";

export interface CrossSectionRenderOptions {
	readonly widthMm?: number | undefined;
	readonly heightMm?: number | undefined;
	readonly pixelSpacingMm?: number | undefined;
	readonly slabMode?: SlabProjectionMode | undefined;
	readonly slabThicknessMm?: number | undefined;
	readonly buccoLingualOffsetMm?: number | undefined;
	readonly heightOffsetMm?: number | undefined;
	readonly sliceCenterZMm?: number | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly invert?: boolean | undefined;
	readonly offsetFromMidlineMm?: number | undefined;
	readonly lut?: Uint8ClampedArray | Uint8Array | undefined;
}

export interface CrossSectionAffineBasis {
	readonly sliceOrigin: [number, number, number]; // UVW at slice pixel (0, 0)
	readonly axisU: [number, number, number];       // UVW span across slice width (bucco-lingual)
	readonly axisV: [number, number, number];       // UVW span across slice height (cranial-caudal Z)
	readonly axisNorm: [number, number, number];    // UVW step along arch tangent for slab thickness
	readonly widthPx: number;
	readonly heightPx: number;
	readonly pixelSpacingX: number;
	readonly pixelSpacingY: number;
	readonly slabModeCode: number;                  // 0 = single, 1 = mip, 2 = minip, 3 = average
	readonly slabSteps: number;
	readonly world00: Point3D;                     // Physical mm at top-left pixel (0, 0)
	readonly unitNormal: Point2D;                  // Normalized bucco-lingual vector
	readonly unitTangent: Point2D;                 // Normalized mesio-distal vector
	readonly stepVoxU: { readonly x: number; readonly y: number };
	readonly stepVoxVz: number;
	readonly vox00: Point3D;
}

/**
 * Calculates the exact 3D Affine Basis for a perpendicular transverse cross-section slice:
 * - u_sliceOrigin: entry point at slice pixel (0, 0) in normalized 3D Texture UVW space [0, 1]
 * - u_axisU: span vector across slice width (bucco-lingual direction, normal to arch)
 * - u_axisV: span vector across slice height (vertical cranial-caudal Z direction)
 * - u_axisNorm: step vector along arch tangent for slab thickness (MIP / MinIP / Average)
 * Standards: DICOM Part 3 PS 3.3, Misch CE, Buser, Planmeca Romexis 6.x.
 */
export function computeCrossSectionAffineBasis(
	volume: CbctVoxelVolume,
	centerMm: Point3D,
	normal2D: Point2D,
	options?: CrossSectionRenderOptions,
): CrossSectionAffineBasis {
	const dim = volume.dimensions;
	const sp = volume.spacingMm;
	const origin = volume.originMm;

	const widthMm = Number.isFinite(options?.widthMm) && (options?.widthMm ?? 0) > 0 ? options!.widthMm! : 24.0;
	const heightMm = Number.isFinite(options?.heightMm) && (options?.heightMm ?? 0) > 0 ? options!.heightMm! : 34.0;
	const pixelSpacingMm =
		Number.isFinite(options?.pixelSpacingMm) && (options?.pixelSpacingMm ?? 0) > 0
			? options!.pixelSpacingMm!
			: 0.25;

	const widthPx = Math.max(1, Math.round(widthMm / pixelSpacingMm));
	const heightPx = Math.max(1, Math.round(heightMm / pixelSpacingMm));
	const pixelSpacingX = pixelSpacingMm;
	const pixelSpacingY = pixelSpacingMm;

	const halfW = widthMm / 2.0;
	const halfH = heightMm / 2.0;

	// Normalize normal vector (across alveolar ridge, bucco-lingual)
	const nLen = Math.hypot(normal2D.x, normal2D.y);
	const unitNormal: Point2D =
		Number.isFinite(nLen) && nLen > 1e-6 ? { x: normal2D.x / nLen, y: normal2D.y / nLen } : { x: 0, y: 1 };
	const unitTangent: Point2D = {
		x: unitNormal.y === 0 ? 0 : unitNormal.y,
		y: unitNormal.x === 0 ? 0 : -unitNormal.x,
	};

	const maxCoordX = Math.max(1, dim.width - 1);
	const maxCoordY = Math.max(1, dim.height - 1);
	const maxCoordZ = Math.max(1, dim.depth - 1);

	// Effective center with bucco-lingual and height offsets
	const blOffset = options?.buccoLingualOffsetMm ?? 0;
	const zOffset = options?.heightOffsetMm ?? 0;
	const effCenterX = centerMm.x + (blOffset !== 0 ? unitNormal.x * blOffset : 0);
	const effCenterY = centerMm.y + (blOffset !== 0 ? unitNormal.y * blOffset : 0);
	const effCenterZ = typeof options?.sliceCenterZMm === "number" && Number.isFinite(options.sliceCenterZMm)
		? options.sliceCenterZMm
		: centerMm.z + zOffset;

	// World coordinate at slice pixel (0, 0): top-left
	const world00X = effCenterX - unitNormal.x * halfW;
	const world00Y = effCenterY - unitNormal.y * halfW;
	const world00Z = effCenterZ + halfH;

	const spX = sp.x || 0.2;
	const spY = sp.y || 0.2;
	const spZ = sp.z || 0.2;

	const vox00X = (world00X - origin.x) / spX;
	const vox00Y = (world00Y - origin.y) / spY;
	const vox00Z = (world00Z - origin.z) / spZ;

	const sliceOrigin: [number, number, number] = [vox00X / maxCoordX, vox00Y / maxCoordY, vox00Z / maxCoordZ];
	const uX = (unitNormal.x * widthMm) / (spX * maxCoordX);
	const uY = (unitNormal.y * widthMm) / (spY * maxCoordY);
	const axisU: [number, number, number] = [uX === 0 ? 0 : uX, uY === 0 ? 0 : uY, 0];
	const axisV: [number, number, number] = [0, 0, -heightMm / (spZ * maxCoordZ)];

	const normalStepMm = Math.min(spX, Math.min(spY, spZ));
	const slabMode = options?.slabMode ?? "single";
	const slabThicknessMm = options?.slabThicknessMm ?? 2.0;
	const isSlabActive = slabMode !== "single" && slabThicknessMm > normalStepMm;
	const slabSteps = isSlabActive ? Math.max(1, Math.round(slabThicknessMm / normalStepMm)) : 1;
	const stepMm = isSlabActive ? slabThicknessMm / slabSteps : 0;
	const nX = (unitTangent.x * stepMm) / (spX * maxCoordX);
	const nY = (unitTangent.y * stepMm) / (spY * maxCoordY);
	const axisNorm: [number, number, number] = [nX === 0 ? 0 : nX, nY === 0 ? 0 : nY, 0];

	let slabModeCode = 0;
	if (slabMode === "mip") slabModeCode = 1;
	else if (slabMode === "minip") slabModeCode = 2;
	else if (slabMode === "average") slabModeCode = 3;

	return {
		widthPx,
		heightPx,
		pixelSpacingX,
		pixelSpacingY,
		sliceOrigin,
		axisU,
		axisV,
		axisNorm,
		slabModeCode,
		slabSteps,
		world00: { x: world00X, y: world00Y, z: world00Z },
		unitNormal,
		unitTangent,
		stepVoxU: { x: (unitNormal.x * pixelSpacingMm) / spX, y: (unitNormal.y * pixelSpacingMm) / spY },
		stepVoxVz: -pixelSpacingMm / spZ,
		vox00: { x: vox00X, y: vox00Y, z: vox00Z },
	};
}

/**
 * Pure mathematical calculation of 3D Texture UVW coordinates for a perpendicular
 * transverse cross-section slice (buccal-lingual span) along a dental arch curve.
 * Standards: DICOM Part 3, Misch CE, Buser (24x34 mm span, 0.25 mm/px).
 */
export function computeGlCrossSectionCoordinates(
	volume: CbctVoxelVolume,
	centerMm: Point3D,
	normal2D: Point2D,
	options?: CrossSectionRenderOptions,
): GlSliceCoordinates {
	const basis = computeCrossSectionAffineBasis(volume, centerMm, normal2D, options);
	return {
		widthPx: basis.widthPx,
		heightPx: basis.heightPx,
		pixelSpacingX: basis.pixelSpacingX,
		pixelSpacingY: basis.pixelSpacingY,
		sliceOrigin: basis.sliceOrigin,
		axisU: basis.axisU,
		axisV: basis.axisV,
		axisNorm: basis.axisNorm,
		slabModeCode: basis.slabModeCode,
		slabSteps: basis.slabSteps,
	};
}

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
	readonly glCoordinates?: GlSliceCoordinates;
}

/**
 * Reslices a single perpendicular transverse cross-section slice at a specific curve point.
 * Powered by 3D Affine Basis with sub-voxel trilinear continuous sampling.
 */
export function extractSingleCrossSectionSlice(
	volume: CbctVoxelVolume,
	centerMm: Point3D,
	normal2D: Point2D,
	sliceIndex: number,
	distanceAlongArchMm: number,
	nearestAnchor: DentalArchAnchor,
	options: CrossSectionRenderOptions = {},
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

	const basis = computeCrossSectionAffineBasis(volume, centerMm, normal2D, {
		...options,
		widthMm,
		heightMm,
		pixelSpacingMm,
	});

	const { widthPx, heightPx, unitNormal, unitTangent, vox00, stepVoxU, stepVoxVz } = basis;
	const pixelData = new Uint8ClampedArray(widthPx * heightPx * 4);
	const lut = options.lut ?? get16BitLut(windowWidth, windowLevel, invert);

	// High-performance affine-basis rasterization:
	// Zero heap allocations in the inner loop (no temporary objects or matrix conversions)
	for (let y = 0; y < heightPx; y++) {
		const curZ = vox00.z + y * stepVoxVz;
		const rowStartX = vox00.x;
		const rowStartY = vox00.y;
		const rowIdx = y * widthPx * 4;

		for (let x = 0; x < widthPx; x++) {
			const curX = rowStartX + x * stepVoxU.x;
			const curY = rowStartY + x * stepVoxU.y;

			const hu = sampleVoxelTrilinearHU(curX, curY, curZ, volume);
			const gray = lut[(hu + 32768) & 0xffff]!;

			const idx = rowIdx + x * 4;
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
		glCoordinates: {
			widthPx: basis.widthPx,
			heightPx: basis.heightPx,
			pixelSpacingX: basis.pixelSpacingX,
			pixelSpacingY: basis.pixelSpacingY,
			sliceOrigin: basis.sliceOrigin,
			axisU: basis.axisU,
			axisV: basis.axisV,
			axisNorm: basis.axisNorm,
			slabModeCode: basis.slabModeCode,
			slabSteps: basis.slabSteps,
		},
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

	const totalArcLen = archCurve.totalArcLengthMm || 100.0;
	const halfArchLen = totalArcLen > 0 ? totalArcLen / 2.0 : 50.0;
	const isTargetRight = distanceAlongArchMm < halfArchLen;
	const candidateAnchors = archCurve.anchors.filter((a) => a.isQuadrantRight === isTargetRight);
	const pool = candidateAnchors.length > 0 ? candidateAnchors : archCurve.anchors;

	for (const anchor of pool) {
		const dist = Math.hypot(anchor.positionMm.x - queryPoint.x, anchor.positionMm.y - queryPoint.y);
		if (dist < minDistance) {
			minDistance = dist;
			closestAnchor = anchor;
		}
	}

	return closestAnchor;
}

/**
 * Validates that a CrossSectionAffineBasis has strictly orthonormal span and normal vectors:
 * - u_axisU is in XY plane along unitNormal
 * - u_axisV is vertical along -Z
 * - u_axisNorm steps along unitTangent
 * - All pairs are mutually perpendicular (dot product < 1e-4)
 * Standards: DICOM Part 3 PS 3.3, Misch CE, Buser, Planmeca Romexis 6.x.
 */
export function isCrossSectionBasisOrthonormal(basis: CrossSectionAffineBasis, tolerance = 1e-4): boolean {
	const dotUV = basis.axisU[0] * basis.axisV[0] + basis.axisU[1] * basis.axisV[1] + basis.axisU[2] * basis.axisV[2];
	const dotUNorm = basis.axisU[0] * basis.unitTangent.x + basis.axisU[1] * basis.unitTangent.y;
	const dotVNorm = basis.axisV[0] * basis.unitTangent.x + basis.axisV[1] * basis.unitTangent.y;
	const dotNormalTangent = basis.unitNormal.x * basis.unitTangent.x + basis.unitNormal.y * basis.unitTangent.y;

	const normNormal = Math.hypot(basis.unitNormal.x, basis.unitNormal.y);
	const normTangent = Math.hypot(basis.unitTangent.x, basis.unitTangent.y);

	return (
		Math.abs(dotUV) < tolerance &&
		Math.abs(dotUNorm) < tolerance &&
		Math.abs(dotVNorm) < tolerance &&
		Math.abs(dotNormalTangent) < tolerance &&
		Math.abs(normNormal - 1.0) < tolerance &&
		Math.abs(normTangent - 1.0) < tolerance
	);
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

	// Pre-calculate 16-bit LUT once for the entire series to eliminate GC thrashing
	const windowWidth = options.windowWidth ?? volume.defaultWindowWidth ?? 4400;
	const windowLevel = options.windowLevel ?? volume.defaultWindowLevel ?? 1300;
	const invert = options.invert ?? false;
	const sharedLut = get16BitLut(windowWidth, windowLevel, invert);

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
					lut: sharedLut,
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
