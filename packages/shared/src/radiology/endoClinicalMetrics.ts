/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT RADIOLOGY: ENDODONTIC CANAL CLINICAL METRICS ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure 3D differential geometry and clinical diagnostics engine for root canals:
 *
 * 1. 3D Catmull-Rom Spline Curve Interpolation:
 *    - Continuous arc-length reparameterization with high-precision equidistant step (ds = 0.1 mm)
 *    - Analytical first (tangent) and second derivatives (curvature vector) along the trajectory
 * 2. Working Length (WL) Determination:
 *    - Anatomical Working Length (total geodesic arc length to the major apical foramen)
 *    - Physiological Working Length (Kuttler 1955: apical constriction, WL - 0.5 mm)
 * 3. Schneider Canal Curvature Angle (Schneider 1971):
 *    - Exact angular deviation between coronal access corridor and apical trajectory
 *    - Statutory risk stratification:
 *      * Low / Straight (< 10°): safe for standard 0.04/0.06 rotary Ni-Ti files
 *      * Moderate (10° - 25°): heat-treated martensitic/CM wire files, glide path indicated
 *      * Severe / High Risk (> 25°): extreme cyclic fatigue risk, pre-bent/reciprocating files
 * 4. Minimum Radius of Curvature (Pruett 1997):
 *    - R_min = 1 / max(kappa) in mm
 *    - Quantitative cyclic fatigue failure risk index
 * 5. Vertucci Root Canal Morphology Classification (Types I through VIII):
 *    - Types I (1-1), II (2-1), III (1-2-1), IV (2-2), V (1-2), VI (2-1-2), VII (1-2-1-2), VIII (3-3)
 *    - Multi-canal topological branching and convergence analysis
 *    - Russian & English clinical summaries, preparation and obturation recommendations
 *
 * 100% pure TypeScript, zero dependencies on DOM or React, fully testable.
 * Standards: ESE Endodontic Consensus, Order 804n / Form 043/u, Kuttler / Schneider / Vertucci.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Vec3 } from "./implantGeometryEngine.js";
import type { TracedCanalPath } from "./endoFastMarchingTracer.js";

export type { Vec3 };

// ── Zod Schemas & Strict Data Contracts ──────────────────────────

export const SchneiderRiskTierSchema = z.enum(["low", "moderate", "severe"]);
export type SchneiderRiskTier = z.infer<typeof SchneiderRiskTierSchema>;

export const CurvatureRadiusTierSchema = z.enum(["sharp", "moderate", "gentle"]);
export type CurvatureRadiusTier = z.infer<typeof CurvatureRadiusTierSchema>;

export const VertucciTypeEnum = z.enum([
	"TYPE_I",
	"TYPE_II",
	"TYPE_III",
	"TYPE_IV",
	"TYPE_V",
	"TYPE_VI",
	"TYPE_VII",
	"TYPE_VIII",
	"OTHER",
]);
export type VertucciType = z.infer<typeof VertucciTypeEnum>;

export const SplineSamplePointSchema = z.object({
	/** Arc-length distance from canal orifice in mm */
	arcLengthMm: z.number().nonnegative(),
	/** 3D Physical coordinates in CBCT space [x, y, z] mm */
	positionMm: z.tuple([z.number(), z.number(), z.number()]),
	/** Unit tangent vector */
	tangent: z.tuple([z.number(), z.number(), z.number()]),
	/** 3D Curvature magnitude kappa in 1/mm */
	curvature: z.number().nonnegative(),
	/** Local radius of curvature in mm (Infinity for straight sections) */
	radiusMm: z.number().positive(),
});
export type SplineSamplePoint = z.infer<typeof SplineSamplePointSchema>;

