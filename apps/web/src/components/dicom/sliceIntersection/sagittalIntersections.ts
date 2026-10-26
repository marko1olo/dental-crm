/**
 * sagittalIntersections.ts — Пересечения срезов в сагиттальном вьюпорте (Мандат 8b <= 120 строк).
 */

import type { OrthogonalSliceCoordinates, BoundingBox3D, CrossSectionPlaneSpec, Segment2D, Vec3 } from "./types";
import { intersectPlanes3D } from "./vectorMath";
import { clipLineToAABB3D } from "./liangBarsky";
import { buildCrossSectionFrame } from "./crossSectionFrame";
import { SliceIntersectionScratch, GLOBAL_SCRATCH } from "./scratch";

export interface SagittalViewIntersections {
	axialLine: Segment2D | null;
	coronalLine: Segment2D | null;
	crossSectionLine: Segment2D | null;
}

export function computeSagittalIntersections(
	coords: OrthogonalSliceCoordinates,
	bounds: BoundingBox3D,
	csSpec?: CrossSectionPlaneSpec,
	out?: SagittalViewIntersections,
	scratch: SliceIntersectionScratch = GLOBAL_SCRATCH,
): SagittalViewIntersections {
	const result: SagittalViewIntersections = out ?? {
		axialLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		coronalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		crossSectionLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
	};

	if (coords.axialZ >= bounds.zMin && coords.axialZ <= bounds.zMax) {
		if (!result.axialLine) result.axialLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.axialLine.x1 = bounds.yMin;
		result.axialLine.y1 = coords.axialZ;
		result.axialLine.x2 = bounds.yMax;
		result.axialLine.y2 = coords.axialZ;
	} else {
		result.axialLine = null;
	}

	if (coords.coronalY >= bounds.yMin && coords.coronalY <= bounds.yMax) {
		if (!result.coronalLine) result.coronalLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.coronalLine.x1 = coords.coronalY;
		result.coronalLine.y1 = bounds.zMin;
		result.coronalLine.x2 = coords.coronalY;
		result.coronalLine.y2 = bounds.zMax;
	} else {
		result.coronalLine = null;
	}

	if (csSpec) {
		const csFrame = buildCrossSectionFrame(csSpec);
		const nSagittal: Vec3 = [1, 0, 0];
		const hasIntersection = intersectPlanes3D(csFrame.normal, csFrame.d, nSagittal, coords.sagittalX, scratch.rayPoint, scratch.rayDir);
		if (hasIntersection) {
			const intersectsBox = clipLineToAABB3D(scratch.rayPoint, scratch.rayDir, bounds, scratch.seg3D);
			if (intersectsBox) {
				if (!result.crossSectionLine) result.crossSectionLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
				result.crossSectionLine.x1 = scratch.seg3D.p1[1];
				result.crossSectionLine.y1 = scratch.seg3D.p1[2];
				result.crossSectionLine.x2 = scratch.seg3D.p2[1];
				result.crossSectionLine.y2 = scratch.seg3D.p2[2];
			} else {
				result.crossSectionLine = null;
			}
		} else {
			result.crossSectionLine = null;
		}
	} else {
		result.crossSectionLine = null;
	}

	return result;
}
