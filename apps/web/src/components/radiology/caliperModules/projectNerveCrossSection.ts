/**
 * DENTE CRM — CBCT 3D Mandibular Nerve Cross-Section Projection Math
 * Standards: DICOM Part 3, Mandate 8b (<= 120 lines).
 */

import type { Point3D } from "../cbctCaliperMeasureMath";

/**
 * Projects a 3D mandibular nerve spline onto a transverse cross-section slice.
 * Calculates exact intersection point with the slice plane (perpendicular to arch tangent).
 * Returns local cross-section coordinates (xOffsetMm, yDepthMm, distanceToPlaneMm), or null.
 */
export function project3DNerveToCrossSection(
	nerve3D: readonly Point3D[],
	sliceCenterMm: Point3D,
	normal2D: { readonly x: number; readonly y: number },
	tangent2D: { readonly x: number; readonly y: number },
	sliceHeightMm = 34.0,
	topCrestMarginMm = 4.0,
	maxDistanceToSlicePlaneMm = 3.0,
): { readonly xOffsetMm: number; readonly yDepthMm: number; readonly distanceToPlaneMm: number } | null {
	if (!nerve3D || nerve3D.length < 2) return null;

	const nLen = Math.hypot(normal2D.x, normal2D.y);
	const nx = nLen > 1e-6 ? normal2D.x / nLen : 0;
	const ny = nLen > 1e-6 ? normal2D.y / nLen : 1;

	const tLen = Math.hypot(tangent2D.x, tangent2D.y);
	const tx = tLen > 1e-6 ? tangent2D.x / tLen : -ny;
	const ty = tLen > 1e-6 ? tangent2D.y / tLen : nx;

	const crestZ = sliceCenterMm.z + (sliceHeightMm / 2.0 - topCrestMarginMm);
	let bestIntersection: { x: number; y: number; z: number } | null = null;
	let minPlaneDist = Infinity;

	for (let i = 0; i < nerve3D.length - 1; i++) {
		const p1 = nerve3D[i]!;
		const p2 = nerve3D[i + 1]!;
		const d1 = (p1.x - sliceCenterMm.x) * tx + (p1.y - sliceCenterMm.y) * ty;
		const d2 = (p2.x - sliceCenterMm.x) * tx + (p2.y - sliceCenterMm.y) * ty;

		if (d1 * d2 <= 0 && Math.abs(d2 - d1) > 1e-6) {
			const t = Math.max(0, Math.min(1, -d1 / (d2 - d1)));
			bestIntersection = {
				x: p1.x + t * (p2.x - p1.x),
				y: p1.y + t * (p2.y - p1.y),
				z: p1.z + t * (p2.z - p1.z),
			};
			minPlaneDist = 0;
			break;
		}

		const absD1 = Math.abs(d1);
		if (absD1 < minPlaneDist) {
			minPlaneDist = absD1;
			bestIntersection = { x: p1.x, y: p1.y, z: p1.z };
		}
	}

	if (!bestIntersection || minPlaneDist > maxDistanceToSlicePlaneMm) return null;

	const xOffsetMm = (bestIntersection.x - sliceCenterMm.x) * nx + (bestIntersection.y - sliceCenterMm.y) * ny;
	const yDepthMm = crestZ - bestIntersection.z;

	return {
		xOffsetMm: Number(xOffsetMm.toFixed(2)),
		yDepthMm: Number(yDepthMm.toFixed(2)),
		distanceToPlaneMm: Number(minPlaneDist.toFixed(2)),
	};
}
