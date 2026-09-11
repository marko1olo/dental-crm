/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 119: INFERIOR ALVEOLAR NERVE (IAN) CANAL 3D SPLINE & SAFETY CLEARANCE
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive unit tests for:
 * 1. 3D Catmull-Rom spline interpolation & C1 continuity.
 * 2. 3D Arc-length calculation & uniform reparameterization.
 * 3. 3D Unit tangents & orthogonal normals.
 * 4. Analytical segment-to-segment closest points (Goldman / Lumelsky).
 * 5. Statutory implant-to-nerve-canal clearance & clinical safety tiers.
 * 6. Edge cases: empty arrays, single points, degenerate segments, threshold boundaries.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	catmullRom3D,
	interpolateNerveSpline3D,
	totalArcLength3D,
	resampleNerveByArcLength3D,
	computeCurveTangents3D,
	computeCurveNormals3D,
	closestPointOnSegment3D,
	closestPointsSegmentToSegment3D,
	evaluateImplantToNerveCanalSafety,
	type Vec3,
	type NerveCanalSafetyReport,
} from "../index.js";

describe("Wave 119: 3D Catmull-Rom Nerve Spline & Implant Safety Clearance Engine", () => {
	// ── 1. Catmull-Rom 3D Spline Math ────────────────────────────

	describe("1. catmullRom3D analytical evaluation", () => {
		const p0: Vec3 = [0, 0, 0];
		const p1: Vec3 = [10, 5, 2];
		const p2: Vec3 = [20, 15, 8];
		const p3: Vec3 = [30, 20, 10];

		it("evaluates to exactly p1 when t = 0", () => {
			const pt = catmullRom3D(p0, p1, p2, p3, 0);
			assert.ok(Math.abs(pt[0] - p1[0]) < 1e-9);
			assert.ok(Math.abs(pt[1] - p1[1]) < 1e-9);
			assert.ok(Math.abs(pt[2] - p1[2]) < 1e-9);
		});

		it("evaluates to exactly p2 when t = 1", () => {
			const pt = catmullRom3D(p0, p1, p2, p3, 1);
			assert.ok(Math.abs(pt[0] - p2[0]) < 1e-9);
			assert.ok(Math.abs(pt[1] - p2[1]) < 1e-9);
			assert.ok(Math.abs(pt[2] - p2[2]) < 1e-9);
		});

		it("reproduces constant point when all 4 control points are identical", () => {
			const p: Vec3 = [7.5, -3.2, 12.8];
			const pt = catmullRom3D(p, p, p, p, 0.42);
			assert.ok(Math.abs(pt[0] - p[0]) < 1e-9);
			assert.ok(Math.abs(pt[1] - p[1]) < 1e-9);
			assert.ok(Math.abs(pt[2] - p[2]) < 1e-9);
		});

		it("reproduces exact linear midpoint for collinear equidistant points", () => {
			const l0: Vec3 = [0, 0, 0];
			const l1: Vec3 = [10, 20, 30];
			const l2: Vec3 = [20, 40, 60];
			const l3: Vec3 = [30, 60, 90];

			const mid = catmullRom3D(l0, l1, l2, l3, 0.5);
			assert.ok(Math.abs(mid[0] - 15) < 1e-6);
			assert.ok(Math.abs(mid[1] - 30) < 1e-6);
			assert.ok(Math.abs(mid[2] - 45) < 1e-6);
		});
	});

	// ── 2. interpolateNerveSpline3D ──────────────────────────────

	describe("2. interpolateNerveSpline3D polyline generation", () => {
		it("returns empty array when input is empty", () => {
			assert.deepStrictEqual(interpolateNerveSpline3D([]), []);
		});

		it("returns single point when input has 1 point", () => {
			const pt: Vec3 = [5, 10, 15];
			const res = interpolateNerveSpline3D([pt]);
			assert.strictEqual(res.length, 1);
			assert.deepStrictEqual(res[0], [5, 10, 15]);
		});

		it("interpolates two points with correct start and end", () => {
			const p0: Vec3 = [0, 0, 0];
			const p1: Vec3 = [10, 10, 10];
			const res = interpolateNerveSpline3D([p0, p1], 20);

			assert.strictEqual(res.length, 21);
			assert.ok(Math.abs(res[0]![0] - p0[0]) < 1e-6);
			assert.ok(Math.abs(res[res.length - 1]![0] - p1[0]) < 1e-6);
		});

		it("passes through all control points for multi-segment spline", () => {
			const cps: Vec3[] = [
				[0, 0, 0],
				[10, 5, 2],
				[25, 12, 6],
				[40, 10, 8],
				[55, 3, 10],
			];
			const samplesPerSeg = 20;
			const curve = interpolateNerveSpline3D(cps, samplesPerSeg);

			assert.strictEqual(curve.length, (cps.length - 1) * samplesPerSeg + 1);

			// Each control point must be reached at index k * samplesPerSeg
			for (let k = 0; k < cps.length; k++) {
				const expected = cps[k]!;
				const actual = curve[k * samplesPerSeg]!;
				assert.ok(
					Math.abs(actual[0] - expected[0]) < 1e-4 &&
						Math.abs(actual[1] - expected[1]) < 1e-4 &&
						Math.abs(actual[2] - expected[2]) < 1e-4,
					`Control point ${k} not matched: expected ${expected}, got ${actual}`,
				);
			}
		});
	});

	// ── 3. totalArcLength3D ──────────────────────────────────────

	describe("3. totalArcLength3D Euclidean measurement", () => {
		it("returns 0 for empty or single-point curve", () => {
			assert.strictEqual(totalArcLength3D([]), 0);
			assert.strictEqual(totalArcLength3D([[1, 2, 3]]), 0);
		});

		it("returns 0 for coincident identical points", () => {
			const pts: Vec3[] = [
				[5, 5, 5],
				[5, 5, 5],
				[5, 5, 5],
			];
			assert.strictEqual(totalArcLength3D(pts), 0);
		});

		it("calculates exact 3D distance of Pythagorean 3-4-12 triangle (length 13)", () => {
			const p0: Vec3 = [0, 0, 0];
			const p1: Vec3 = [3, 4, 12];
			const len = totalArcLength3D([p0, p1]);
			assert.ok(Math.abs(len - 13) < 1e-9);
		});

		it("sums multi-segment piecewise lengths accurately", () => {
			const poly: Vec3[] = [
				[0, 0, 0],
				[10, 0, 0], // len = 10
				[10, 10, 0], // len = 10
				[10, 10, 10], // len = 10
			];
			const len = totalArcLength3D(poly);
			assert.ok(Math.abs(len - 30) < 1e-9);
		});
	});

	// ── 4. resampleNerveByArcLength3D ────────────────────────────

	describe("4. resampleNerveByArcLength3D uniform parameterization", () => {
		it("handles edge cases: numSamples <= 0, empty curve, single point", () => {
			assert.deepStrictEqual(resampleNerveByArcLength3D([], 10), []);
			assert.deepStrictEqual(resampleNerveByArcLength3D([[1, 2, 3]], 0), []);
			assert.strictEqual(resampleNerveByArcLength3D([[1, 2, 3]], 1).length, 1);
			assert.strictEqual(resampleNerveByArcLength3D([[1, 2, 3]], 5).length, 5);
		});

		it("handles degenerate curve of identical points without NaN", () => {
			const pts: Vec3[] = [
				[4, 4, 4],
				[4, 4, 4],
			];
			const res = resampleNerveByArcLength3D(pts, 8);
			assert.strictEqual(res.length, 8);
			for (const p of res) {
				assert.deepStrictEqual(p, [4, 4, 4]);
			}
		});

		it("produces strictly uniform step sizes along 3D polyline", () => {
			// Non-uniform segment lengths: 5 mm, 25 mm, 10 mm (total = 40 mm)
			const nonUniform: Vec3[] = [
				[0, 0, 0],
				[5, 0, 0],
				[30, 0, 0],
				[40, 0, 0],
			];
			const numSamples = 41; // 40 segments of exactly 1.0 mm each
			const uniform = resampleNerveByArcLength3D(nonUniform, numSamples);

			assert.strictEqual(uniform.length, numSamples);

			// First and last points match original curve endpoints
			assert.ok(Math.abs(uniform[0]![0] - 0) < 1e-6);
			assert.ok(Math.abs(uniform[numSamples - 1]![0] - 40) < 1e-6);

			// Each step distance should be exactly 1.0 mm
			for (let i = 1; i < uniform.length; i++) {
				const stepDist = Math.hypot(
					uniform[i]![0] - uniform[i - 1]![0],
					uniform[i]![1] - uniform[i - 1]![1],
					uniform[i]![2] - uniform[i - 1]![2],
				);
				assert.ok(
					Math.abs(stepDist - 1.0) < 1e-4,
					`Step ${i} distance is ${stepDist}, expected 1.0`,
				);
			}
		});
	});

	// ── 5. Tangents & Normals ────────────────────────────────────

	describe("5. computeCurveTangents3D and computeCurveNormals3D", () => {
		it("handles empty and single-point curve gracefully", () => {
			assert.deepStrictEqual(computeCurveTangents3D([]), []);
			assert.deepStrictEqual(computeCurveTangents3D([[0, 0, 0]]), [[0, 0, 1]]);
			assert.deepStrictEqual(computeCurveNormals3D([]), []);
			assert.deepStrictEqual(computeCurveNormals3D([[0, 0, 0]]), [[0, 1, 0]]);
		});

		it("computes unit tangents along straight line", () => {
			const line: Vec3[] = [
				[0, 0, 0],
				[0, 10, 0],
				[0, 20, 0],
			];
			const tangents = computeCurveTangents3D(line);
			assert.strictEqual(tangents.length, 3);
			for (const t of tangents) {
				assert.ok(Math.abs(t[0] - 0) < 1e-6);
				assert.ok(Math.abs(t[1] - 1) < 1e-6);
				assert.ok(Math.abs(t[2] - 0) < 1e-6);
			}
		});

		it("guarantees all tangents and normals are unit vectors and orthogonal (T . N = 0)", () => {
			const helix: Vec3[] = [];
			for (let i = 0; i < 20; i++) {
				const angle = (i / 20) * 2 * Math.PI;
				helix.push([Math.cos(angle) * 10, Math.sin(angle) * 10, i * 2]);
			}

			const tangents = computeCurveTangents3D(helix);
			const normals = computeCurveNormals3D(helix);

			assert.strictEqual(tangents.length, helix.length);
			assert.strictEqual(normals.length, helix.length);

			for (let i = 0; i < helix.length; i++) {
				const t = tangents[i]!;
				const n = normals[i]!;

				const tNorm = Math.hypot(t[0], t[1], t[2]);
				const nNorm = Math.hypot(n[0], n[1], n[2]);
				assert.ok(Math.abs(tNorm - 1.0) < 1e-5, `Tangent norm ${tNorm} != 1.0`);
				assert.ok(Math.abs(nNorm - 1.0) < 1e-5, `Normal norm ${nNorm} != 1.0`);

				// Dot product T . N must be 0
				const dot = t[0] * n[0] + t[1] * n[1] + t[2] * n[2];
				assert.ok(Math.abs(dot) < 1e-4, `Dot product ${dot} != 0 (not orthogonal)`);
			}
		});
	});

	// ── 6. Segment-to-Segment Analytical Geometry ────────────────

	describe("6. closestPointsSegmentToSegment3D analytical accuracy", () => {
		it("parallel offset segments", () => {
			const res = closestPointsSegmentToSegment3D(
				[0, 0, 0],
				[10, 0, 0],
				[0, 4, 0],
				[10, 4, 0],
			);
			assert.ok(Math.abs(res.distance - 4) < 1e-6);
			assert.ok(Math.abs(res.closestPoint1[1] - 0) < 1e-6);
			assert.ok(Math.abs(res.closestPoint2[1] - 4) < 1e-6);
		});

		it("skew 90-degree crossing segments separated by Z gap = 3.5 mm", () => {
			const res = closestPointsSegmentToSegment3D(
				[-5, 0, 0],
				[5, 0, 0],
				[0, -5, 3.5],
				[0, 5, 3.5],
			);
			assert.ok(Math.abs(res.distance - 3.5) < 1e-6);
			assert.ok(Math.abs(res.closestPoint1[0] - 0) < 1e-6);
			assert.ok(Math.abs(res.closestPoint1[1] - 0) < 1e-6);
			assert.ok(Math.abs(res.closestPoint1[2] - 0) < 1e-6);
			assert.ok(Math.abs(res.closestPoint2[0] - 0) < 1e-6);
			assert.ok(Math.abs(res.closestPoint2[1] - 0) < 1e-6);
			assert.ok(Math.abs(res.closestPoint2[2] - 3.5) < 1e-6);
		});

		it("intersecting segments yield distance 0", () => {
			const res = closestPointsSegmentToSegment3D(
				[-5, 0, 0],
				[5, 0, 0],
				[0, -5, 0],
				[0, 5, 0],
			);
			assert.ok(Math.abs(res.distance) < 1e-6);
			assert.ok(Math.abs(res.closestPoint1[0]) < 1e-6);
			assert.ok(Math.abs(res.closestPoint2[0]) < 1e-6);
		});

		it("clamps to endpoints when perpendicular foot lies outside segment", () => {
			// Segment 1 along X from 0 to 10. Segment 2 along Y from 12 to 20 at X=14.
			// Nearest points are (10, 0, 0) and (14, 12, 0).
			// Distance = hypot(14-10, 12-0) = hypot(4, 12) = sqrt(160)
			const res = closestPointsSegmentToSegment3D(
				[0, 0, 0],
				[10, 0, 0],
				[14, 12, 0],
				[14, 20, 0],
			);
			const expectedDist = Math.hypot(4, 12);
			assert.ok(Math.abs(res.distance - expectedDist) < 1e-6);
			assert.deepStrictEqual(res.closestPoint1, [10, 0, 0]);
			assert.deepStrictEqual(res.closestPoint2, [14, 12, 0]);
		});

		it("handles degenerate segments (point to segment and point to point)", () => {
			const resPointToSeg = closestPointsSegmentToSegment3D(
				[5, 3, 0],
				[5, 3, 0], // degenerate to point
				[0, 0, 0],
				[10, 0, 0],
			);
			assert.ok(Math.abs(resPointToSeg.distance - 3) < 1e-6);
			assert.deepStrictEqual(resPointToSeg.closestPoint1, [5, 3, 0]);
			assert.deepStrictEqual(resPointToSeg.closestPoint2, [5, 0, 0]);

			const resPointToPoint = closestPointsSegmentToSegment3D(
				[1, 1, 1],
				[1, 1, 1],
				[4, 5, 1],
				[4, 5, 1],
			);
			assert.ok(Math.abs(resPointToPoint.distance - 5) < 1e-6);
		});
	});

	// ── 7. evaluateImplantToNerveCanalSafety ──────────────────────

	describe("7. evaluateImplantToNerveCanalSafety clinical tiers & clearances", () => {
		// Standard implant: length 10 mm, radius 2.0 mm (diameter 4.0 mm)
		// Axis vertical: entry at (0, 0, 0), apex at (0, 0, -10)
		const entry: Vec3 = [0, 0, 0];
		const apex: Vec3 = [0, 0, -10];
		const implantRadius = 2.0;
		const nerveTubeRadius = 1.5; // standard IAN tube radius

		it("returns SAFE and infinite clearance when nerve polyline is empty", () => {
			const rep = evaluateImplantToNerveCanalSafety(
				entry,
				apex,
				implantRadius,
				[],
			);
			assert.strictEqual(rep.status, "SAFE");
			assert.strictEqual(rep.isSafe, true);
			assert.strictEqual(rep.minDistanceMm, Number.POSITIVE_INFINITY);
			assert.ok(rep.recommendation.includes("не задана"));
		});

		it("evaluates single-point nerve polyline correctly", () => {
			// Nerve point at (6, 0, -5). Centerline dist = 6.
			// Surface clearance = 6 - 2.0 - 1.5 = 2.5 mm.
			const rep = evaluateImplantToNerveCanalSafety(
				entry,
				apex,
				implantRadius,
				[[6, 0, -5]],
				nerveTubeRadius,
				2.0,
			);
			assert.strictEqual(rep.minDistanceMm, 2.5);
			assert.strictEqual(rep.status, "SAFE");
			assert.strictEqual(rep.isSafe, true);
			assert.deepStrictEqual(rep.closestImplantPoint, [0, 0, -5]);
			assert.deepStrictEqual(rep.closestNervePoint, [6, 0, -5]);
		});

		it("SAFE status: clearance >= 2.0 mm (centerline = 6.0 mm, clearance = 2.5 mm)", () => {
			// Nerve canal running parallel at X = 6.0 mm from Z = -5 to Z = -15
			const nerve: Vec3[] = [
				[6, 0, -5],
				[6, 0, -15],
			];
			const rep = evaluateImplantToNerveCanalSafety(
				entry,
				apex,
				implantRadius,
				nerve,
				nerveTubeRadius,
				2.0,
			);

			assert.strictEqual(rep.status, "SAFE");
			assert.strictEqual(rep.isSafe, true);
			assert.strictEqual(rep.minDistanceMm, 2.5);
			assert.ok(rep.recommendation.includes("Безопасное расстояние"));
			assert.ok(rep.recommendation.includes("2.5 мм"));
		});

		it("WARNING status: clearance in [0, 2.0) mm (centerline = 4.3 mm, clearance = 0.8 mm)", () => {
			// Centerline = 4.3 mm. Clearance = 4.3 - 2.0 - 1.5 = 0.8 mm.
			const nerve: Vec3[] = [
				[4.3, 0, -5],
				[4.3, 0, -15],
			];
			const rep = evaluateImplantToNerveCanalSafety(
				entry,
				apex,
				implantRadius,
				nerve,
				nerveTubeRadius,
				2.0,
			);

			assert.strictEqual(rep.status, "WARNING");
			assert.strictEqual(rep.isSafe, false);
			assert.strictEqual(rep.minDistanceMm, 0.8);
			assert.ok(rep.recommendation.includes("Внимание: опасное сближение"));
			assert.ok(rep.recommendation.includes("0.8 мм"));
			assert.ok(rep.recommendation.includes("1.2 мм")); // recommended length reduction
		});

		it("CRITICAL_DANGER status: clearance < 0 mm (centerline = 2.5 mm, clearance = -1.0 mm)", () => {
			// Centerline = 2.5 mm. Clearance = 2.5 - 2.0 - 1.5 = -1.0 mm.
			const nerve: Vec3[] = [
				[2.5, 0, -5],
				[2.5, 0, -15],
			];
			const rep = evaluateImplantToNerveCanalSafety(
				entry,
				apex,
				implantRadius,
				nerve,
				nerveTubeRadius,
				2.0,
			);

			assert.strictEqual(rep.status, "CRITICAL_DANGER");
			assert.strictEqual(rep.isSafe, false);
			assert.strictEqual(rep.minDistanceMm, -1.0);
			assert.ok(rep.recommendation.includes("КРИТИЧЕСКАЯ ОПАСНОСТЬ"));
			assert.ok(rep.recommendation.includes("перфорация нижнечелюстного канала"));
			assert.ok(rep.recommendation.includes("1.0 мм"));
		});

		it("exact boundary case: clearance exactly 2.0 mm yields SAFE", () => {
			// Centerline = 2.0 + 2.0 + 1.5 = 5.5 mm. Clearance = 2.0 mm.
			const nerve: Vec3[] = [
				[5.5, 0, -5],
				[5.5, 0, -15],
			];
			const rep = evaluateImplantToNerveCanalSafety(
				entry,
				apex,
				implantRadius,
				nerve,
				nerveTubeRadius,
				2.0,
			);

			assert.strictEqual(rep.status, "SAFE");
			assert.strictEqual(rep.isSafe, true);
			assert.strictEqual(rep.minDistanceMm, 2.0);
		});

		it("exact boundary case: clearance exactly 0.0 mm yields WARNING", () => {
			// Centerline = 0.0 + 2.0 + 1.5 = 3.5 mm. Clearance = 0.0 mm.
			const nerve: Vec3[] = [
				[3.5, 0, -5],
				[3.5, 0, -15],
			];
			const rep = evaluateImplantToNerveCanalSafety(
				entry,
				apex,
				implantRadius,
				nerve,
				nerveTubeRadius,
				2.0,
			);

			assert.strictEqual(rep.status, "WARNING");
			assert.strictEqual(rep.isSafe, false);
			assert.strictEqual(rep.minDistanceMm, 0.0);
		});

		it("supports custom nerveTubeRadiusMm and safetyThresholdMm", () => {
			// Custom nerve tube radius = 2.0 mm, custom threshold = 3.0 mm.
			// Centerline = 7.5 mm. Clearance = 7.5 - 2.0 - 2.0 = 3.5 mm.
			// 3.5 mm >= 3.0 mm -> SAFE
			const nerve: Vec3[] = [
				[7.5, 0, -5],
				[7.5, 0, -15],
			];
			const rep = evaluateImplantToNerveCanalSafety(
				entry,
				apex,
				implantRadius,
				nerve,
				2.0, // tube radius
				3.0, // threshold
			);

			assert.strictEqual(rep.status, "SAFE");
			assert.strictEqual(rep.isSafe, true);
			assert.strictEqual(rep.minDistanceMm, 3.5);
		});

		it("realistic clinical scenario: tooth 36 implant over traced mandibular canal trajectory", () => {
			// Mandibular canal traced in left mandible (FDI 36 area):
			// Canal runs from posterior (ramus) anteriorly toward mental foramen.
			// LPS coordinates: +X Left, +Y Posterior, +Z Superior
			const canalTracedPoints: Vec3[] = [
				[25.0, 30.0, -12.0], // near mandibular foramen
				[24.5, 20.0, -16.0], // molar region
				[23.8, 10.0, -18.5], // tooth 36 site
				[22.5, 0.0, -20.0], // tooth 35 site
				[20.0, -8.0, -17.0], // mental foramen opening
			];

			// Traced nerve spline interpolated and resampled
			const denseCanal = interpolateNerveSpline3D(canalTracedPoints, 20);
			const resampledCanal = resampleNerveByArcLength3D(denseCanal, 100);

			assert.ok(resampledCanal.length === 100);
			const totalLen = totalArcLength3D(resampledCanal);
			assert.ok(totalLen > 35 && totalLen < 45, `Canal length ${totalLen} mm`);

			// Planned implant at 36:
			// Alveolar crest entry at (23.8, 10.0, -2.0)
			// Apex planned at (23.8, 10.0, -14.0) -> length = 12 mm
			// Implant radius = 2.15 mm (diameter 4.3 mm)
			const tooth36Entry: Vec3 = [23.8, 10.0, -2.0];
			const tooth36Apex: Vec3 = [23.8, 10.0, -14.0];
			const tooth36Radius = 2.15;

			const safetyReport: NerveCanalSafetyReport = evaluateImplantToNerveCanalSafety(
				tooth36Entry,
				tooth36Apex,
				tooth36Radius,
				resampledCanal,
				1.5,
				2.0,
			);

			// At Y=10.0, nerve canal is around Z=-18.5.
			// Implant apex is at Z=-14.0.
			// Distance along Z between apex and canal is approximately 4.5 mm.
			// Surface clearance = 4.5 - 2.15 - 1.5 = 0.85 mm -> WARNING!
			assert.strictEqual(safetyReport.status, "WARNING");
			assert.strictEqual(safetyReport.isSafe, false);
			assert.ok(safetyReport.minDistanceMm > 0 && safetyReport.minDistanceMm < 2.0);
			assert.ok(safetyReport.closestImplantPoint[2] <= -13.9); // near apex
			assert.ok(safetyReport.recommendation.includes("Внимание: опасное сближение"));
		});
	});
});
