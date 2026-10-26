/**
 * axialIntersections.ts — Пересечения срезов в аксиальном вьюпорте (Мандат 8b <= 120 строк).
 */

import type { OrthogonalSliceCoordinates, BoundingBox3D, CrossSectionPlaneSpec, Segment2D, Vec3 } from "./types";
import { intersectPlanes3D } from "./vectorMath";
import { clipLineToAABB3D, clipSegment2D } from "./liangBarsky";
import { buildCrossSectionFrame } from "./crossSectionFrame";
import { SliceIntersectionScratch, GLOBAL_SCRATCH } from "./scratch";

export interface AxialViewIntersections {
	coronalLine: Segment2D | null;
	sagittalLine: Segment2D | null;
	crossSectionLine: Segment2D | null;
}

export function computeAxialIntersections(
	coords: OrthogonalSliceCoordinates,
	bounds: BoundingBox3D,
	csSpec?: CrossSectionPlaneSpec,
	out?: AxialViewIntersections,
	scratch: SliceIntersectionScratch = GLOBAL_SCRATCH,
): AxialViewIntersections {
	const result: AxialViewIntersections = out ?? {
		coronalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		sagittalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		crossSectionLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
	};

	if (coords.coronalY >= bounds.yMin && coords.coronalY <= bounds.yMax) {
		if (!result.coronalLine) result.coronalLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.coronalLine.x1 = bounds.xMin;
		result.coronalLine.y1 = coords.coronalY;
		result.coronalLine.x2 = bounds.xMax;
		result.coronalLine.y2 = coords.coronalY;
	} else {
		result.coronalLine = null;
	}

	if (coords.sagittalX >= bounds.xMin && coords.sagittalX <= bounds.xMax) {
		if (!result.sagittalLine) result.sagittalLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.sagittalLine.x1 = coords.sagittalX;
		result.sagittalLine.y1 = bounds.yMin;
		result.sagittalLine.x2 = coords.sagittalX;
		result.sagittalLine.y2 = bounds.yMax;
	} else {
		result.sagittalLine = null;
	}

	if (csSpec) {
		const csFrame = buildCrossSectionFrame(csSpec);
		const nAxial: Vec3 = [0, 0, 1];
		const hasIntersection = intersectPlanes3D(csFrame.normal, csFrame.d, nAxial, coords.axialZ, scratch.rayPoint, scratch.rayDir);
		if (hasIntersection) {
			const intersectsBox = clipLineToAABB3D(scratch.rayPoint, scratch.rayDir, bounds, scratch.seg3D);
			if (intersectsBox) {
				const halfW = csSpec.widthMm * 0.5;
				if (!result.crossSectionLine) result.crossSectionLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
				if (halfW > 0) {
					const zMid = (csSpec.zMin + csSpec.zMax) * 0.5;
					const tiltRad = ((csSpec.tiltDeg ?? 0) * Math.PI) / 180;
					const shift = (coords.axialZ - zMid) * Math.tan(tiltRad);
					const cx = csSpec.point[0] + csSpec.tangent[0] * shift;
					const cy = csSpec.point[1] + csSpec.tangent[1] * shift;
					const nx = csSpec.normal[0];
					const ny = csSpec.normal[1];
					clipSegment2D(cx - nx * halfW, cy - ny * halfW, cx + nx * halfW, cy + ny * halfW, bounds.xMin, bounds.xMax, bounds.yMin, bounds.yMax, result.crossSectionLine);
				} else {
					result.crossSectionLine.x1 = scratch.seg3D.p1[0];
					result.crossSectionLine.y1 = scratch.seg3D.p1[1];
					result.crossSectionLine.x2 = scratch.seg3D.p2[0];
					result.crossSectionLine.y2 = scratch.seg3D.p2[1];
				}
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
