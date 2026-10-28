/**
 * DENTE CRM — Arch Distance and Normal Vector Math
 * Mandate 8b (<= 120 lines).
 */

import type { Point2D } from "../../../cbctMprMath";
import type { DentalArchCurve } from "../../../dentalCurveEngine";
import { calculateArchTangentsAndNormals } from "../../../cbctArchSplineMath";

/** Finds exact 2D point, unit normal and tangent along dental arch curve at a given arc distance. */
export function findArchPointAndNormalAtDistance(
	distanceAlongArchMm: number,
	archCurve: DentalArchCurve,
): { point: Point2D; normal: Point2D; tangent: Point2D } {
	const vectorField = calculateArchTangentsAndNormals(archCurve.splinePointsMm);
	if (vectorField.length === 0) {
		return { point: { x: 0, y: 0 }, normal: { x: 0, y: 1 }, tangent: { x: 1, y: 0 } };
	}

	const lastIdx = vectorField.length - 1;
	if (distanceAlongArchMm <= vectorField[0]!.distanceAlongArchMm) {
		const f = vectorField[0]!;
		return { point: f.point, normal: f.normal, tangent: f.tangent };
	}
	if (distanceAlongArchMm >= vectorField[lastIdx]!.distanceAlongArchMm) {
		const l = vectorField[lastIdx]!;
		return { point: l.point, normal: l.normal, tangent: l.tangent };
	}

	for (let i = 0; i < lastIdx; i++) {
		const n0 = vectorField[i]!;
		const n1 = vectorField[i + 1]!;
		if (distanceAlongArchMm >= n0.distanceAlongArchMm && distanceAlongArchMm <= n1.distanceAlongArchMm) {
			const span = n1.distanceAlongArchMm - n0.distanceAlongArchMm;
			const t = span > 1e-4 ? (distanceAlongArchMm - n0.distanceAlongArchMm) / span : 0;
			const pt: Point2D = {
				x: n0.point.x + (n1.point.x - n0.point.x) * t,
				y: n0.point.y + (n1.point.y - n0.point.y) * t,
			};
			const norm: Point2D = {
				x: n0.normal.x + (n1.normal.x - n0.normal.x) * t,
				y: n0.normal.y + (n1.normal.y - n0.normal.y) * t,
			};
			const nLen = Math.hypot(norm.x, norm.y) || 1;
			norm.x /= nLen;
			norm.y /= nLen;

			const tang: Point2D = {
				x: n0.tangent.x + (n1.tangent.x - n0.tangent.x) * t,
				y: n0.tangent.y + (n1.tangent.y - n0.tangent.y) * t,
			};
			const tLen = Math.hypot(tang.x, tang.y) || 1;
			tang.x /= tLen;
			tang.y /= tLen;

			return { point: pt, normal: norm, tangent: tang };
		}
	}

	const fallback = vectorField[0]!;
	return { point: fallback.point, normal: fallback.normal, tangent: fallback.tangent };
}
