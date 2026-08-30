import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	interpolateNerveSpline3D,
	calculateSplineLength3DMm,
	calculateNerveDistanceGating,
	getGatedNerveSegments,
	hitTestNerveNode3D,
	hitTestNerveNodeOnAxialSlice,
	buildMandibularNerve3DSpline,
	type MandibularNerve3DSpline,
	type GatedNerveSegment3D,
} from "../cbctCaliperNerveMath";
import type { Point3D } from "../cbctMprMath";

describe("Domain 2: 3D Mandibular Canal (IAN) Spline & Distance Gating Suite", () => {
	// Canonical Mandibular Canal (N. alveolaris inferior) test points
	const sampleNervePoints: readonly Point3D[] = [
		{ x: -32.0, y: -2.0, z: 2.0 },
		{ x: -28.0, y: -15.0, z: -4.0 },
		{ x: -25.0, y: -28.0, z: -10.0 },
		{ x: -22.0, y: -40.0, z: -14.0 },
		{ x: -18.0, y: -46.0, z: -16.0 },
	];

	describe("1. 3D Catmull-Rom Spline Interpolation", () => {
		it("handles empty and single-point inputs gracefully", () => {
			assert.deepEqual(interpolateNerveSpline3D([]), []);
			const singlePoint: Point3D[] = [{ x: 10, y: 20, z: -5 }];
			assert.deepEqual(interpolateNerveSpline3D(singlePoint), singlePoint);
		});

		it("interpolates two points linearly with exact subdivisions", () => {
			const p0: Point3D = { x: 0, y: 0, z: 0 };
			const p1: Point3D = { x: 12, y: 24, z: -36 };
			const subdivisions = 12;
			const spline = interpolateNerveSpline3D([p0, p1], subdivisions);

			assert.equal(spline.length, subdivisions + 1);
			assert.deepEqual(spline[0], p0);
			assert.deepEqual(spline[spline.length - 1], p1);

			// Midpoint check
			const mid = spline[6]!;
			assert.equal(mid.x, 6);
			assert.equal(mid.y, 12);
			assert.equal(mid.z, -18);
		});

		it("generates smooth continuous 3D curve through all control waypoints", () => {
			const spline = interpolateNerveSpline3D(sampleNervePoints, 10);
			assert.ok(spline.length > sampleNervePoints.length);

			// First point matches first waypoint
			assert.equal(spline[0]!.x, sampleNervePoints[0]!.x);
			assert.equal(spline[0]!.y, sampleNervePoints[0]!.y);
			assert.equal(spline[0]!.z, sampleNervePoints[0]!.z);

			// Last point matches last waypoint
			const lastIdx = spline.length - 1;
			assert.equal(spline[lastIdx]!.x, sampleNervePoints[sampleNervePoints.length - 1]!.x);
			assert.equal(spline[lastIdx]!.y, sampleNervePoints[sampleNervePoints.length - 1]!.y);
			assert.equal(spline[lastIdx]!.z, sampleNervePoints[sampleNervePoints.length - 1]!.z);

			// Curve must be smooth without NaN or Infinity
			for (const pt of spline) {
				assert.ok(Number.isFinite(pt.x), `X must be finite: ${pt.x}`);
				assert.ok(Number.isFinite(pt.y), `Y must be finite: ${pt.y}`);
				assert.ok(Number.isFinite(pt.z), `Z must be finite: ${pt.z}`);
			}
		});
	});

	describe("2. 3D Curve Arc Length Calculation", () => {
		it("returns 0 for empty or single point array", () => {
			assert.equal(calculateSplineLength3DMm([]), 0);
			assert.equal(calculateSplineLength3DMm([{ x: 5, y: 10, z: -2 }]), 0);
		});

		it("calculates exact 3D Euclidean distance for line and multi-segment paths", () => {
			// Single straight segment: (0,0,0) to (3,4,12) -> length = sqrt(9 + 16 + 144) = sqrt(169) = 13.0 mm
			const straight: Point3D[] = [
				{ x: 0, y: 0, z: 0 },
				{ x: 3, y: 4, z: 12 },
			];
			assert.equal(calculateSplineLength3DMm(straight), 13.0);

			// 2-segment path: (0,0,0) -> (3,4,0) [5 mm] -> (3,4,12) [12 mm] -> total = 17 mm
			const path: Point3D[] = [
				{ x: 0, y: 0, z: 0 },
				{ x: 3, y: 4, z: 0 },
				{ x: 3, y: 4, z: 12 },
			];
			assert.equal(calculateSplineLength3DMm(path), 17.0);
		});

		it("computes realistic anatomical length for IAN mandibular nerve trajectory (~40-60 mm)", () => {
			const spline = interpolateNerveSpline3D(sampleNervePoints, 12);
			const totalLengthMm = calculateSplineLength3DMm(spline);

			assert.ok(totalLengthMm > 40.0, `Length ${totalLengthMm} should be > 40mm`);
			assert.ok(totalLengthMm < 70.0, `Length ${totalLengthMm} should be < 70mm`);
		});
	});

	describe("3. Continuous Distance Gating (Z-Axis Exponential Decay)", () => {
		it("returns full opacity (alpha = 1.0, solid line) on exact slice intersection (deltaZ = 0.0)", () => {
			const gating = calculateNerveDistanceGating(0.0);
			assert.equal(gating.alpha, 1.0);
			assert.equal(gating.isVisible, true);
			assert.equal(gating.isDashed, false);
			assert.equal(gating.deltaZMm, 0.0);
		});

		it("applies exact Gaussian/exponential decay alpha = exp(-(deltaZ / 2.0)^2)", () => {
			// At deltaZ = 2.0 mm: alpha = exp(-(2.0/2.0)^2) = exp(-1) = 0.367879...
			const gating2 = calculateNerveDistanceGating(2.0);
			assert.ok(Math.abs(gating2.alpha - Math.exp(-1)) < 1e-4);
			assert.equal(gating2.isVisible, true);
			assert.equal(gating2.isDashed, false);

			// At deltaZ = 1.0 mm: alpha = exp(-(1.0/2.0)^2) = exp(-0.25) = 0.7788...
			const gating1 = calculateNerveDistanceGating(1.0);
			assert.ok(Math.abs(gating1.alpha - Math.exp(-0.25)) < 1e-4);
			assert.equal(gating1.isVisible, true);
			assert.equal(gating1.isDashed, false);
		});

		it("is symmetric for positive and negative deltaZ offsets", () => {
			const pos = calculateNerveDistanceGating(2.5);
			const neg = calculateNerveDistanceGating(-2.5);

			assert.equal(pos.alpha, neg.alpha);
			assert.equal(pos.isVisible, neg.isVisible);
			assert.equal(pos.isDashed, neg.isDashed);
			assert.equal(pos.deltaZMm, 2.5);
			assert.equal(neg.deltaZMm, 2.5);
		});

		it("switches to dashed style when deltaZ > 3.5 mm and deltaZ <= 6.0 mm", () => {
			const atBoundary = calculateNerveDistanceGating(3.5);
			assert.equal(atBoundary.isDashed, false); // 3.5 is solid

			const dashed1 = calculateNerveDistanceGating(3.6);
			assert.equal(dashed1.isDashed, true);
			assert.equal(dashed1.isVisible, true);

			const dashed2 = calculateNerveDistanceGating(5.0);
			assert.equal(dashed2.isDashed, true);
			assert.equal(dashed2.isVisible, true);

			const dashed3 = calculateNerveDistanceGating(6.0);
			assert.equal(dashed3.isDashed, true);
			assert.equal(dashed3.isVisible, true);
		});

		it("completely extinguishes line (alpha = 0, isVisible = false) when deltaZ > 6.0 mm", () => {
			const extinguished1 = calculateNerveDistanceGating(6.01);
			assert.equal(extinguished1.isVisible, false);
			assert.equal(extinguished1.alpha, 0.0);

			const extinguished2 = calculateNerveDistanceGating(12.0);
			assert.equal(extinguished2.isVisible, false);
			assert.equal(extinguished2.alpha, 0.0);
		});
	});

	describe("4. Gated Segment Partitioning for Viewport Render Loop", () => {
		it("partitions 3D spline into rendered segments with distance gating", () => {
			const spline = interpolateNerveSpline3D(sampleNervePoints, 10);
			// Slice at Z = -4.0 mm
			const segments: GatedNerveSegment3D[] = getGatedNerveSegments(spline, -4.0);

			// Returns visible segments within distance cutoff
			assert.ok(segments.length > 0 && segments.length <= spline.length - 1);

			// All returned segments are visible
			for (const seg of segments) {
				assert.equal(seg.isVisible, true);
				assert.ok(seg.alpha > 0.0);
				assert.ok(seg.deltaZMm <= 6.0);
			}

			// Contains both solid segments (near Z = -4.0 mm) and dashed segments (3.5 < deltaZ <= 6.0 mm)
			const solidSegments = segments.filter((s) => !s.isDashed);
			const dashedSegments = segments.filter((s) => s.isDashed);
			assert.ok(solidSegments.length > 0, "Should have solid segments near slice Z");
			assert.ok(dashedSegments.length > 0, "Should have dashed segments in transition zone");
		});
	});

	describe("5. Interactive Nerve Node Hit-Testing", () => {
		it("detects clicked node in 3D Euclidean space within tolerance", () => {
			const hitIdx = hitTestNerveNode3D({ x: -28.2, y: -15.1, z: -4.1 }, sampleNervePoints, 3.5);
			assert.equal(hitIdx, 1); // Second waypoint (-28, -15, -4)
		});

		it("returns -1 when pointer is outside tolerance", () => {
			const missIdx = hitTestNerveNode3D({ x: 0, y: 0, z: 0 }, sampleNervePoints, 3.5);
			assert.equal(missIdx, -1);
		});

		it("hit-tests node on axial slice taking slice Z proximity into account", () => {
			// Click near node #2 (-25, -28, -10) on axial slice Z = -10.0 mm
			const hitAxial = hitTestNerveNodeOnAxialSlice(
				{ x: -25.5, y: -28.2, z: -10.0 },
				sampleNervePoints,
				4.0,
				3.5,
			);
			assert.equal(hitAxial, 2);

			// Click on axial slice Z = 5.0 mm (far from node #2 Z = -10.0 mm)
			const missAxialZ = hitTestNerveNodeOnAxialSlice(
				{ x: -25.5, y: -28.2, z: 5.0 },
				sampleNervePoints,
				4.0,
				3.5,
			);
			assert.equal(missAxialZ, -1);
		});
	});

	describe("6. Mandibular Nerve 3D Spline Builder", () => {
		it("constructs complete MandibularNerve3DSpline object with 2.0 mm safety corridor", () => {
			const nerveModel: MandibularNerve3DSpline = buildMandibularNerve3DSpline(sampleNervePoints, 12);

			assert.equal(nerveModel.safetyMarginMm, 2.0);
			assert.equal(nerveModel.canalDiameterMm, 2.8);
			assert.equal(nerveModel.controlPoints.length, sampleNervePoints.length);
			assert.ok(nerveModel.interpolatedCurve.length > sampleNervePoints.length);
			assert.ok(nerveModel.lengthMm > 40.0);
			assert.equal(nerveModel.side, "right");
			assert.ok(nerveModel.label.includes("Нижнечелюстной канал 3D"));
		});
	});
});
