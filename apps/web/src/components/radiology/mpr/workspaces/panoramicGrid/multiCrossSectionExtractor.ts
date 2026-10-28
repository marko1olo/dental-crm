/**
 * DENTE CRM — Multi-Cross-Section Extractor Engine
 * Mandate 8b (<= 120 lines).
 */

import type { CbctVoxelVolume } from "../../../cbctMprMath";
import type { CrossSectionSliceData, DentalArchCurve } from "../../../dentalCurveEngine";
import { findNearestToothAnchorToDistance, extractSingleCrossSectionSlice } from "../../../cbctCrossSectionResliceMath";
import { findArchPointAndNormalAtDistance } from "./archDistanceMath";

export interface MultiCrossSectionItem {
	readonly slice: CrossSectionSliceData;
	readonly deltaOffsetMm: number;
	readonly isCenter: boolean;
	readonly labelMm: string;
}

/**
 * Extracts a balanced 2-row multi-slice transverse gallery (6, 8, or 10 slices)
 * centered around the active cursor/tooth position along the dental arch.
 */
export function extractMultiCrossSectionsAroundCenter(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	centerDistanceMm: number,
	options: {
		readonly count?: number | undefined;
		readonly stepMm?: number | undefined;
		readonly sliceCenterZMm?: number | undefined;
		readonly windowWidth?: number | undefined;
		readonly windowLevel?: number | undefined;
		readonly gamma?: number | undefined;
		readonly useGpu?: boolean | undefined;
	} = {},
): MultiCrossSectionItem[] {
	const count = options.count === 6 ? 6 : options.count === 10 ? 10 : 8;
	const stepMm = Number.isFinite(options.stepMm) && (options.stepMm ?? 0) > 0 ? options.stepMm! : 1.0;
	const zCenter = Number.isFinite(options.sliceCenterZMm) ? options.sliceCenterZMm! : (archCurve.planeZMm ?? -10.0);
	const windowWidth = options.windowWidth ?? 4025;
	const windowLevel = options.windowLevel ?? 525;
	const gamma = options.gamma ?? 1.50;

	const centerIndex = count === 6 ? 2 : count === 10 ? 4 : 3;
	const totalArcLen = archCurve.totalArcLengthMm || 100.0;
	const items: MultiCrossSectionItem[] = [];

	for (let i = 0; i < count; i++) {
		const offsetIdx = i - centerIndex;
		const deltaOffsetMm = offsetIdx * stepMm;
		const targetDistanceMm = Math.max(0, Math.min(totalArcLen, centerDistanceMm + deltaOffsetMm));
		const { point, normal } = findArchPointAndNormalAtDistance(targetDistanceMm, archCurve);
		const nearestAnchor = findNearestToothAnchorToDistance(targetDistanceMm, archCurve);

		const isCenter = offsetIdx === 0;
		const labelMm = isCenter ? "0.0 мм (центр)" : `${deltaOffsetMm > 0 ? "+" : ""}${deltaOffsetMm.toFixed(1)} мм`;

		const slice = extractSingleCrossSectionSlice(
			volume,
			{ x: point.x, y: point.y, z: zCenter },
			normal,
			i + 1,
			targetDistanceMm,
			nearestAnchor,
			{
				windowWidth,
				windowLevel,
				gamma,
				useGpu: options.useGpu ?? true,
				offsetFromMidlineMm: deltaOffsetMm,
			},
		);

		items.push({ slice, deltaOffsetMm, isCenter, labelMm });
	}

	return items;
}
