import type { Point2D } from "../cbctCaliperNerveMath";
import type { DentalArchAnchor, DentalArchCurve } from "./cbctArchSplineTypes";
import { DEFAULT_MANDIBULAR_ARCH_ANCHORS, DEFAULT_MAXILLARY_ARCH_ANCHORS } from "./cbctArchSplineTypes";
import { fitSmoothDentalArchSpline, calculateArchLengthMm } from "./cbctArchCatmullRomSpline";

/**
 * Projects an arbitrary 2D physical point onto the smooth arch spline curve.
 * Returns the closest point on the spline, arc-distance along the curve, and signed lateral offset.
 */
export function projectPointOntoArchSpline(
	pt: Point2D,
	spline: readonly Point2D[],
): { projectedPoint: Point2D; distanceAlongArchMm: number; lateralOffsetMm: number } {
	if (!spline || spline.length === 0) {
		return { projectedPoint: { ...pt }, distanceAlongArchMm: 0, lateralOffsetMm: 0 };
	}
	if (spline.length === 1) {
		return {
			projectedPoint: { ...spline[0]! }, distanceAlongArchMm: 0,
			lateralOffsetMm: Math.hypot(pt.x - spline[0]!.x, pt.y - spline[0]!.y),
		};
	}

	let bestDistSq = Infinity;
	let bestPt: Point2D = spline[0]!;
	let bestArcDist = 0;
	let accumulatedDist = 0;

	for (let i = 0; i < spline.length - 1; i++) {
		const p0 = spline[i]!;
		const p1 = spline[i + 1]!;
		const segDx = p1.x - p0.x;
		const segDy = p1.y - p0.y;
		const segLen = Math.hypot(segDx, segDy);
		if (segLen < 1e-6) continue;

		const t = Math.max(0, Math.min(1, ((pt.x - p0.x) * segDx + (pt.y - p0.y) * segDy) / (segLen * segLen)));
		const projX = p0.x + t * segDx;
		const projY = p0.y + t * segDy;
		const distSq = (pt.x - projX) ** 2 + (pt.y - projY) ** 2;

		if (distSq < bestDistSq) {
			bestDistSq = distSq;
			bestPt = { x: Number(projX.toFixed(2)), y: Number(projY.toFixed(2)) };
			bestArcDist = accumulatedDist + t * segLen;
		}
		accumulatedDist += segLen;
	}

	return { projectedPoint: bestPt, distanceAlongArchMm: Number(bestArcDist.toFixed(2)), lateralOffsetMm: Number(Math.sqrt(bestDistSq).toFixed(2)) };
}

/** Builds a complete DentalArchCurve model from anchor points or an explicit smooth spline. */
export function buildDentalArchCurve(
	anchors: readonly DentalArchAnchor[],
	jawType: "mandible" | "maxilla" = "mandible",
	focalTroughThicknessMm = 12.0,
	planeZMm?: number,
	extendRetromolarMm = 0,
	extraControlPoints?: { readonly rightExt?: readonly Point2D[]; readonly leftExt?: readonly Point2D[] },
	explicitSpline?: readonly Point2D[],
): DentalArchCurve {
	const spline = explicitSpline && explicitSpline.length >= 2
		? [...explicitSpline]
		: fitSmoothDentalArchSpline(anchors, 8, extendRetromolarMm, extraControlPoints);
	const totalLength = calculateArchLengthMm(spline);

	return {
		id: `arch-${jawType}-${Date.now()}`, jawType, anchors, splinePointsMm: spline, totalArcLengthMm: totalLength,
		focalTroughThicknessMm, ...(typeof planeZMm === "number" && Number.isFinite(planeZMm) ? { planeZMm } : {}),
	};
}

export function createDentalArchCurve(
	jawTypeOrAnchors: "mandible" | "maxilla" | readonly DentalArchAnchor[] = "mandible",
	jawType: "mandible" | "maxilla" = "mandible",
	focalTroughThicknessMm = 12.0,
	planeZMm?: number,
): DentalArchCurve {
	if (typeof jawTypeOrAnchors === "string") {
		const anchors = jawTypeOrAnchors === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS;
		return buildDentalArchCurve(anchors, jawTypeOrAnchors, focalTroughThicknessMm, planeZMm);
	}
	return buildDentalArchCurve(jawTypeOrAnchors, jawType, focalTroughThicknessMm, planeZMm);
}

/** Updates physical 2D millimeter position (X, Y) of an anchor point on the dental arch curve. */
export function updateDentalArchAnchorPosition(
	archCurve: DentalArchCurve,
	anchorIndexOrFdiOrId: number | string,
	newPositionMm: Point2D | (Point2D & { readonly zMm?: number }),
): DentalArchCurve {
	let modified = false;
	const anchors = archCurve.anchors.map((anchor, idx) => {
		const isTarget =
			(typeof anchorIndexOrFdiOrId === "number" && idx === anchorIndexOrFdiOrId) ||
			anchor.id === String(anchorIndexOrFdiOrId) ||
			anchor.toothFdi === String(anchorIndexOrFdiOrId);
		if (isTarget) {
			modified = true;
			const zVal = "zMm" in newPositionMm ? (newPositionMm as any).zMm : anchor.zMm;
			return {
				...anchor,
				positionMm: { x: Number(newPositionMm.x.toFixed(2)), y: Number(newPositionMm.y.toFixed(2)) },
				...(typeof zVal === "number" && Number.isFinite(zVal) ? { zMm: Number(zVal.toFixed(2)) } : {}),
			};
		}
		return anchor;
	});

	if (!modified) return archCurve;
	return buildDentalArchCurve(anchors, archCurve.jawType, archCurve.focalTroughThicknessMm, archCurve.planeZMm);
}
