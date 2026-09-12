/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: DENTAL ARCH CURVE & SPLINE ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical algorithms for cubic Hermite & Catmull-Rom dental arch
 * curve interpolation, analytical tangents, normal vectors, and arc-length
 * reparameterization for Panoramic Curved Planar Reformation (CPR).
 *
 * Adapted from DenCT core/archCurve.ts for dental outpatient chairside care.
 * Pure TypeScript, zero DOM/Cornerstone dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type Point2 = [number, number];

// ── Cubic Hermite Spline ───────────────────────────────────────

/**
 * Evaluates a cubic Hermite curve segment between p0 and p1 with tangent vectors m0 and m1.
 *
 * Basis functions:
 *   H0(t) =  2t^3 - 3t^2 + 1
 *   H1(t) =   t^3 - 2t^2 + t
 *   H2(t) = -2t^3 + 3t^2
 *   H3(t) =   t^3 -  t^2
 *
 * @param p0 Start point
 * @param m0 Start tangent vector
 * @param p1 End point
 * @param m1 End tangent vector
 * @param t Parameter in [0, 1]
 */
export function hermiteSpline(
	p0: Point2,
	m0: Point2,
	p1: Point2,
	m1: Point2,
	t: number,
): Point2 {
	const t2 = t * t;
	const t3 = t2 * t;

	const h0 = 2 * t3 - 3 * t2 + 1;
	const h1 = t3 - 2 * t2 + t;
	const h2 = -2 * t3 + 3 * t2;
	const h3 = t3 - t2;

	return [
		h0 * p0[0] + h1 * m0[0] + h2 * p1[0] + h3 * m1[0],
		h0 * p0[1] + h1 * m0[1] + h2 * p1[1] + h3 * m1[1],
	];
}

/**
 * Analytical tangent derivative of cubic Hermite segment at parameter t in [0, 1].
 */
export function hermiteTangent(
	p0: Point2,
	m0: Point2,
	p1: Point2,
	m1: Point2,
	t: number,
): Point2 {
	const t2 = t * t;

	const dh0 = 6 * t2 - 6 * t;
	const dh1 = 3 * t2 - 4 * t + 1;
	const dh2 = -6 * t2 + 6 * t;
	const dh3 = 3 * t2 - 2 * t;

	return [
		dh0 * p0[0] + dh1 * m0[0] + dh2 * p1[0] + dh3 * m1[0],
		dh0 * p0[1] + dh1 * m0[1] + dh2 * p1[1] + dh3 * m1[1],
	];
}

// ── Catmull-Rom Spline ─────────────────────────────────────────

/**
 * Standard Catmull-Rom cubic spline interpolation across 4 points p0, p1, p2, p3.
 * Represents a cubic Hermite spline where tangents at p1 and p2 are set to
 * m1 = (p2 - p0) / 2 and m2 = (p3 - p1) / 2.
 */
export function catmullRom(
	p0: Point2,
	p1: Point2,
	p2: Point2,
	p3: Point2,
	t: number,
): Point2 {
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
	];
}

/**
 * Analytical tangent vector dP/dt of the Catmull-Rom spline at t in [0, 1].
 */
