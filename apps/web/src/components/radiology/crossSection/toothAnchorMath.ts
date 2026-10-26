import type { Point2D } from "../cbctCaliperNerveMath";
import {
	type DentalArchAnchor,
	type DentalArchCurve,
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	DEFAULT_MAXILLARY_ARCH_ANCHORS,
	calculateArchTangentsAndNormals,
} from "../cbctArchSplineMath";

export function findNearestToothAnchorToDistance(
	distanceAlongArchMm: number,
	archCurve: DentalArchCurve,
): DentalArchAnchor {
	if (!archCurve.anchors || archCurve.anchors.length === 0) {
		const fallbackAnchors =
			archCurve.jawType === "maxilla"
				? DEFAULT_MAXILLARY_ARCH_ANCHORS
				: DEFAULT_MANDIBULAR_ARCH_ANCHORS;
		return (
			fallbackAnchors[2] ?? {
				id: "a-46",
				toothFdi: "46",
				labelRu: "46 (1-й моляр)",
				positionMm: { x: -32.0, y: -26.0 },
				isQuadrantRight: true,
			}
		);
	}

	const vectorField = calculateArchTangentsAndNormals(archCurve.splinePointsMm);
	if (vectorField.length === 0) {
		return archCurve.anchors[0]!;
	}

	let queryPoint = vectorField[0]!.point;
	const lastIdx = vectorField.length - 1;

	if (distanceAlongArchMm <= vectorField[0]!.distanceAlongArchMm) {
		queryPoint = vectorField[0]!.point;
	} else if (distanceAlongArchMm >= vectorField[lastIdx]!.distanceAlongArchMm) {
		queryPoint = vectorField[lastIdx]!.point;
	} else {
		for (let i = 0; i < lastIdx; i++) {
			const n0 = vectorField[i]!;
			const n1 = vectorField[i + 1]!;
			if (distanceAlongArchMm >= n0.distanceAlongArchMm && distanceAlongArchMm <= n1.distanceAlongArchMm) {
				const span = n1.distanceAlongArchMm - n0.distanceAlongArchMm;
				const t = span > 1e-4 ? (distanceAlongArchMm - n0.distanceAlongArchMm) / span : 0;
				queryPoint = {
					x: n0.point.x + (n1.point.x - n0.point.x) * t,
					y: n0.point.y + (n1.point.y - n0.point.y) * t,
				};
				break;
			}
		}
	}

	let closestAnchor = archCurve.anchors[0]!;
	let minDistance = Infinity;
	const totalArcLen = archCurve.totalArcLengthMm || 100.0;
	const halfArchLen = totalArcLen > 0 ? totalArcLen / 2.0 : 50.0;
	const isTargetRight = distanceAlongArchMm < halfArchLen;
	const candidateAnchors = archCurve.anchors.filter((a) => a.isQuadrantRight === isTargetRight);
	const pool = candidateAnchors.length > 0 ? candidateAnchors : archCurve.anchors;

	for (const anchor of pool) {
		const dist = Math.hypot(anchor.positionMm.x - queryPoint.x, anchor.positionMm.y - queryPoint.y);
		if (dist < minDistance) {
			minDistance = dist;
			closestAnchor = anchor;
		}
	}

	return closestAnchor;
}

export function findNearestAnchorToPoint(pointMm: Point2D, archCurve: DentalArchCurve): DentalArchAnchor {
	let closest = archCurve.anchors[0]!;
	let minDist = Infinity;
	for (const a of archCurve.anchors) {
		const d = Math.hypot(a.positionMm.x - pointMm.x, a.positionMm.y - pointMm.y);
		if (d < minDist) {
			minDist = d;
			closest = a;
		}
	}
	return closest;
}
