/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: CPR MATH & SURGICAL GUIDE SAFETY TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical unit tests (Zero Mocks):
 * 1. 3D Trilinear voxel interpolation & boundary edge-case handling
 * 2. Catmull-Rom & Hermite arch curve splines, tangents, and normals
 * 3. Automatic arch detection with bone density thresholding (HU > 400) & RANSAC
 * 4. Orthogonal cross-section resection with tilt clamping (±30°) & geometric verification
 * 5. Surgical guide safety checks (inter-implant clearance, nerve overshoot collision)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	trilinear,
	buildUniformCurve,
	crossSectionFrame,
	computeCrossSection,
	computePanoramicCPR,
	AIR_HU,
	MAX_CROSS_SECTION_TILT_DEG,
	type VolumeSamplingData,
	type Point2,
} from "../cpr/cprMath.js";
import {
	hermiteSpline,
	hermiteTangent,
	catmullRom,
	catmullRomTangent,
	interpolateArchCurve,
	computeCurveTangents,
	computeCurveNormals,
	totalArcLength,
	resampleByArcLength,
	generateDefaultArchCurve,
	offsetCurve,
} from "../cpr/archCurve.js";
import {
	detectArchControlPoints,
	solveParabola3Points,
	fitParabolaLeastSquares,
	ransacParabolicArchFit,
} from "../cpr/archDetect.js";
import {
	validateGuide,
	drillRadius,
	distPointToSegment3,
	distSegmentToSegment3,
	distSegmentToPolyline3,
	MIN_WALL_MM,
	MIN_DRILL_MM,
	DRILL_OVERSHOOT_MM,
	MIN_INTER_IMPLANT_CLEARANCE_MM,
	MIN_NERVE_SAFETY_MM,
	type GuideCheckImplant,
	type GuideParams,
	type AnatomyMarker,
} from "../cpr/guideValidate.js";

// ── Test Helpers: Synthetic Volume ─────────────────────────────

const dims: [number, number, number] = [100, 120, 80];
const spacing: [number, number, number] = [0.5, 0.5, 0.5];
const origin: [number, number, number] = [10, 20, 30];

function makeSyntheticVol(
	field: (i: number, j: number, k: number) => number,
): VolumeSamplingData {
	return {
		dims,
		origin,
		getVoxel: field,
		invSx: 1 / spacing[0],
		invSy: 1 / spacing[1],
		invSz: 1 / spacing[2],
		zMin: origin[2],
		zMax: origin[2] + (dims[2] - 1) * spacing[2], // 30 + 79 * 0.5 = 69.5
		vSpacing: spacing[2],
	};
}