export function catmullRomTangent(
	p0: Point2,
	p1: Point2,
	p2: Point2,
	p3: Point2,
	t: number,
): Point2 {
	const t2 = t * t;
	return [
		0.5 *
			(-p0[0] +
				p2[0] +
				2 * (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t +
				3 * (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t2),
		0.5 *
			(-p0[1] +
				p2[1] +
				2 * (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t +
				3 * (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t2),
	];
}

/**
 * Interpolates control points through a smooth Catmull-Rom spline polyline.
 *
 * @param controlPoints Sequential control points in LPS world XY mm.
 * @param samplesPerSegment Number of subdivisions per pair of adjacent control points.
 * @returns Dense polyline representing the dental arch curve.
 */
export function interpolateArchCurve(
	controlPoints: Point2[],
	samplesPerSegment = 50,
): Point2[] {
	const n = controlPoints.length;
	if (n < 2) return [...controlPoints];

	const result: Point2[] = [];
	for (let i = 0; i < n - 1; i++) {
		const p0 = controlPoints[Math.max(0, i - 1)]!;
		const p1 = controlPoints[i]!;
		const p2 = controlPoints[i + 1]!;
		const p3 = controlPoints[Math.min(n - 1, i + 2)]!;
		for (let s = 0; s < samplesPerSegment; s++) {
			result.push(catmullRom(p0, p1, p2, p3, s / samplesPerSegment));
		}
	}
	result.push(controlPoints[n - 1]!);
	return result;
}

// ── Tangents & Normals ─────────────────────────────────────────

/**
 * Computes unit tangent vectors along a polyline.
 * At interior points, uses central finite difference; at endpoints uses forward/backward difference.
 */
export function computeCurveTangents(curve: Point2[]): Point2[] {
	if (curve.length < 2) return curve.map((): Point2 => [1, 0]);
	return curve.map((_, i, arr) => {
		let tx: number;
		let ty: number;
		if (i === 0) {
			tx = arr[1]![0] - arr[0]![0];
			ty = arr[1]![1] - arr[0]![1];
		} else if (i === arr.length - 1) {
			tx = arr[i]![0] - arr[i - 1]![0];
			ty = arr[i]![1] - arr[i - 1]![1];
		} else {
			tx = arr[i + 1]![0] - arr[i - 1]![0];
			ty = arr[i + 1]![1] - arr[i - 1]![1];
		}
		const len = Math.hypot(tx, ty);
		if (len === 0) return [1, 0];
		return [tx / len, ty / len];
	});
}

/**
 * Computes unit normals perpendicular to the curve at each point.
 * The normal is rotated 90° clockwise from the tangent in the XY plane:
 * If tangent is [tx, ty], normal is [-ty, tx].
 * For degenerate zero-length segments, returns safe default [0, 1].
 */
export function computeCurveNormals(curve: Point2[]): Point2[] {
	if (curve.length < 2) return curve.map((): Point2 => [0, 1]);
	return curve.map((_, i, arr) => {
		let tx: number;
		let ty: number;
		if (i === 0) {
			tx = arr[1]![0] - arr[0]![0];
			ty = arr[1]![1] - arr[0]![1];
		} else if (i === arr.length - 1) {
			tx = arr[i]![0] - arr[i - 1]![0];
			ty = arr[i]![1] - arr[i - 1]![1];
		} else {
			tx = arr[i + 1]![0] - arr[i - 1]![0];
			ty = arr[i + 1]![1] - arr[i - 1]![1];
		}
		const len = Math.hypot(tx, ty);
		if (len === 0) return [0, 1];
		return [-ty / len, tx / len];
	});
}

// ── Arc Length & Reparameterization ────────────────────────────

/**
 * Computes cumulative Euclidean arc length of a polyline in mm.
 */
export function totalArcLength(curve: Point2[]): number {
	let len = 0;
	for (let i = 1; i < curve.length; i++) {
		len += Math.hypot(
			curve[i]![0] - curve[i - 1]![0],
			curve[i]![1] - curve[i - 1]![1],
		);
	}
	return len;
}

/**
 * Resamples a polyline so that output vertices are uniformly spaced by arc length.
 * Eliminates distortion and pixel stretching caused by irregular control point spacing.
 *
 * @param curve Source polyline points
 * @param numSamples Number of equidistant points to produce
 */
export function resampleByArcLength(
	curve: Point2[],
	numSamples: number,
): Point2[] {
	if (curve.length < 2 || numSamples < 2) return [...curve];

	const cumLen = [0];
	for (let i = 1; i < curve.length; i++) {
		cumLen.push(
			cumLen[i - 1]! +
				Math.hypot(
					curve[i]![0] - curve[i - 1]![0],
					curve[i]![1] - curve[i - 1]![1],
				),
		);
	}
	const total = cumLen[cumLen.length - 1]!;
	if (total === 0) return [curve[0]!];

	const result: Point2[] = [];
	let seg = 0;

	for (let s = 0; s < numSamples; s++) {
		const target = (s / (numSamples - 1)) * total;

		while (seg < curve.length - 2 && cumLen[seg + 1]! < target) {
			seg++;
		}

		const segStart = cumLen[seg]!;
		const segLen = cumLen[seg + 1]! - segStart;
		const t = segLen > 0 ? (target - segStart) / segLen : 0;

		result.push([
			curve[seg]![0] + t * (curve[seg + 1]![0] - curve[seg]![0]),
			curve[seg]![1] + t * (curve[seg + 1]![1] - curve[seg]![1]),
		]);
	}

	return result;
}

// ── Default Dental Arch Curve ──────────────────────────────────

/**
 * Generates an anatomical U-shaped dental arch centered at `center` with
 * bounding span `size` (usable axial volume size in XY mm).
 * Emits 9 control points running patient right → anterior incisors → patient left.
 * The arch opens posteriorly (+Y in standard DICOM LPS coordinate system).
 */
export function generateDefaultArchCurve(
	center: Point2,
	size: Point2,
): Point2[] {
	const [cx, cy] = center;
	const sx = size[0] * 0.32;
	const sy = size[1] * 0.32;

	return [
		[cx - sx, cy + sy * 0.85], // 1. Right wisdom / posterior molar
		[cx - sx * 0.97, cy + sy * 0.35], // 2. Right molar
		[cx - sx * 0.85, cy - sy * 0.2], // 3. Right premolar
		[cx - sx * 0.55, cy - sy * 0.7], // 4. Right canine
		[cx, cy - sy], // 5. Anterior central incisors (most anterior, min Y)
		[cx + sx * 0.55, cy - sy * 0.7], // 6. Left canine
		[cx + sx * 0.85, cy - sy * 0.2], // 7. Left premolar
		[cx + sx * 0.97, cy + sy * 0.35], // 8. Left molar
		[cx + sx, cy + sy * 0.85], // 9. Left wisdom / posterior molar
	];
}

// ── Parallel Offset Curves ─────────────────────────────────────

/**
 * Computes parallel offset polyline along normal vectors at specified distance (mm).
 * Used for panoramic slab thickness boundaries and surgical guide envelope visualization.
 */
export function offsetCurve(
	curve: Point2[],
	normals: Point2[],
	distance: number,
): Point2[] {
	return curve.map((p, i) => [
		p[0] + (normals[i] ? normals[i]![0] * distance : 0),
		p[1] + (normals[i] ? normals[i]![1] * distance : 0),
	]);
}