export const EndoCanalMetricsSchema = z.object({
	canalId: z.string(),
	canalName: z.string(),
	/** Anatomical working length to major apical foramen in mm */
	workingLengthAnatomicalMm: z.number().positive(),
	/** Physiological working length to apical constriction (Kuttler: WL - 0.5 mm) */
	workingLengthPhysiologicalMm: z.number().positive(),
	/** Schneider canal curvature angle in degrees */
	schneiderAngleDeg: z.number().nonnegative(),
	/** Clinical risk tier for Schneider angle */
	schneiderRiskTier: SchneiderRiskTierSchema,
	/** Minimum radius of curvature in mm: R_min = 1 / max(kappa) */
	minRadiusOfCurvatureMm: z.number().positive(),
	/** Clinical risk tier for curvature radius */
	curvatureRadiusTier: CurvatureRadiusTierSchema,
	/** Point along canal where curvature begins (Point B in Schneider's method) */
	pointOfInitialCurvatureMm: z.tuple([z.number(), z.number(), z.number()]),
	/** Arc-length from orifice where maximum curvature occurs in mm */
	maxCurvatureLocationMm: z.number().nonnegative(),
	/** Equidistantly sampled central axis points (step = 0.1 mm) */
	sampledCenterline: z.array(SplineSamplePointSchema),
	/** Localized clinical recommendation for instrumentation */
	clinicalRecommendationRu: z.string(),
});
export type EndoCanalMetrics = z.infer<typeof EndoCanalMetricsSchema>;

export const VertucciClassificationSchema = z.object({
	type: VertucciTypeEnum,
	/** Topology pattern code (e.g., '1-1', '2-1', '1-2-1', '2-2', '1-2', '2-1-2', '1-2-1-2', '3-3') */
	configurationCode: z.string(),
	nameRu: z.string(),
	nameEn: z.string(),
	orificeCount: z.number().int().positive(),
	foramenCount: z.number().int().positive(),
	clinicalDescriptionRu: z.string(),
	instrumentationProtocolRu: z.string(),
	obturationRecommendationRu: z.string(),
});
export type VertucciClassification = z.infer<typeof VertucciClassificationSchema>;

export const EndoToothClinicalReportSchema = z.object({
	toothFdi: z.number().int().optional(),
	canalCount: z.number().int().nonnegative(),
	canals: z.array(EndoCanalMetricsSchema),
	vertucci: VertucciClassificationSchema,
	/** Highest risk tier among all canals in this tooth */
	overallRiskTier: SchneiderRiskTierSchema,
	recommendedRotaryTaper: z.enum(["0.02", "0.04", "0.06"]),
	recommendedTaper: z.enum(["0.02", "0.04", "0.06"]).optional(),
	reciprocationIndicated: z.boolean(),
	reciprocatingMotionRecommended: z.boolean().optional(),
	clinicalSummaryRu: z.string(),
});
export type EndoToothClinicalReport = z.infer<typeof EndoToothClinicalReportSchema>;

// ── 3D Uniform / Centripetal Catmull-Rom Spline Engine ────────────

/**
 * Evaluates a 3D point on a Catmull-Rom spline segment between p1 and p2,
 * with p0 and p3 as tangent control points. Parameter t in [0..1].
 */