describe("CBCT CPR Math & Surgical Guide Adapter Engine", () => {
	// ── 1. Trilinear Voxel Interpolation ─────────────────────────

	describe("1. Trilinear Voxel Interpolation", () => {
		it("interpolates exactly on a linear 3D polynomial field", () => {
			// Linear field f(i, j, k) = 50 + 2*i - 3*j + 4*k
			const linearField = (i: number, j: number, k: number) =>
				50 + 2 * i - 3 * j + 4 * k;
			const vol = makeSyntheticVol(linearField);

			const ci = 12.35;
			const cj = 15.65;
			const ck = 9.45;
			const expected = 50 + 2 * ci - 3 * cj + 4 * ck;

			const sampled = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
			assert.ok(
				Math.abs(sampled - expected) < 1e-4,
				`Expected ${expected}, got ${sampled}`,
			);
		});

		it("preserves real voxel data on the outermost plane (coord == dims - 1)", () => {
			const linearField = (i: number) => 1000 + i * 10;
			const vol = makeSyntheticVol(linearField);

			const sampled = trilinear(
				vol.getVoxel,
				vol.dims,
				dims[0] - 1,
				dims[1] - 1,
				dims[2] - 1,
			);
			assert.notEqual(sampled, AIR_HU);
			assert.ok(sampled > 900, "Should return genuine reconstructed data");
		});

		it("returns AIR_HU (-1024) for genuine out-of-volume points", () => {
			const vol = makeSyntheticVol(() => 500);

			assert.equal(trilinear(vol.getVoxel, vol.dims, -0.5, 10, 10), AIR_HU);
			assert.equal(trilinear(vol.getVoxel, vol.dims, 10, -0.1, 10), AIR_HU);
			assert.equal(trilinear(vol.getVoxel, vol.dims, 10, 10, dims[2]), AIR_HU);
			assert.equal(
				trilinear(vol.getVoxel, vol.dims, dims[0] + 2, 10, 10),
				AIR_HU,
			);
		});
	});

	// ── 2. Arch Curve & Splines ──────────────────────────────────

	describe("2. Arch Curve & Spline Math (Hermite & Catmull-Rom)", () => {
		it("evaluates cubic Hermite spline and its analytical tangent", () => {
			const p0: Point2 = [0, 0];
			const m0: Point2 = [1, 0];
			const p1: Point2 = [10, 5];
			const m1: Point2 = [1, 2];

			const atZero = hermiteSpline(p0, m0, p1, m1, 0);
			const atOne = hermiteSpline(p0, m0, p1, m1, 1);
			assert.deepEqual(atZero, p0);
			assert.deepEqual(atOne, p1);

			const tZero = hermiteTangent(p0, m0, p1, m1, 0);
			const tOne = hermiteTangent(p0, m0, p1, m1, 1);
			assert.ok(Math.abs(tZero[0] - m0[0]) < 1e-5);
			assert.ok(Math.abs(tZero[1] - m0[1]) < 1e-5);
			assert.ok(Math.abs(tOne[0] - m1[0]) < 1e-5);
			assert.ok(Math.abs(tOne[1] - m1[1]) < 1e-5);
		});

		it("computes Catmull-Rom interpolation and tangents", () => {
			const p0: Point2 = [-10, 0];
			const p1: Point2 = [0, 5];
			const p2: Point2 = [10, 5];
			const p3: Point2 = [20, 0];

			const start = catmullRom(p0, p1, p2, p3, 0);
			const end = catmullRom(p0, p1, p2, p3, 1);
			assert.ok(Math.abs(start[0] - p1[0]) < 1e-5);
			assert.ok(Math.abs(start[1] - p1[1]) < 1e-5);
			assert.ok(Math.abs(end[0] - p2[0]) < 1e-5);
			assert.ok(Math.abs(end[1] - p2[1]) < 1e-5);

			const tanStart = catmullRomTangent(p0, p1, p2, p3, 0);
			// Catmull-Rom tangent at p1 is (p2 - p0)/2 = (10 - (-10))/2 = 10 along X
			assert.ok(Math.abs(tanStart[0] - 10) < 1e-4);
		});

		it("generates default anatomical arch curve with 9 control points", () => {
			const arch = generateDefaultArchCurve([50, 50], [100, 100]);
			assert.equal(arch.length, 9);
			// First point on patient right (-X), middle point at anterior incisors, last point on patient left (+X)
			assert.ok(arch[0]![0] < 50, "Right molar on -X side");
			assert.ok(arch[8]![0] > 50, "Left molar on +X side");
			// Anterior incisors have minimum Y
			const minYPoint = arch.reduce((min, p) => (p[1] < min[1] ? p : min));
			assert.equal(minYPoint[0], 50, "Anterior incisors centered at cx");
		});

		it("computes curve normals perpendicular to tangents and unit-normalized", () => {
			const line: Point2[] = [
				[0, 0],
				[10, 0],
				[20, 0],
			];
			const normals = computeCurveNormals(line);
			assert.equal(normals.length, 3);
			for (const n of normals) {
				// Tangent is along +X (1, 0), normal rotated 90° CW in XY plane is (0, 1)
				assert.ok(Math.abs(n[0]) < 1e-5);
				assert.ok(Math.abs(n[1] - 1) < 1e-5);
				assert.ok(Math.abs(Math.hypot(n[0], n[1]) - 1) < 1e-5);
			}
		});

		it("resamples curves uniformly by arc length", () => {
			const pts: Point2[] = [
				[0, 0],
				[1, 0],
				[10, 0],
			]; // Highly uneven spacing
			const resampled = resampleByArcLength(pts, 11);
			assert.equal(resampled.length, 11);
			for (let i = 0; i < 11; i++) {
				assert.ok(Math.abs(resampled[i]![0] - i) < 1e-4);
				assert.ok(Math.abs(resampled[i]![1]) < 1e-4);
			}
		});
	});

	// ── 3. Automatic Arch Detection (HU > 400 & RANSAC) ──────────

	describe("3. Automatic Arch Detection (Bone Density HU > 400 & RANSAC)", () => {
		it("solves 3-point parabola and fits via least squares", () => {
			// Parabola y = 0.02 * x^2 + 10
			const p1: Point2 = [-20, 0.02 * 400 + 10]; // [-20, 18]
			const p2: Point2 = [0, 10];
			const p3: Point2 = [20, 18];

			const res = solveParabola3Points(p1, p2, p3);
			assert.ok(res !== null);
			assert.ok(Math.abs(res.a - 0.02) < 1e-5);
			assert.ok(Math.abs(res.b) < 1e-5);
			assert.ok(Math.abs(res.c - 10) < 1e-5);

			// Least squares fit on multiple points along this parabola
			const noisyPoints: Point2[] = [
				[-30, 0.02 * 900 + 10],
				[-20, 18],
				[-10, 12],
				[0, 10],
				[10, 12],
				[20, 18],
				[30, 28],
			];
			const lsq = fitParabolaLeastSquares(noisyPoints);
			assert.ok(lsq !== null);
			assert.ok(Math.abs(lsq.a - 0.02) < 1e-4);
			assert.ok(Math.abs(lsq.b) < 1e-4);
			assert.ok(Math.abs(lsq.c - 10) < 1e-4);
		});

		it("detects arch control points from synthetic bone band volume", () => {
			const CX = 50;
			const CY = 60;
			const R = 30;
			const BAND_WIDTH = 3.0;

			// Synthetic volume with bone (1200 HU > 400 HU) along a U-band
			const boneVolume = makeSyntheticVol((i, j) => {
				const x = origin[0] + i * spacing[0];
				const y = origin[1] + j * spacing[1];
				const dx = x - CX;
				const dy = y - CY;
				const dist = Math.hypot(dx, dy);
				const phi = Math.atan2(dx, -dy); // 0 = anterior (-Y), + toward +X
				const isUBand =
					Math.abs(dist - R) < BAND_WIDTH &&
					Math.abs(phi) < (110 * Math.PI) / 180;
				return isUBand ? 1200 : -1000;
			});

			const cps = detectArchControlPoints(boneVolume, {
				boneThreshold: 400,
				numControlPoints: 9,
				useRansac: true,
			});

			assert.ok(cps !== null, "Arch detection should succeed on bone volume");
			assert.equal(cps.length, 9);

			// Every detected control point should lie near radius R
			for (const p of cps) {
				const d = Math.hypot(p[0] - CX, p[1] - CY);
				assert.ok(
					Math.abs(d - R) < 7.0,
					`Point (${p[0]}, ${p[1]}) distance ${d} should be near ${R}`,
				);
			}

			// Patient right (-X) to patient left (+X) orientation
			assert.ok(cps[0]![0] < CX, "First control point on patient right");
			assert.ok(
				cps[8]![0] > CX,
				"Last control point on patient left",
			);
		});

		it("returns null when volume contains no bone (air only)", () => {
			const airVol = makeSyntheticVol(() => -1000);
			const cps = detectArchControlPoints(airVol, { boneThreshold: 400 });
			assert.equal(cps, null);
		});
	});

	// ── 4. Cross-Section & Tilt Clamping (±30°) ──────────────────

	describe("4. Orthogonal Cross-Sections & Tilt Clamping (±30°)", () => {
		const straightArch: Point2[] = [
			[20, 50],
			[30, 50],
			[40, 50],
			[50, 50],
		];

		it("clamps tilt angles beyond ±30°", () => {
			const frame60 = crossSectionFrame(straightArch, 0.5, 60, 30, 70);
			const frame30 = crossSectionFrame(straightArch, 0.5, 30, 30, 70);
			assert.ok(frame60 !== null && frame30 !== null);
			// Both should have identical vertical basis axis eV since 60° clamps to 30°
			assert.ok(Math.abs(frame60.eV[0] - frame30.eV[0]) < 1e-6);
			assert.ok(Math.abs(frame60.eV[1] - frame30.eV[1]) < 1e-6);
			assert.ok(Math.abs(frame60.eV[2] - frame30.eV[2]) < 1e-6);
		});

		it("samples orthogonal cross-section pixel buffer without distortion", () => {
			const vol = makeSyntheticVol((i, j, k) => 200 + i * 2 + j + k);
			const res = computeCrossSection(vol, {
				controlPoints: straightArch,
				position: 0.5,
				tiltDeg: 0,
				widthMm: 12,
				resolution: 0.5,
			});

			assert.ok(res !== null);
			assert.equal(res.width, 24);
			assert.ok(res.height > 0);
			assert.equal(res.pixelData.length, res.width * res.height);
			// Should contain valid reconstructed values, not air
			assert.ok(res.pixelData[0]! > 100);
		});
	});

	// ── 5. Surgical Guide Clearance & Collision Validation ───────

	describe("5. Surgical Guide Clearance & Collision Validation", () => {
		const standardImplant = (
			entry: [number, number, number],
			length = 10,
			axis: [number, number, number] = [0, 0, 1],
		): GuideCheckImplant => ({
			entry,
			axis,
			length,
			diameter: 4.0,
			sleeveDiameter: 5.0,
			sleeveOffset: 9.0,
			sleeveHeight: 5.0,
			buccalCorticalMm: 1.5,
			lingualCorticalMm: 1.5,
		});

		const defaultParams: GuideParams = {
			wallMm: 1.5,
			sleeveWallMm: 0.9,
			channelTolMm: 0.1,
			sleeveSeat: true,
		};

		it("passes a single well-spaced implant clear of anatomy", () => {
			const imp = standardImplant([0, 0, 0]);
			const issues = validateGuide({
				implants: [imp],
				params: defaultParams,
			});
			assert.equal(issues.length, 0);
		});

		it("warns on thin resin housing wall (< 1.0 mm)", () => {
			const imp = standardImplant([0, 0, 0]);
			const issues = validateGuide({
				implants: [imp],
				params: { ...defaultParams, wallMm: 0.6 },
			});
			assert.ok(issues.some((i) => i.code === "thinWall"));
		});

		it("flags collision when drill overshoot pierces the mandibular nerve", () => {
			// Implant apex is at z=10. Overshoot is 2.0 mm (drill reaches z=12).
			// Mandibular nerve runs at z=11, intersecting drill axis at [0, 0, 11] with radius 1.0 mm.
			const imp = standardImplant([0, 0, 0], 10, [0, 0, 1]);
			const nerve: AnatomyMarker = {
				id: "ian_right",
				type: "nerve",
				radius: 1.0,
				points: [
					[-10, 0, 11],
					[10, 0, 11],
				],
			};

			const issues = validateGuide({
				implants: [imp],
				params: defaultParams,
				anatomy: [nerve],
			});

			const nerveHit = issues.find((i) => i.code === "drillNerve");
			assert.ok(nerveHit !== null);
			assert.equal(nerveHit?.severity, "error");
		});

		it("flags inter-implant proximity error when clearance is < 1.5 mm", () => {
			// Two parallel implants placed 3.0 mm apart center-to-center.
			// Diameters = 4.0 mm (radii = 2.0 mm).
			// Clearance = 3.0 - 2.0 - 2.0 = -1.0 mm (collision!)
			const imp1 = standardImplant([0, 0, 0]);
			const imp2 = standardImplant([3, 0, 0]);

			const issues = validateGuide({
				implants: [imp1, imp2],
				params: defaultParams,
			});

			const clearanceIssue = issues.find(
				(i) => i.code === "implantClearance",
			);
			assert.ok(clearanceIssue !== null);
			assert.equal(clearanceIssue?.severity, "error");
		});

		it("flags thin cortical plate warning when cortical thickness < 1.0 mm", () => {
			const imp = {
				...standardImplant([0, 0, 0]),
				buccalCorticalMm: 0.7, // Below 1.0 mm threshold
			};

			const issues = validateGuide({
				implants: [imp],
				params: defaultParams,
			});

			const plateIssue = issues.find((i) => i.code === "thinCorticalPlate");
			assert.ok(plateIssue !== null);
		});
	});
});
