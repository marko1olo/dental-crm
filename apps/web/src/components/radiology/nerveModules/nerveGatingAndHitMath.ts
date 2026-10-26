/**
 * nerveGatingAndHitMath.ts — Distance gating, хит-тесты узлов нерва и построение 3D-сплайна (Мандат 8b).
 */

import type { Point3D } from "../caliperModules/caliperTypes";
import {
	MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
	type BuildMandibularNerve3DSplineParams,
	type GatedNerveSegment3D,
	type MandibularNerve3DSpline,
	type NerveDistanceGatingResult,
} from "./nerveTypes";
import { calculateSplineLength3DMm, interpolateNerveSpline3D } from "./nerveSpline3DMath";

export function calculateNerveDistanceGating(deltaZMm: number): NerveDistanceGatingResult {
	const absDeltaZ = Math.abs(deltaZMm);
	if (absDeltaZ > 6.0) {
		return { deltaZMm: Number(absDeltaZ.toFixed(3)), alpha: 0, isDashed: false, isVisible: false };
	}
	const alpha = Math.exp(-((absDeltaZ / 2.0) ** 2));
	return {
		deltaZMm: Number(absDeltaZ.toFixed(3)),
		alpha: Number(alpha.toFixed(4)),
		isDashed: absDeltaZ > 3.5,
		isVisible: true,
	};
}

export function getGatedNerveSegments(spline3D: Point3D[], sliceZMm: number): GatedNerveSegment3D[] {
	if (spline3D.length < 2) return [];
	const segments: GatedNerveSegment3D[] = [];
	for (let i = 0; i < spline3D.length - 1; i++) {
		const p1 = spline3D[i]!;
		const p2 = spline3D[i + 1]!;
		const midZ = (p1.z + p2.z) / 2.0;
		const gating = calculateNerveDistanceGating(midZ - sliceZMm);
		if (gating.isVisible) {
			segments.push({ p1, p2, midZ, deltaZMm: gating.deltaZMm, alpha: gating.alpha, isDashed: gating.isDashed, isVisible: true });
		}
	}
	return segments;
}

export function hitTestNerveNode3D(pointerMm: Point3D, nervePoints: readonly Point3D[], toleranceMm = 3.0): number {
	let closestIdx = -1;
	let minDistance = toleranceMm;
	for (let i = 0; i < nervePoints.length; i++) {
		const pt = nervePoints[i]!;
		const dist = Math.hypot(pt.x - pointerMm.x, pt.y - pointerMm.y, pt.z - pointerMm.z);
		if (dist <= minDistance) { minDistance = dist; closestIdx = i; }
	}
	return closestIdx;
}

export function hitTestNerveNodeOnAxialSlice(pointerMm: Point3D, nervePoints: readonly Point3D[], tol2D = 3.5, maxDeltaZ = 6.0): number {
	let closestIdx = -1;
	let minDistance2D = tol2D;
	for (let i = 0; i < nervePoints.length; i++) {
		const pt = nervePoints[i]!;
		if (Math.abs(pt.z - pointerMm.z) <= maxDeltaZ) {
			const dist2D = Math.hypot(pt.x - pointerMm.x, pt.y - pointerMm.y);
			if (dist2D <= minDistance2D) { minDistance2D = dist2D; closestIdx = i; }
		}
	}
	return closestIdx;
}

export function buildMandibularNerve3DSpline(points: readonly Point3D[], subdivisions?: number): MandibularNerve3DSpline;
export function buildMandibularNerve3DSpline(params: BuildMandibularNerve3DSplineParams): MandibularNerve3DSpline;
export function buildMandibularNerve3DSpline(
	paramsOrPoints: BuildMandibularNerve3DSplineParams | readonly Point3D[],
	subdivisions?: number,
): MandibularNerve3DSpline {
	if (Array.isArray(paramsOrPoints)) {
		const controlPoints = paramsOrPoints as readonly Point3D[];
		const curve = interpolateNerveSpline3D(controlPoints, subdivisions);
		return {
			id: `nerve-spline-3d-${Date.now()}-${controlPoints.length}`,
			side: "right",
			label: "Нижнечелюстной канал 3D (правый)",
			controlPoints,
			interpolatedCurve: curve,
			lengthMm: calculateSplineLength3DMm(curve),
			canalDiameterMm: 2.8,
			safetyMarginMm: MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
		};
	}
	const p = paramsOrPoints as BuildMandibularNerve3DSplineParams;
	const curve = interpolateNerveSpline3D(p.controlPoints, p.subdivisionsPerSegment);
	const sideLabel = p.side === "left" ? "левый" : p.side === "right" ? "правый" : "двусторонний";
	return {
		id: p.id || `nerve-spline-3d-${Date.now()}-${p.controlPoints.length}`,
		side: p.side || "right",
		label: p.label || `Нижнечелюстной канал 3D (${sideLabel})`,
		controlPoints: p.controlPoints,
		interpolatedCurve: curve,
		lengthMm: calculateSplineLength3DMm(curve),
		canalDiameterMm: p.canalDiameterMm ?? 2.8,
		safetyMarginMm: p.safetyMarginMm ?? MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
	};
}

export function formatNerveBadgeText(totalLengthMm: number, safetyMarginMm = MANDIBULAR_NERVE_SAFETY_MARGIN_MM): string {
	return `Канал IAN (3D ${totalLengthMm.toFixed(1)} мм · ${safetyMarginMm.toFixed(1)} мм буфер)`;
}
