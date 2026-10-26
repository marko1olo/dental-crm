/**
 * coronalIntersections.ts — Пересечения срезов в корональном вьюпорте (Мандат 8b <= 120 строк).
 */

import type { OrthogonalSliceCoordinates, BoundingBox3D, CrossSectionPlaneSpec, Segment2D, Vec3 } from "./types";
import { intersectPlanes3D } from "./vectorMath";
import { clipLineToAABB3D } from "./liangBarsky";
import { buildCrossSectionFrame } from "./crossSectionFrame";
import { SliceIntersectionScratch, GLOBAL_SCRATCH } from "./scratch";

export interface CoronalViewIntersections {
	axialLine: Segment2D | null;
	sagittalLine: Segment2D | null;
	crossSectionLine: Segment2D | null;
}

export function computeCoronalIntersections(
	coords: OrthogonalSliceCoordinates,
	bounds: BoundingBox3D,
	csSpec?: CrossSectionPlaneSpec,
	out?: CoronalViewIntersections,
	scratch: SliceIntersectionScratch = GLOBAL_SCRATCH,
): CoronalViewIntersections {
	const result: CoronalViewIntersections = out ?? {
		axialLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		sagittalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		crossSectionLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
	};

	if (coords.axialZ >= bounds.zMin && coords.axialZ <= bounds.zMax) {
		if (!result.axialLine) result.axialLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.axialLine.x1 = bounds.xMin;
		result.axialLine.y1 = coords.axialZ;
		result.axialLine.x2 = bounds.xMax;
		result.axialLine.y2 = coords.axialZ;
	} else {
		result.axialLine = null;
	}

	if (coords.sagittalX >= bounds.xMin && coords.sagittalX <= bounds.xMax) {
		if (!result.sagittalLine) result.sagittalLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.sagittalLine.x1 = coords.sagittalX;
		result.sagittalLine.y1 = bounds.zMin;
		result.sagittalLine.x2 = coords.sagittalX;
		result.sagittalLine.y2 = bounds.zMax;
	} else {
		result.sagittalLine = null;
	}

	if (csSpec) {
		const csFrame = buildCrossSectionFrame(csSpec);
		const nCoronal: Vec3 = [0, 1, 0];
		const hasIntersection = intersectPlanes3D(csFrame.normal, csFrame.d, nCoronal, coords.coronalY, scratch.rayPoint, scratch.rayDir);
		if (hasIntersection) {
			const intersectsBox = clipLineToAABB3D(scratch.rayPoint, scratch.rayDir, bounds, scratch.seg3D);
			if (intersectsBox) {
				if (!result.crossSectionLine) result.crossSectionLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
				result.crossSectionLine.x1 = scratch.seg3D.p1[0];
				result.crossSectionLine.y1 = scratch.seg3D.p1[2];
				result.crossSectionLine.x2 = scratch.seg3D.p2[0];
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
