/**
 * crossSectionViewIntersections.ts — Линии срезов в локальном пространстве (u, v) (Мандат 8b <= 120 строк).
 */

import type { CrossSectionPlaneSpec, OrthogonalSliceCoordinates, Segment2D, Vec3 } from "./types";
import { dot3, intersectPlanes3D } from "./vectorMath";
import { clipSegment2D } from "./liangBarsky";
import { buildCrossSectionFrame } from "./crossSectionFrame";
import { SliceIntersectionScratch, GLOBAL_SCRATCH } from "./scratch";

export interface CrossSectionViewIntersections {
	axialLine: Segment2D | null;
	archCenterLine: Segment2D;
	coronalLine: Segment2D | null;
	sagittalLine: Segment2D | null;
}

export function computeCrossSectionViewIntersections(
	csSpec: CrossSectionPlaneSpec,
	coords: OrthogonalSliceCoordinates,
	out?: CrossSectionViewIntersections,
	scratch: SliceIntersectionScratch = GLOBAL_SCRATCH,
): CrossSectionViewIntersections {
	const halfW = csSpec.widthMm * 0.5;
	const halfH = Math.abs(csSpec.zMax - csSpec.zMin) * 0.5;
	const zMid = (csSpec.zMin + csSpec.zMax) * 0.5;
	const uMin = -halfW;
	const uMax = halfW;
	const vMin = -halfH;
	const vMax = halfH;

	const result: CrossSectionViewIntersections = out ?? {
		axialLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		archCenterLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		coronalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		sagittalLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
	};

	result.archCenterLine.x1 = 0;
	result.archCenterLine.y1 = vMin;
	result.archCenterLine.x2 = 0;
	result.archCenterLine.y2 = vMax;

	const MAX_TILT = 30;
	const tiltDeg = Math.max(-MAX_TILT, Math.min(MAX_TILT, csSpec.tiltDeg ?? 0));
	const cosT = Math.cos((tiltDeg * Math.PI) / 180);
	const vAxial = cosT > 1e-6 ? (coords.axialZ - zMid) / cosT : coords.axialZ - zMid;

	if (vAxial >= vMin && vAxial <= vMax) {
		if (!result.axialLine) result.axialLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.axialLine.x1 = uMin;
		result.axialLine.y1 = vAxial;
		result.axialLine.x2 = uMax;
		result.axialLine.y2 = vAxial;
	} else {
		result.axialLine = null;
	}

	const csFrame = buildCrossSectionFrame(csSpec);
	const bigT = Math.max(csSpec.widthMm, halfH * 2) * 2;
	const seg2D: Segment2D = { x1: 0, y1: 0, x2: 0, y2: 0 };

	const hasCoronal = intersectPlanes3D(csFrame.normal, csFrame.d, [0, 1, 0], coords.coronalY, scratch.rayPoint, scratch.rayDir);
	if (hasCoronal) {
		const rel0: Vec3 = [scratch.rayPoint[0] - csFrame.origin[0], scratch.rayPoint[1] - csFrame.origin[1], scratch.rayPoint[2] - csFrame.origin[2]];
		const u0 = dot3(rel0, csFrame.eU);
		const v0 = dot3(rel0, csFrame.eV);
		const du = dot3(scratch.rayDir, csFrame.eU);
		const dv = dot3(scratch.rayDir, csFrame.eV);
		if (clipSegment2D(u0 - du * bigT, v0 - dv * bigT, u0 + du * bigT, v0 + dv * bigT, uMin, uMax, vMin, vMax, seg2D)) {
			if (!result.coronalLine) result.coronalLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
			result.coronalLine.x1 = seg2D.x1; result.coronalLine.y1 = seg2D.y1;
			result.coronalLine.x2 = seg2D.x2; result.coronalLine.y2 = seg2D.y2;
		} else {
			result.coronalLine = null;
		}
	} else {
		result.coronalLine = null;
	}

	const hasSagittal = intersectPlanes3D(csFrame.normal, csFrame.d, [1, 0, 0], coords.sagittalX, scratch.rayPoint, scratch.rayDir);
	if (hasSagittal) {
		const rel0: Vec3 = [scratch.rayPoint[0] - csFrame.origin[0], scratch.rayPoint[1] - csFrame.origin[1], scratch.rayPoint[2] - csFrame.origin[2]];
		const u0 = dot3(rel0, csFrame.eU);
		const v0 = dot3(rel0, csFrame.eV);
		const du = dot3(scratch.rayDir, csFrame.eU);
		const dv = dot3(scratch.rayDir, csFrame.eV);
		if (clipSegment2D(u0 - du * bigT, v0 - dv * bigT, u0 + du * bigT, v0 + dv * bigT, uMin, uMax, vMin, vMax, seg2D)) {
			if (!result.sagittalLine) result.sagittalLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
			result.sagittalLine.x1 = seg2D.x1; result.sagittalLine.y1 = seg2D.y1;
			result.sagittalLine.x2 = seg2D.x2; result.sagittalLine.y2 = seg2D.y2;
		} else {
			result.sagittalLine = null;
		}
	} else {
		result.sagittalLine = null;
	}

	return result;
}
