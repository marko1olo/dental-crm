import type { Point2D } from "../cbctCaliperNerveMath";
import type { DentalArchAnchor } from "./cbctArchSplineTypes";

/** Fits smooth Catmull-Rom spline curve through dental arch anchor points. */
export function fitSmoothDentalArchSpline(
	anchors: readonly DentalArchAnchor[],
	samplesPerSegment = 8,
	extendRetromolarMm = 0,
	extraControlPoints?: { readonly rightExt?: readonly Point2D[]; readonly leftExt?: readonly Point2D[] },
): Point2D[] {
	if (!anchors || anchors.length === 0) return [];

	const validAnchors = anchors.filter(
		(a) => a && a.positionMm && Number.isFinite(a.positionMm.x) && Number.isFinite(a.positionMm.y),
	);
	if (validAnchors.length === 0) return [];
	if (validAnchors.length === 1) return [{ ...validAnchors[0]!.positionMm }];

	const numSamples = Math.max(1, Math.round(Number.isFinite(samplesPerSegment) ? samplesPerSegment : 8));
	let pts = validAnchors.map((a) => ({ ...a.positionMm }));

	if (extraControlPoints?.rightExt?.length || extraControlPoints?.leftExt?.length) {
		pts = [...(extraControlPoints.rightExt ?? []), ...pts, ...(extraControlPoints.leftExt ?? [])];
	} else if (extendRetromolarMm > 0 && pts.length >= 4) {
		const p0 = pts[0]!;
		const p1 = pts[1]!;
		const dirR = { x: p0.x - p1.x, y: p0.y - p1.y };
		const lenR = Math.hypot(dirR.x, dirR.y) || 1;
		const extR1 = { x: p0.x + (dirR.x / lenR) * extendRetromolarMm * 0.5, y: p0.y + (dirR.y / lenR) * extendRetromolarMm * 0.5 };
		const extR2 = { x: p0.x + (dirR.x / lenR) * extendRetromolarMm, y: p0.y + (dirR.y / lenR) * extendRetromolarMm };

		const pLast = pts[pts.length - 1]!;
		const pPrev = pts[pts.length - 2]!;
		const dirL = { x: pLast.x - pPrev.x, y: pLast.y - pPrev.y };
		const lenL = Math.hypot(dirL.x, dirL.y) || 1;
		const extL1 = { x: pLast.x + (dirL.x / lenL) * extendRetromolarMm * 0.5, y: pLast.y + (dirL.y / lenL) * extendRetromolarMm * 0.5 };
		const extL2 = { x: pLast.x + (dirL.x / lenL) * extendRetromolarMm, y: pLast.y + (dirL.y / lenL) * extendRetromolarMm };

		pts = [extR2, extR1, ...pts, extL1, extL2];
	}

	const curve: Point2D[] = [];

	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = i > 0 ? pts[i - 1]! : pts[0]!;
		const p1 = pts[i]!;
		const p2 = pts[i + 1]!;
		const p3 = i < pts.length - 2 ? pts[i + 2]! : pts[pts.length - 1]!;

		for (let s = 0; s < numSamples; s++) {
			const t = s / numSamples;
			const t2 = t * t;
			const t3 = t2 * t;

			const x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
			const y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

			if (Number.isFinite(x) && Number.isFinite(y)) {
				curve.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
			}
		}
	}

	const lastPt = pts[pts.length - 1]!;
	if (Number.isFinite(lastPt.x) && Number.isFinite(lastPt.y)) {
		curve.push({ x: Math.round(lastPt.x * 100) / 100, y: Math.round(lastPt.y * 100) / 100 });
	}

	return curve;
}

/** Calculates total arc length in physical millimeters. */
export function calculateArchLengthMm(spline: readonly Point2D[]): number {
	if (!spline || spline.length < 2) return 0;
	let total = 0;
	for (let i = 0; i < spline.length - 1; i++) {
		const p1 = spline[i]!;
		const p2 = spline[i + 1]!;
		const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
		if (Number.isFinite(dist)) {
			total += dist;
		}
	}
	return Number(total.toFixed(2));
}
