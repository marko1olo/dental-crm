import type { CbctVoxelVolume } from "../cbctMprMath";
import { get16BitLut } from "../cbctMprMath";
import { type DentalArchCurve, calculateArchTangentsAndNormals } from "../cbctArchSplineMath";
import type { CrossSectionSeriesOptions, CrossSectionSliceData } from "./types";
import { findNearestToothAnchorToDistance } from "./toothAnchorMath";
import { extractSingleCrossSectionSlice } from "./singleSliceReslice";

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

	const windowWidth = options.windowWidth ?? (volume.defaultWindowWidth && volume.defaultWindowWidth >= 1000 ? volume.defaultWindowWidth : 4025);
	const windowLevel = options.windowLevel ?? (volume.defaultWindowLevel !== undefined && volume.defaultWindowLevel <= 1000 ? volume.defaultWindowLevel : 525);
	const invert = options.invert ?? false;
	const gamma = options.gamma ?? 1.50;
	const airCutoffHU = options.airCutoffHU ?? -500.0;
	const softKnee = options.softKnee ?? false;
	const slabThicknessMm = options.slabThicknessMm ?? 1.0;
	const sharedLut = get16BitLut(windowWidth, windowLevel, invert, gamma, softKnee ? { enabled: true, airCutoffHU } : { enabled: false, airCutoffHU });

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
					windowWidth,
					windowLevel,
					gamma,
					airCutoffHU,
					softKnee,
					slabThicknessMm,
				},
			);
			slices.push(slice);
			sliceIdx++;
			currentTargetDist += validStep;
		}
	}

	return slices;
}

export function generateCrossSectionSlices(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	stepMm = 2.0,
	sliceCenterZMm = -10.0,
	options: CrossSectionSeriesOptions = {},
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
