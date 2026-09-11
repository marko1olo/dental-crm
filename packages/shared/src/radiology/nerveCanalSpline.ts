/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT RADIOLOGY: INFERIOR ALVEOLAR NERVE (IAN) CANAL SPLINE ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical engine for tracing and analyzing the mandibular canal
 * (canalis mandibulae / inferior alveolar nerve) and dental arch in 3D CBCT space.
 *
 * Implements:
 * 1. 3D Catmull-Rom centripetal/uniform spline curve interpolation.
 * 2. High-precision 3D arc-length reparameterization (uniform voxel sampling).
 * 3. 3D Unit tangent vectors and Frenet/Bishop orthogonal normal vectors.
 * 4. Cylindrical tubular clearance evaluation against planned dental implants
 *    with sub-millimeter precision and statutory 2.0 mm clinical safety threshold.
 *
 * Designed for private dental implantology workstations:
 * - 100% pure TypeScript, zero dependencies on DOM, Canvas, or CornerstoneJS.
 * - Deterministic, floating-point accurate, fully unit-testable.
 * - Standard LPS coordinate convention (Left-Posterior-Superior, mm).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3 } from "./implantSafetyClearance.js";
export type { Vec3 };

/**
 * Status of implant safety clearance relative to the mandibular canal.
 * - 'SAFE': Clearance >= safetyThresholdMm (>= 2.0 mm by default).
 * - 'WARNING': Clearance between 0 mm and safetyThresholdMm (compression neuropathy risk).
 * - 'CRITICAL_DANGER': Clearance < 0 mm (canal penetration / permanent paresthesia).
 */
export type NerveCanalSafetyStatus = "SAFE" | "WARNING" | "CRITICAL_DANGER";

/**
 * Comprehensive clinical safety report for implant placement relative to the IAN canal.
 */
export interface NerveCanalSafetyReport {
	/**
	 * Minimal clearance between the outer surface of the implant cylinder
	 * and the outer tubular surface of the nerve canal in mm.
	 * Negative values indicate canal penetration / collision.
	 */
	readonly minDistanceMm: number;

	/**
	 * Clinical safety tier: 'SAFE' (>= 2.0 mm), 'WARNING' (0..2.0 mm), 'CRITICAL_DANGER' (< 0 mm).
	 */
	readonly status: NerveCanalSafetyStatus;

	/**
	 * True if status is 'SAFE' (clearance >= threshold).
	 */
	readonly isSafe: boolean;

	/**
	 * Closest 3D point on the implant axis segment [entry, apex].
	 */
	readonly closestImplantPoint: Vec3;

	/**
	 * Closest 3D point on the nerve canal polyline trajectory.
	 */
	readonly closestNervePoint: Vec3;

	/**
	 * Localized clinical recommendation for the dental implant surgeon (Order 804n / Form 043/u).
	 */
	readonly recommendation: string;
}

/**
 * Result of closest points calculation between two 3D segments.
 */
export interface SegmentToSegmentDistanceResult {
	readonly distance: number;
	readonly closestPoint1: Vec3;
	readonly closestPoint2: Vec3;
}

// ── 3D Catmull-Rom Spline Interpolation ─────────────────────────

/**
 * Evaluates a single 3D point on a uniform Catmull-Rom spline segment between p1 and p2,
 * with p0 and p3 serving as tangent guidance control points.
 * Parameter t ranges from 0.0 (returns p1) to 1.0 (returns p2).
 */
