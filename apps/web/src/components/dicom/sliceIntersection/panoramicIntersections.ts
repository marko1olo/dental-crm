/**
 * panoramicIntersections.ts — Линии срезов в панорамном (ОПТГ) вьюпорте (Мандат 8b <= 120 строк).
 */

import type { Segment2D } from "./types";

export interface PanoramicViewIntersections {
	axialLine: Segment2D | null;
	crossSectionLine: Segment2D | null;
}

export function computePanoramicIntersections(
	axialZ: number,
	csPositionNormalized: number,
	csTiltDeg: number,
	archLengthMm: number,
	zMin: number,
	zMax: number,
	out?: PanoramicViewIntersections,
): PanoramicViewIntersections {
	const result: PanoramicViewIntersections = out ?? {
		axialLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
		crossSectionLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
	};

	if (axialZ >= zMin && axialZ <= zMax && archLengthMm > 0) {
		if (!result.axialLine) result.axialLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		result.axialLine.x1 = 0;
		result.axialLine.y1 = axialZ;
		result.axialLine.x2 = archLengthMm;
		result.axialLine.y2 = axialZ;
	} else {
		result.axialLine = null;
	}

	if (archLengthMm > 0 && csPositionNormalized >= 0 && csPositionNormalized <= 1) {
		const zMid = (zMin + zMax) * 0.5;
		const sCenter = csPositionNormalized * archLengthMm;

		const MAX_TILT = 30;
		const tiltDeg = Math.max(-MAX_TILT, Math.min(MAX_TILT, csTiltDeg));
		const tanT = Math.tan((tiltDeg * Math.PI) / 180);

		const sTop = sCenter - (zMax - zMid) * tanT;
		const sBottom = sCenter - (zMin - zMid) * tanT;

		if (!result.crossSectionLine) {
			result.crossSectionLine = { x1: 0, y1: 0, x2: 0, y2: 0 };
		}
		result.crossSectionLine.x1 = sBottom;
		result.crossSectionLine.y1 = zMin;
		result.crossSectionLine.x2 = sTop;
		result.crossSectionLine.y2 = zMax;
	} else {
		result.crossSectionLine = null;
	}

	return result;
}
