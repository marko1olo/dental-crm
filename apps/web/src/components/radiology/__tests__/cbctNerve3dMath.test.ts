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
	project3DNerveToPanorama,
	type MandibularNerve3DSpline,
	type GatedNerveSegment3D,
	type Projected3DNerveResult,
} from "../cbctCaliperNerveMath";
import {
	buildDentalArchCurve,
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	getPanoramicSliceFanTicks,
	reconstructPanoramicView,
	type CrossSectionSliceData,
} from "../dentalCurveEngine";
import type { CbctVoxelVolume, Point3D } from "../cbctMprMath";

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

	describe("7. 3D Mandibular Nerve (IAN) Projection on Panoramic View", () => {
		const archCurve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 12.0);
		const panoWidthPx = 600;
		const panoHeightPx = 250;

		it("handles empty 3D nerve array gracefully", () => {
			const res = project3DNerveToPanorama([], archCurve, panoWidthPx, panoHeightPx);
			assert.equal(res.projectedPoints.length, 0);
			assert.equal(res.safetyCorridorPolygon.length, 0);
			assert.equal(res.isVisibleOnPanorama, false);
			assert.equal(res.safetyMarginMm, 2.0);
		});

		it("projects single 3D nerve point with vertical bounds", () => {
			const singlePoint: Point3D[] = [{ x: -32.0, y: -2.0, z: 0.0 }];
			const res = project3DNerveToPanorama(singlePoint, archCurve, panoWidthPx, panoHeightPx);

			assert.equal(res.projectedPoints.length, 1);
			const pt = res.projectedPoints[0]!;
			assert.ok(pt.x >= 0 && pt.x < panoWidthPx);
			// Z = 0 with heightMm = 38 -> panoY = (19/38)*250 = 125.0
			assert.equal(pt.y, 125.0);
			assert.equal(pt.zMm, 0.0);
			assert.equal(res.safetyCorridorPolygon.length, 2);
		});

		it("projects complete 3D interpolated nerve spline onto panorama within screen coordinates", () => {
			const spline = interpolateNerveSpline3D(sampleNervePoints, 10);
			const res = project3DNerveToPanorama(spline, archCurve, panoWidthPx, panoHeightPx);

			assert.equal(res.projectedPoints.length, spline.length);
			assert.ok(res.totalLengthMm > 40.0);
			assert.equal(res.safetyMarginMm, 2.0);
			assert.equal(res.isVisibleOnPanorama, true);

			// All projected points are within panoramic dimensions
			for (const p of res.projectedPoints) {
				assert.ok(p.x >= 0 && p.x <= panoWidthPx, `Pano X out of bounds: ${p.x}`);
				assert.ok(p.y >= 0 && p.y <= panoHeightPx, `Pano Y out of bounds: ${p.y}`);
				assert.ok(p.distanceAlongArchMm >= 0);
				assert.ok(Number.isFinite(p.lateralDistanceMm));
			}

			// First point (posterior / molar region) should have smaller arc distance than anterior point
			const firstPano = res.projectedPoints[0]!;
			const lastPano = res.projectedPoints[res.projectedPoints.length - 1]!;
			assert.ok(firstPano.distanceAlongArchMm < lastPano.distanceAlongArchMm);
			assert.ok(firstPano.x < lastPano.x);
		});

		it("generates 2.0 mm cylindrical safety corridor envelope polygon along the panoramic curve", () => {
			const spline = interpolateNerveSpline3D(sampleNervePoints, 10);
			const res = project3DNerveToPanorama(spline, archCurve, panoWidthPx, panoHeightPx, {
				safetyMarginMm: 2.0,
			});

			assert.equal(res.safetyCorridorUpper.length, spline.length);
			assert.equal(res.safetyCorridorLower.length, spline.length);
			assert.equal(res.safetyCorridorPolygon.length, spline.length * 2);

			// Vertical pixel buffer check: safetyBufferPx = (2.0 / 38.0) * 250 = 13.16 px
			const expectedBufferPx = Number(((2.0 / 38.0) * panoHeightPx).toFixed(2));
			assert.equal(res.safetyBufferPx, expectedBufferPx);

			// Upper corridor points must be offset from central path
			for (let i = 0; i < spline.length; i++) {
				const center = res.projectedPoints[i]!;
				const upper = res.safetyCorridorUpper[i]!;
				const lower = res.safetyCorridorLower[i]!;

				const distUpper = Math.hypot(upper.x - center.x, upper.y - center.y);
				const distLower = Math.hypot(lower.x - center.x, lower.y - center.y);

				assert.ok(distUpper > 0, "Upper corridor must have non-zero distance");
				assert.ok(distLower > 0, "Lower corridor must have non-zero distance");
			}
		});

		it("respects custom panoramic heightMm and safetyMarginMm options", () => {
			const spline = interpolateNerveSpline3D(sampleNervePoints, 5);
			const res = project3DNerveToPanorama(spline, archCurve, panoWidthPx, panoHeightPx, {
				heightMm: 50.0,
				safetyMarginMm: 3.0,
				canalDiameterMm: 3.2,
			});

			assert.equal(res.safetyMarginMm, 3.0);
			assert.equal(res.canalDiameterMm, 3.2);
			const expectedBufferPx = Number(((3.0 / 50.0) * panoHeightPx).toFixed(2));
			assert.equal(res.safetyBufferPx, expectedBufferPx);
		});
	});

	describe("8. FDI #48 Tooth Badge Offset Margin Protection on Panorama", () => {
		const archCurve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 12.0);
		const mockVolume: CbctVoxelVolume = {
			id: "test_volume_48",
			dimensions: { width: 30, height: 30, depth: 30 },
			spacingMm: { x: 0.5, y: 0.5, z: 0.5 },
			originMm: { x: -15, y: -15, z: -15 },
			physicalSizeMm: { x: 15, y: 15, z: 15 },
			data: new Int16Array(30 * 30 * 30),
			minHU: -1000,
			maxHU: 3000,
			defaultWindowWidth: 4400,
			defaultWindowLevel: 1300,
			isDisposed: false,
		};

		it("guarantees at least 20px margins for FDI badges and symmetric centering (DEF-07)", () => {
			const pano = reconstructPanoramicView(mockVolume, archCurve, {
				heightPx: 220,
			});

			assert.ok(pano.toothMarkersOnPano.length > 0);
			const marker48 = pano.toothMarkersOnPano.find((m) => m.toothFdi === "48");
			const marker38 = pano.toothMarkersOnPano.find((m) => m.toothFdi === "38");
			assert.ok(marker48, "Marker for tooth FDI 48 must exist");
			assert.ok(marker38, "Marker for tooth FDI 38 must exist");
			assert.ok(marker48.xPx >= 20, `Marker 48 xPx (${marker48.xPx}) must be >= 20 to prevent clipping`);
			assert.ok(marker38.xPx <= pano.widthPx - 20, `Marker 38 xPx (${marker38.xPx}) must be <= widthPx - 20`);

			// Verify symmetric margins: left margin of #48 equals right margin of #38
			const leftMargin = marker48.xPx;
			const rightMargin = pano.widthPx - marker38.xPx;
			assert.ok(Math.abs(leftMargin - rightMargin) <= 1, `Margins must be symmetric: left=${leftMargin}, right=${rightMargin}`);

			// Verify all tooth markers respect the 20px boundary constraint
			for (const tm of pano.toothMarkersOnPano) {
				assert.ok(tm.xPx >= 20, `Tooth ${tm.toothFdi} xPx (${tm.xPx}) must be >= 20`);
				assert.ok(tm.xPx <= pano.widthPx - 20, `Tooth ${tm.toothFdi} xPx (${tm.xPx}) must be <= widthPx - 20`);
			}
		});
	});

	describe("9. Panoramic Slice Fan Ticks & Major Division 60 Restoration", () => {
		it("generates major division tick for slice index 60 and multiples of 5", () => {
			// Generate synthetic 65 cross-section slices
			const mockCrossSections: CrossSectionSliceData[] = Array.from({ length: 65 }, (_, idx) => ({
				sliceIndex: idx + 1,
				distanceAlongArchMm: (idx / 64) * 128.0,
				centerPointMm: { x: 0, y: 0, z: -10 },
				normalVector2D: { x: 1, y: 0 },
				tangentVector2D: { x: 0, y: 1 },
				nearestToothFdi: "46",
				toothLabelRu: "46",
				widthMm: 24.0,
				heightMm: 32.0,
				pixelSpacingMm: 0.25,
				widthPx: 96,
				heightPx: 128,
				pixelData: new Uint8ClampedArray(96 * 128 * 4),
			}));

			const fanTicks = getPanoramicSliceFanTicks(mockCrossSections, 600, 128.0);
			assert.equal(fanTicks.length, 65);

			// Slice 1 is major
			const tick1 = fanTicks.find((t) => t.sliceIndex === 1);
			assert.ok(tick1);
			assert.equal(tick1.isMajor, true);

			// Multiples of 5 are major
			const tick5 = fanTicks.find((t) => t.sliceIndex === 5);
			const tick20 = fanTicks.find((t) => t.sliceIndex === 20);
			assert.ok(tick5 && tick5.isMajor);
			assert.ok(tick20 && tick20.isMajor);

			// Guaranteed slice 60 is major
			const tick60 = fanTicks.find((t) => t.sliceIndex === 60);
			assert.ok(tick60, "Slice 60 tick must exist");
			assert.equal(tick60.isMajor, true, "Slice 60 must be marked as major division");

			// Last slice (65) is major
			const tick65 = fanTicks.find((t) => t.sliceIndex === 65);
			assert.ok(tick65 && tick65.isMajor);

			// Non-major slice (e.g. 13) is not major
			const tick13 = fanTicks.find((t) => t.sliceIndex === 13);
			assert.ok(tick13);
			assert.equal(tick13.isMajor, false);
		});
	});
});