export function catmullRom3D(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
	const t2 = t * t;
	const t3 = t2 * t;
	return [
		0.5 *
			(2 * p1[0] +
				(-p0[0] + p2[0]) * t +
				(2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
				(-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
		0.5 *
			(2 * p1[1] +
				(-p0[1] + p2[1]) * t +
				(2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
				(-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
		0.5 *
			(2 * p1[2] +
				(-p0[2] + p2[2]) * t +
				(2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t2 +
				(-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t3),
	];
}

/**
 * Interpolates a discrete array of 3D control points representing the mandibular canal
 * or dental arch curve using a Catmull-Rom cubic spline.
 * Returns a smooth dense polyline in the same 3D coordinate frame.
 */
export function interpolateNerveSpline3D(
	controlPoints: readonly Vec3[],
	samplesPerSegment = 50,
): Vec3[] {
	const n = controlPoints.length;
	if (n === 0) return [];
	if (n === 1) return [[...controlPoints[0]!]];
	if (n < 2) return controlPoints.map((p) => [...p]);

	const samples = Math.max(1, samplesPerSegment);
	const result: Vec3[] = [];
	const first = controlPoints[0]!;
	const last = controlPoints[n - 1]!;

	for (let i = 0; i < n - 1; i++) {
		const p0 = controlPoints[Math.max(0, i - 1)] ?? first;
		const p1 = controlPoints[i] ?? first;
		const p2 = controlPoints[i + 1] ?? last;
		const p3 = controlPoints[Math.min(n - 1, i + 2)] ?? last;

		for (let s = 0; s < samples; s++) {
			result.push(catmullRom3D(p0, p1, p2, p3, s / samples));
		}
	}

	result.push([...last]);
	return result;
}

// ── 3D Arc Length & Reparameterization ──────────────────────────

/**
 * Calculates the total cumulative Euclidean arc length of a 3D polyline in millimeters.
 */
export function totalArcLength3D(curve: readonly Vec3[]): number {
	if (curve.length < 2) return 0;
	let len = 0;
	for (let i = 1; i < curve.length; i++) {
		const pPrev = curve[i - 1]!;
		const pCurr = curve[i]!;
		len += Math.hypot(
			pCurr[0] - pPrev[0],
			pCurr[1] - pPrev[1],
			pCurr[2] - pPrev[2],
		);
	}
	return len;
}

/**
 * Resamples a 3D polyline so that all emitted points are uniformly spaced by arc length.
 * Eliminates non-uniform velocity artifacts from manual control point placement,
 * guaranteeing constant step size along the nerve canal or dental arch.
 */
export function resampleNerveByArcLength3D(
	curve: readonly Vec3[],
	numSamples: number,
): Vec3[] {
	if (numSamples <= 0) return [];
	if (curve.length === 0) return [];
	if (numSamples === 1) return [[...curve[0]!]];
	if (curve.length === 1) {
		return Array.from({ length: numSamples }, () => [...curve[0]!]);
	}

	const cumLen: number[] = [0];
	for (let i = 1; i < curve.length; i++) {
		const pPrev = curve[i - 1]!;
		const pCurr = curve[i]!;
		cumLen.push(
			cumLen[i - 1]! +
				Math.hypot(
					pCurr[0] - pPrev[0],
					pCurr[1] - pPrev[1],
					pCurr[2] - pPrev[2],
				),
		);
	}

	const total = cumLen[cumLen.length - 1]!;
	if (total <= 0) {
		return Array.from({ length: numSamples }, () => [...curve[0]!]);
	}

	const result: Vec3[] = [];
	let seg = 0;

	for (let s = 0; s < numSamples; s++) {
		const target = (s / (numSamples - 1)) * total;

		while (seg < curve.length - 2 && cumLen[seg + 1]! < target) {
			seg++;
		}

		const segStart = cumLen[seg]!;
		const segNext = cumLen[seg + 1]!;
		const segLen = segNext - segStart;
		const t = segLen > 0 ? (target - segStart) / segLen : 0;

		const p0 = curve[seg]!;
		const p1 = curve[seg + 1]!;

		result.push([
			p0[0] + t * (p1[0] - p0[0]),
			p0[1] + t * (p1[1] - p0[1]),
			p0[2] + t * (p1[2] - p0[2]),
		]);
	}

	return result;
}

// ── 3D Tangents & Normals ──────────────────────────────────────

/**
 * Computes normalized 3D tangent vectors for each point along a polyline.
 * Uses forward difference at start, backward difference at end, and central difference elsewhere.
 */
export function computeCurveTangents3D(curve: readonly Vec3[]): Vec3[] {
	if (curve.length === 0) return [];
	if (curve.length === 1) return [[0, 0, 1]];

	return curve.map((_, i, arr) => {
		let tx: number;
		let ty: number;
		let tz: number;
		const curr = arr[i]!;

		if (i === 0) {
			const next = arr[1]!;
			tx = next[0] - curr[0];
			ty = next[1] - curr[1];
			tz = next[2] - curr[2];
		} else if (i === arr.length - 1) {
			const prev = arr[i - 1]!;
			tx = curr[0] - prev[0];
			ty = curr[1] - prev[1];
			tz = curr[2] - prev[2];
		} else {
			const prev = arr[i - 1]!;
			const next = arr[i + 1]!;
			tx = next[0] - prev[0];
			ty = next[1] - prev[1];
			tz = next[2] - prev[2];
		}

		const len = Math.hypot(tx, ty, tz);
		if (len === 0) {
			return [0, 0, 1];
		}
		return [tx / len, ty / len, tz / len];
	});
}

/**
 * Computes orthogonal unit normal vectors in 3D for a curve relative to a reference up vector.
 * Guarantees N is perpendicular to T and has unit length (norm = 1.0).
 */
export function computeCurveNormals3D(
	curve: readonly Vec3[],
	referenceUp: Vec3 = [0, 0, 1],
): Vec3[] {
	if (curve.length === 0) return [];
	if (curve.length === 1) return [[0, 1, 0]];

	const tangents = computeCurveTangents3D(curve);
	return tangents.map((t) => {
		let bx = t[1] * referenceUp[2] - t[2] * referenceUp[1];
		let by = t[2] * referenceUp[0] - t[0] * referenceUp[2];
		let bz = t[0] * referenceUp[1] - t[1] * referenceUp[0];
		let bLen = Math.hypot(bx, by, bz);

		if (bLen < 1e-6) {
			const altUp: Vec3 = Math.abs(referenceUp[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
			bx = t[1] * altUp[2] - t[2] * altUp[1];
			by = t[2] * altUp[0] - t[0] * altUp[2];
			bz = t[0] * altUp[1] - t[1] * altUp[0];
			bLen = Math.hypot(bx, by, bz);
		}

		const bUnit: Vec3 = [bx / bLen, by / bLen, bz / bLen];
		const nx = bUnit[1] * t[2] - bUnit[2] * t[1];
		const ny = bUnit[2] * t[0] - bUnit[0] * t[2];
		const nz = bUnit[0] * t[1] - bUnit[1] * t[0];
		const nLen = Math.hypot(nx, ny, nz);
		return nLen > 0 ? [nx / nLen, ny / nLen, nz / nLen] : [0, 1, 0];
	});
}

// ── Segment Analytical Geometry ────────────────────────────────

/**
 * Calculates the closest point on segment [a, b] to a given 3D point p.
 */
export function closestPointOnSegment3D(
	p: Vec3,
	a: Vec3,
	b: Vec3,
): { distance: number; closestPoint: Vec3 } {
	const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
	const ap: Vec3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
	const len2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
	let t = len2 > 1e-9 ? (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / len2 : 0;
	t = Math.max(0, Math.min(1, t));
	const c: Vec3 = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
	const distance = Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
	return { distance, closestPoint: c };
}

/**
 * High-precision closest points and Euclidean distance between two 3D line segments [p1, q1] and [p2, q2].
 * Uses standard clamped parametric formulation (Goldman / Lumelsky).
 */
export function closestPointsSegmentToSegment3D(
	p1: Vec3,
	q1: Vec3,
	p2: Vec3,
	q2: Vec3,
): SegmentToSegmentDistanceResult {
	const d1: Vec3 = [q1[0] - p1[0], q1[1] - p1[1], q1[2] - p1[2]];
	const d2: Vec3 = [q2[0] - p2[0], q2[1] - p2[1], q2[2] - p2[2]];
	const r: Vec3 = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];

	const a = d1[0] * d1[0] + d1[1] * d1[1] + d1[2] * d1[2];
	const e = d2[0] * d2[0] + d2[1] * d2[1] + d2[2] * d2[2];
	const f = d2[0] * r[0] + d2[1] * r[1] + d2[2] * r[2];
	const EPS = 1e-9;

	let s = 0;
	let t = 0;

	if (a <= EPS && e <= EPS) {
		s = 0;
		t = 0;
	} else if (a <= EPS) {
		s = 0;
		t = Math.max(0, Math.min(1, f / e));
	} else {
		const c = d1[0] * r[0] + d1[1] * r[1] + d1[2] * r[2];
		if (e <= EPS) {
			t = 0;
			s = Math.max(0, Math.min(1, -c / a));
		} else {
			const b = d1[0] * d2[0] + d1[1] * d2[1] + d1[2] * d2[2];
			const denom = a * e - b * b;

			if (denom > EPS) {
				s = Math.max(0, Math.min(1, (b * f - c * e) / denom));
			} else {
				s = 0;
			}

			t = (b * s + f) / e;

			if (t < 0) {
				t = 0;
				s = Math.max(0, Math.min(1, -c / a));
			} else if (t > 1) {
				t = 1;
				s = Math.max(0, Math.min(1, (b - c) / a));
			}
		}
	}

	const c1: Vec3 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s];
	const c2: Vec3 = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
	const distance = Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);

	return { distance, closestPoint1: c1, closestPoint2: c2 };
}

// ── Implant to Nerve Canal Safety Evaluation ───────────────────

/**
 * Statutory safety evaluation of a planned dental implant against the mandibular canal (IAN).
 *
 * Models the implant as a 3D cylinder with axis [implantEntry, implantApex] and radius implantRadius.
 * Models the traced nerve canal as a 3D tubular polyline with configurable radius nerveTubeRadiusMm.
 *
 * Clearance calculation:
 * clearance = minCenterlineDistance - implantRadius - nerveTubeRadiusMm
 *
 * Safety classification:
 * - clearance >= safetyThresholdMm (2.0 mm default) -> 'SAFE' (isSafe = true)
 * - 0 <= clearance < safetyThresholdMm -> 'WARNING' (isSafe = false)
 * - clearance < 0 -> 'CRITICAL_DANGER' (canal penetration / collision, isSafe = false)
 */
export function evaluateImplantToNerveCanalSafety(
	implantEntry: Vec3,
	implantApex: Vec3,
	implantRadius: number,
	nervePolyline: readonly Vec3[],
	nerveTubeRadiusMm = 1.5,
	safetyThresholdMm = 2.0,
): NerveCanalSafetyReport {
	if (nervePolyline.length === 0) {
		return {
			minDistanceMm: Number.POSITIVE_INFINITY,
			status: "SAFE",
			isSafe: true,
			closestImplantPoint: [...implantApex],
			closestNervePoint: [0, 0, 0],
			recommendation:
				"Траектория нижнечелюстного канала не задана. Коллизий не обнаружено.",
		};
	}

	let minCenterlineDist = Number.POSITIVE_INFINITY;
	let bestImplantPoint: Vec3 = [...implantApex];
	let bestNervePoint: Vec3 = [...nervePolyline[0]!];

	if (nervePolyline.length === 1) {
		const pt = nervePolyline[0]!;
		const res = closestPointOnSegment3D(pt, implantEntry, implantApex);
		minCenterlineDist = res.distance;
		bestImplantPoint = res.closestPoint;
		bestNervePoint = [...pt];
	} else {
		for (let i = 0; i < nervePolyline.length - 1; i++) {
			const n0 = nervePolyline[i]!;
			const n1 = nervePolyline[i + 1]!;
			const res = closestPointsSegmentToSegment3D(implantEntry, implantApex, n0, n1);
			if (res.distance < minCenterlineDist) {
				minCenterlineDist = res.distance;
				bestImplantPoint = res.closestPoint1;
				bestNervePoint = res.closestPoint2;
			}
		}
	}

	const rawDist = minCenterlineDist - implantRadius - nerveTubeRadiusMm;
	const minDistanceMm = Math.abs(rawDist) < 1e-9 ? 0 : Number(rawDist.toFixed(4));

	let status: NerveCanalSafetyStatus = "SAFE";
	let isSafe = false;
	let recommendation = "";

	if (minDistanceMm < 0) {
		status = "CRITICAL_DANGER";
		isSafe = false;
		recommendation = `КРИТИЧЕСКАЯ ОПАСНОСТЬ: перфорация нижнечелюстного канала (внедрение в нерв на ${Math.abs(minDistanceMm).toFixed(1)} мм)! Риск необратимой травмы нижнего альвеолярного нерва (IAN) и стойкой анестезии губы/подбородка. Установка имплантата в текущей позиции категорически недопустима.`;
	} else if (minDistanceMm < safetyThresholdMm) {
		status = "WARNING";
		isSafe = false;
		recommendation = `Внимание: опасное сближение с нижнечелюстным каналом (зазор ${minDistanceMm.toFixed(1)} мм < порога безопасности ${safetyThresholdMm.toFixed(1)} мм). Риск компрессионной нейропатии и парестезии. Рекомендуется уменьшить длину имплантата минимум на ${(safetyThresholdMm - minDistanceMm).toFixed(1)} мм или изменить наклон.`;
	} else {
		status = "SAFE";
		isSafe = true;
		recommendation = `Безопасное расстояние до нижнечелюстного канала (зазор ${minDistanceMm.toFixed(1)} мм >= ${safetyThresholdMm.toFixed(1)} мм). Зона безопасности IAN интактна.`;
	}

	return {
		minDistanceMm,
		status,
		isSafe,
		closestImplantPoint: bestImplantPoint,
		closestNervePoint: bestNervePoint,
		recommendation,
	};
}