export function catmullRomPoint3D(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
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
 * Evaluates the first derivative (tangent vector r'(t)) on a Catmull-Rom spline segment.
 */
export function catmullRomDerivative3D(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
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
		0.5 *
			(-p0[2] +
				p2[2] +
				2 * (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t +
				3 * (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t2),
	];
}

/**
 * Evaluates the second derivative (r''(t)) on a Catmull-Rom spline segment.
 */
export function catmullRomSecondDerivative3D(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
	return [
		0.5 *
			(2 * (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) +
				6 * (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t),
		0.5 *
			(2 * (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) +
				6 * (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t),
		0.5 *
			(2 * (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) +
				6 * (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t),
	];
}

// ── High-Precision Arc-Length Reparameterization (ds = 0.1 mm) ────

/**
 * Fits a 3D Catmull-Rom spline to the discrete polyline and resamples it with exact
 * equidistant arc-length step (stepMm, default 0.1 mm), computing local tangent,
 * curvature, and radius of curvature at every sample point.
 */
export function fitAndSampleCatmullRomCanal(
	polylineMm: readonly Vec3[],
	stepMm = 0.1,
): SplineSamplePoint[] {
	if (polylineMm.length < 2) {
		const singlePt = polylineMm[0] ?? [0, 0, 0];
		return [
			{
				arcLengthMm: 0,
				positionMm: singlePt,
				tangent: [0, 0, 1],
				curvature: 0,
				radiusMm: 9999.0,
			},
		];
	}

	// Expand control points with virtual endpoints for boundary clamping
	const n = polylineMm.length;
	const pStart = polylineMm[0]!;
	const pSecond = polylineMm[1]!;
	const pEnd = polylineMm[n - 1]!;
	const pPenultimate = polylineMm[n - 2]!;

	// Extrapolate phantom control points: p_{-1} = 2*p_0 - p_1
	const pMinus1: Vec3 = [
		2 * pStart[0] - pSecond[0],
		2 * pStart[1] - pSecond[1],
		2 * pStart[2] - pSecond[2],
	];
	// p_{n} = 2*p_{n-1} - p_{n-2}
	const pPlus1: Vec3 = [
		2 * pEnd[0] - pPenultimate[0],
		2 * pEnd[1] - pPenultimate[1],
		2 * pEnd[2] - pPenultimate[2],
	];

	const points: Vec3[] = [pMinus1, ...polylineMm, pPlus1];
	const segmentCount = n - 1;

	// Pre-sample each spline segment finely to build an accurate arc-length parameterization table
	const SUBDIVISIONS_PER_SEGMENT = 30;
	interface FineSample {
		segmentIdx: number;
		t: number;
		arcLen: number;
	}

	const fineSamples: FineSample[] = [];
	let cumulativeLength = 0;
	let prevPos: Vec3 = pStart;

	fineSamples.push({ segmentIdx: 0, t: 0, arcLen: 0 });

	for (let i = 0; i < segmentCount; i++) {
		const p0 = points[i]!;
		const p1 = points[i + 1]!;
		const p2 = points[i + 2]!;
		const p3 = points[i + 3]!;

		for (let s = 1; s <= SUBDIVISIONS_PER_SEGMENT; s++) {
			const t = s / SUBDIVISIONS_PER_SEGMENT;
			const pos = catmullRomPoint3D(p0, p1, p2, p3, t);
			const dist = Math.hypot(pos[0] - prevPos[0], pos[1] - prevPos[1], pos[2] - prevPos[2]);
			cumulativeLength += dist;
			fineSamples.push({ segmentIdx: i, t, arcLen: cumulativeLength });
			prevPos = pos;
		}
	}

	const totalLength = cumulativeLength;
	const sampleCount = Math.max(2, Math.floor(totalLength / stepMm) + 1);
	const results: SplineSamplePoint[] = [];

	let fineIdx = 0;

	for (let k = 0; k < sampleCount; k++) {
		const targetArcLen = Math.min(totalLength, k * stepMm);

		// Advance fine index to find interval enclosing targetArcLen
		while (
			fineIdx < fineSamples.length - 1 &&
			(fineSamples[fineIdx + 1]?.arcLen ?? Infinity) < targetArcLen
		) {
			fineIdx++;
		}

		const s0 = fineSamples[fineIdx]!;
		const s1 = fineSamples[fineIdx + 1] ?? s0;

		const span = s1.arcLen - s0.arcLen;
		const alpha = span > 1e-8 ? (targetArcLen - s0.arcLen) / span : 0;
		const segIdx = s0.segmentIdx;
		const t = s0.t + alpha * (s1.t - s0.t);

		const p0 = points[segIdx]!;
		const p1 = points[segIdx + 1]!;
		const p2 = points[segIdx + 2]!;
		const p3 = points[segIdx + 3]!;

		const pos = catmullRomPoint3D(p0, p1, p2, p3, t);
		const rPrime = catmullRomDerivative3D(p0, p1, p2, p3, t);
		const rDoublePrime = catmullRomSecondDerivative3D(p0, p1, p2, p3, t);

		const speed = Math.hypot(rPrime[0], rPrime[1], rPrime[2]);
		const tangent: Vec3 =
			speed > 1e-8
				? [rPrime[0] / speed, rPrime[1] / speed, rPrime[2] / speed]
				: [0, 0, 1];

		// Curvature: kappa = ||r' x r''|| / ||r'||^3
		const crossX = rPrime[1] * rDoublePrime[2] - rPrime[2] * rDoublePrime[1];
		const crossY = rPrime[2] * rDoublePrime[0] - rPrime[0] * rDoublePrime[2];
		const crossZ = rPrime[0] * rDoublePrime[1] - rPrime[1] * rDoublePrime[0];
		const crossNorm = Math.hypot(crossX, crossY, crossZ);

		const speed3 = speed * speed * speed;
		const curvature = speed3 > 1e-8 ? crossNorm / speed3 : 0.0;
		const radiusMm = curvature > 1e-6 ? Math.min(9999.0, 1.0 / curvature) : 9999.0;

		results.push({
			arcLengthMm: targetArcLen,
			positionMm: pos,
			tangent,
			curvature,
			radiusMm,
		});
	}

	return results;
}

// ── Schneider Canal Curvature & Risk Assessment ───────────────────

/**
 * Computes Schneider canal curvature angle, Point B (point of initial curvature),
 * and minimum radius of curvature R_min from the sampled 3D spline.
 */
export function computeSchneiderCurvatureMetrics(
	sampledCenterline: readonly SplineSamplePoint[],
): {
	schneiderAngleDeg: number;
	schneiderRiskTier: SchneiderRiskTier;
	minRadiusOfCurvatureMm: number;
	curvatureRadiusTier: CurvatureRadiusTier;
	pointOfInitialCurvatureMm: Vec3;
	maxCurvatureLocationMm: number;
} {
	if (sampledCenterline.length < 3) {
		const pt0 = sampledCenterline[0]?.positionMm ?? [0, 0, 0];
		return {
			schneiderAngleDeg: 0,
			schneiderRiskTier: "low",
			minRadiusOfCurvatureMm: 9999.0,
			curvatureRadiusTier: "gentle",
			pointOfInitialCurvatureMm: pt0,
			maxCurvatureLocationMm: 0,
		};
	}

	const n = sampledCenterline.length;
	const pointA = sampledCenterline[0]!.positionMm;
	const pointC = sampledCenterline[n - 1]!.positionMm;

	// In Schneider's method:
	// Point B is the point where the canal deviates from the straight coronal trajectory.
	// We locate Point B by checking where the local curvature kappa exceeds 0.04 mm^-1
	// or where the angle relative to the coronal tangent exceeds 3.0 degrees.
	const coronalTangent = sampledCenterline[0]!.tangent;
	let pointBFineIdx = Math.floor(n * 0.33); // Fallback: 1/3 of canal length

	for (let i = 1; i < n - 1; i++) {
		const sample = sampledCenterline[i]!;
		const dirToPt: Vec3 = [
			sample.positionMm[0] - pointA[0],
			sample.positionMm[1] - pointA[1],
			sample.positionMm[2] - pointA[2],
		];
		const len = Math.hypot(dirToPt[0], dirToPt[1], dirToPt[2]);
		if (len < 1e-6) continue;

		const dot = (dirToPt[0] * coronalTangent[0] + dirToPt[1] * coronalTangent[1] + dirToPt[2] * coronalTangent[2]) / len;
		const devDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * (180.0 / Math.PI);

		if (devDeg > 3.5 || sample.curvature > 0.05) {
			pointBFineIdx = i;
			break;
		}
	}

	const pointB = sampledCenterline[pointBFineIdx]!.positionMm;

	// Schneider angle alpha: supplementary angle between Line AB and Line BC
	// Vector AB: pointB - pointA
	const ab: Vec3 = [pointB[0] - pointA[0], pointB[1] - pointA[1], pointB[2] - pointA[2]];
	// Vector BC: pointC - pointB
	const bc: Vec3 = [pointC[0] - pointB[0], pointC[1] - pointB[1], pointC[2] - pointB[2]];

	const lenAB = Math.hypot(ab[0], ab[1], ab[2]);
	const lenBC = Math.hypot(bc[0], bc[1], bc[2]);

	let schneiderAngleDeg = 0.0;
	if (lenAB > 1e-6 && lenBC > 1e-6) {
		const cosTheta = (ab[0] * bc[0] + ab[1] * bc[1] + ab[2] * bc[2]) / (lenAB * lenBC);
		schneiderAngleDeg = Math.acos(Math.max(-1.0, Math.min(1.0, cosTheta))) * (180.0 / Math.PI);
	}

	// Schneider Risk Tier: < 10 deg -> low, 10-25 deg -> moderate, > 25 deg -> severe
	let schneiderRiskTier: SchneiderRiskTier = "low";
	if (schneiderAngleDeg >= 25.0) {
		schneiderRiskTier = "severe";
	} else if (schneiderAngleDeg >= 10.0) {
		schneiderRiskTier = "moderate";
	}

	// Minimum radius of curvature: R_min = 1 / max(kappa)
	let maxKappa = 0.0;
	let maxKappaLoc = 0.0;

	for (const sample of sampledCenterline) {
		if (sample.curvature > maxKappa) {
			maxKappa = sample.curvature;
			maxKappaLoc = sample.arcLengthMm;
		}
	}

	const minRadiusOfCurvatureMm = maxKappa > 1e-6 ? 1.0 / maxKappa : 9999.0;

	let curvatureRadiusTier: CurvatureRadiusTier = "gentle";
	if (minRadiusOfCurvatureMm < 4.0) {
		curvatureRadiusTier = "sharp";
	} else if (minRadiusOfCurvatureMm <= 8.0) {
		curvatureRadiusTier = "moderate";
	}

	return {
		schneiderAngleDeg,
		schneiderRiskTier,
		minRadiusOfCurvatureMm,
		curvatureRadiusTier,
		pointOfInitialCurvatureMm: pointB,
		maxCurvatureLocationMm: maxKappaLoc,
	};
}

// ── Vertucci Topology Classification (Types I through VIII) ──────

/**
 * Analyzes root canal topology and classifies it according to Vertucci's criteria:
 * - Type I (1-1): 1 canal leaves pulp chamber, 1 foramen at apex
 * - Type II (2-1): 2 canals leave pulp chamber, join to exit as 1 foramen
 * - Type III (1-2-1): 1 canal leaves pulp chamber, divides into 2, joins to exit as 1 foramen
 * - Type IV (2-2): 2 separate canals from pulp chamber to 2 foramina
 * - Type V (1-2): 1 canal leaves pulp chamber, divides short of apex into 2 foramina
 * - Type VI (2-1-2): 2 canals leave, join in middle, divide into 2 foramina
 * - Type VII (1-2-1-2): 1 canal leaves, divides, joins, divides into 2 foramina
 * - Type VIII (3-3): 3 separate canals from pulp chamber to 3 foramina
 */
export function classifyVertucciTopology(
	canals: readonly TracedCanalPath[],
): VertucciClassification {
	if (canals.length === 0) {
		return {
			type: "TYPE_I",
			configurationCode: "1-1",
			nameRu: "Тип I по Вертуччи (1-1)",
			nameEn: "Vertucci Type I (1-1)",
			orificeCount: 1,
			foramenCount: 1,
			clinicalDescriptionRu: "Один канал от устья до апекса без разветвлений.",
			instrumentationProtocolRu: "Стандартная ротационная обработка Ni-Ti инструментами с конусностью 0.04-0.06.",
			obturationRecommendationRu: "Метод одного штифта с биокерамическим силером или латеральная компакция.",
		};
	}

	// Distinct orifices and apices based on coordinate proximity (< 1.2 mm)
	const uniqueOrifices: Vec3[] = [];
	for (const c of canals) {
		const pos = c.orifice.worldPositionMm;
		if (!uniqueOrifices.some((u) => Math.hypot(u[0] - pos[0], u[1] - pos[1], u[2] - pos[2]) < 1.2)) {
			uniqueOrifices.push(pos);
		}
	}

	const uniqueApices: Vec3[] = [];
	for (const c of canals) {
		const pos = c.apicalForamen.worldPositionMm;
		if (!uniqueApices.some((u) => Math.hypot(u[0] - pos[0], u[1] - pos[1], u[2] - pos[2]) < 1.2)) {
			uniqueApices.push(pos);
		}
	}

	const orificeCount = uniqueOrifices.length;
	const foramenCount = uniqueApices.length;

	// Check for mid-root divergence or convergence
	let midRootBranches = orificeCount;
	if (canals.length >= 2) {
		// Evaluate distance between first two canals at 50% length
		const c1 = canals[0]!;
		const c2 = canals[1]!;
		const idx1 = Math.floor(c1.polylineMm.length * 0.5);
		const idx2 = Math.floor(c2.polylineMm.length * 0.5);
		const pt1 = c1.polylineMm[idx1] ?? [0, 0, 0];
		const pt2 = c2.polylineMm[idx2] ?? [0, 0, 0];
		const midDist = Math.hypot(pt1[0] - pt2[0], pt1[1] - pt2[1], pt1[2] - pt2[2]);

		if (midDist < 0.6) {
			midRootBranches = 1; // Merged at mid-root
		} else {
			midRootBranches = 2; // Separate at mid-root
		}
	}

	// Classify Vertucci types
	let type: VertucciType = "TYPE_I";
	let code = "1-1";
	let nameRu = "Тип I по Вертуччи (1-1)";
	let nameEn = "Vertucci Type I (1-1)";
	let descRu = "Один магистральный канал от устья до апикального отверстия.";
	let prepRu = "Стандартная ротационная обработка с конусностью 0.04-0.06.";
	let obtRu = "Метод одного штифта с биокерамическим силером или волна конденсации.";

	if (orificeCount === 1 && foramenCount === 1) {
		if (midRootBranches === 2) {
			// 1-2-1
			type = "TYPE_III";
			code = "1-2-1";
			nameRu = "Тип III по Вертуччи (1-2-1)";
			nameEn = "Vertucci Type III (1-2-1)";
			descRu = "Один канал отходит от дна полости зуба, раздваивается в средней трети и соединяется в одно апикальное отверстие.";
			prepRu = "Создание надежного коврового пути (glide path), ультразвуковая активация ирригации для очистки перешейка (isthmus).";
			obtRu = "Теплая вертикальная конденсация гуттаперчи для заполнения средней зоны расхождения.";
		} else {
			type = "TYPE_I";
			code = "1-1";
			nameRu = "Тип I по Вертуччи (1-1)";
			nameEn = "Vertucci Type I (1-1)";
			descRu = "Один непрерывный канал от устья до апекса.";
			prepRu = "Стандартное ротационное препарирование.";
			obtRu = "Метод одного калиброванного штифта с биокерамикой.";
		}
	} else if (orificeCount === 2 && foramenCount === 1) {
		type = "TYPE_II";
		code = "2-1";
		nameRu = "Тип II по Вертуччи (2-1)";
		nameEn = "Vertucci Type II (2-1)";
		descRu = "Два раздельных устья, каналы объединяются в апикальной трети и выходят одним общим отверстием.";
		prepRu = "Определение точки слияния (confluence point); обработка основного канала на полную рабочую длину, вспомогательного — до точки слияния во избежание образования ступеньки.";
		obtRu = "Сначала обтурация на всю длину общего канала, затем подведение штифта во второй канал до точки соединения.";
	} else if (orificeCount === 2 && foramenCount === 2) {
		if (midRootBranches === 1) {
			// 2-1-2
			type = "TYPE_VI";
			code = "2-1-2";
			nameRu = "Тип VI по Вертуччи (2-1-2)";
			nameEn = "Vertucci Type VI (2-1-2)";
			descRu = "Два канала отходят от устья, сливаются в средней трети и вновь разделяются перед апексом на два отверстия.";
			prepRu = "Осторожная инструментация перешейка гибкими термообработанными файлами (CM-wire), обильная ирригация NaOCl + ЭДТА.";
			obtRu = "Трехмерная обтурация термопластифицированной гуттаперчей.";
		} else {
			type = "TYPE_IV";
			code = "2-2";
			nameRu = "Тип IV по Вертуччи (2-2)";
			nameEn = "Vertucci Type IV (2-2)";
			descRu = "Два полностью независимых канала от устьев до отдельных апикальных отверстий.";
			prepRu = "Независимое препарирование каждого канала на свою рабочую длину.";
			obtRu = "Раздельная обтурация обоих каналов с контролем апикального упора.";
		}
	} else if (orificeCount === 1 && foramenCount === 2) {
		type = "TYPE_V";
		code = "1-2";
		nameRu = "Тип V по Вертуччи (1-2)";
		nameEn = "Vertucci Type V (1-2)";
		descRu = "Один широкий канал от устья делится непосредственно перед верхушкой корня на два самостоятельных отверстия.";
		prepRu = "Высокий риск пропуска второго апикального выхода; предварительный изгиб ручных файлов для поиска бифуркации.";
		obtRu = "Инъекционная методика жидкой гуттаперчи (Backfill) или непрерывная волна конденсации.";
	} else if (orificeCount === 3 && foramenCount === 3) {
		type = "TYPE_VIII";
		code = "3-3";
		nameRu = "Тип VIII по Вертуччи (3-3)";
		nameEn = "Vertucci Type VIII (3-3)";
		descRu = "Три полностью обособленных канала в одном корне от устьев до апекса (редкая анатомическая вариация).";
		prepRu = "Щадящая обработка файлами малой конусности (0.02-0.04) во избежание ленточной перфорации (strip perforation).";
		obtRu = "Индивидуальная обтурация каждого канала биосовместимым силером.";
	} else {
		type = "OTHER";
		code = `${orificeCount}-${foramenCount}`;
		nameRu = `Сложная конфигурация (${orificeCount}-${foramenCount})`;
		nameEn = `Complex Configuration (${orificeCount}-${foramenCount})`;
		descRu = `Анатомическая вариация с ${orificeCount} устьями и ${foramenCount} апикальными выходами.`;
		prepRu = "Индивидуальный протокол под контролем операционного микроскопа.";
		obtRu = "Комбинированная методика обтурации.";
	}

	return {
		type,
		configurationCode: code,
		nameRu,
		nameEn,
		orificeCount,
		foramenCount,
		clinicalDescriptionRu: descRu,
		instrumentationProtocolRu: prepRu,
		obturationRecommendationRu: obtRu,
	};
}

// ── Complete Endodontic Clinical Evaluation ──────────────────────

/**
 * Evaluates comprehensive clinical metrics for a single traced root canal path.
 */
export function evaluateCanalClinicalMetrics(
	canal: TracedCanalPath,
	stepMm = 0.1,
): EndoCanalMetrics {
	// Fit 3D Catmull-Rom spline and sample with 0.1 mm precision
	const sampledCenterline = fitAndSampleCatmullRomCanal(canal.polylineMm, stepMm);

	// Anatomical Working Length
	const lastSample = sampledCenterline[sampledCenterline.length - 1];
	const workingLengthAnatomicalMm = lastSample ? lastSample.arcLengthMm : canal.geodesicLengthMm;

	// Physiological Working Length (Kuttler 1955: 0.5 mm short of anatomical apex)
	const workingLengthPhysiologicalMm = Math.max(0.5, workingLengthAnatomicalMm - 0.5);

	// Curvature metrics
	const curvature = computeSchneiderCurvatureMetrics(sampledCenterline);

	let clinicalRecommendationRu = "Канал прямой. Допускается применение ротационных инструментов со стандартной конусностью 0.04-0.06.";
	if (curvature.schneiderRiskTier === "severe" || curvature.curvatureRadiusTier === "sharp") {
		clinicalRecommendationRu =
			`Критическая кривизна (${curvature.schneiderAngleDeg.toFixed(1)}°, радиус R_min = ${curvature.minRadiusOfCurvatureMm.toFixed(1)} мм). ` +
			"Высокий риск поломки инструмента (циклическая усталость) и образования уступа. " +
			"Рекомендовано: создание ручного коврового пути до размера 15/0.02, использование контролируемой памяти формы (CM-Wire/Blue) " +
			"с конусностью не более 0.04 или возвратно-поступательное движение (реципрокация).";
	} else if (curvature.schneiderRiskTier === "moderate") {
		clinicalRecommendationRu =
			`Умеренная кривизна (${curvature.schneiderAngleDeg.toFixed(1)}°). ` +
			"Рекомендовано использование термообработанных Ni-Ti файлов с конусностью 0.04, обязательный контроль рабочей длины апекслокатором.";
	}

	return {
		canalId: canal.canalId,
		canalName: canal.canalName,
		workingLengthAnatomicalMm,
		workingLengthPhysiologicalMm,
		schneiderAngleDeg: curvature.schneiderAngleDeg,
		schneiderRiskTier: curvature.schneiderRiskTier,
		minRadiusOfCurvatureMm: curvature.minRadiusOfCurvatureMm,
		curvatureRadiusTier: curvature.curvatureRadiusTier,
		pointOfInitialCurvatureMm: curvature.pointOfInitialCurvatureMm,
		maxCurvatureLocationMm: curvature.maxCurvatureLocationMm,
		sampledCenterline,
		clinicalRecommendationRu,
	};
}

/**
 * Builds the comprehensive endodontic clinical report for a tooth with all traced canals.
 */
export function buildEndoToothClinicalReport(
	canals: readonly TracedCanalPath[],
	toothFdi?: number,
): EndoToothClinicalReport {
	const evaluatedCanals = canals.map((c) => evaluateCanalClinicalMetrics(c));
	const vertucci = classifyVertucciTopology(canals);

	let overallRisk: SchneiderRiskTier = "low";
	let hasSharpRadius = false;

	for (const ec of evaluatedCanals) {
		if (ec.schneiderRiskTier === "severe") {
			overallRisk = "severe";
		} else if (ec.schneiderRiskTier === "moderate" && overallRisk !== "severe") {
			overallRisk = "moderate";
		}
		if (ec.curvatureRadiusTier === "sharp") {
			hasSharpRadius = true;
		}
	}

	let taper: "0.02" | "0.04" | "0.06" = "0.06";
	let recip = false;

	if (overallRisk === "severe" || hasSharpRadius) {
		taper = "0.04";
		recip = true;
	} else if (overallRisk === "moderate") {
		taper = "0.04";
		recip = false;
	}

	const canalCount = evaluatedCanals.length;
	const summaryRu =
		`Эндодонтический анализ зуба ${toothFdi ? `№${toothFdi}` : ""}: обнаружено каналов — ${canalCount}. ` +
		`Конфигурация корневой системы: ${vertucci.nameRu}. ` +
		`Максимальная кривизна: ${evaluatedCanals.map((c) => `${c.canalName} ${c.schneiderAngleDeg.toFixed(1)}°`).join(", ") || "0°"}. ` +
		`Общий уровень риска: ${overallRisk.toUpperCase()}. ` +
		`Рекомендованный протокол: конусность ${taper}, ${recip ? "реципрокация показана" : "ротационное препарирование"}.`;

	return {
		toothFdi,
		canalCount,
		canals: evaluatedCanals,
		vertucci,
		overallRiskTier: overallRisk,
		recommendedRotaryTaper: taper,
		recommendedTaper: taper,
		reciprocationIndicated: recip,
		reciprocatingMotionRecommended: recip,
		clinicalSummaryRu: summaryRu,
	};
}
