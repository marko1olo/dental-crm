/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 121: CBCT AUTOMATIC DENTAL ARCH DETECTION UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive unit tests for heuristic dental arch curve detection:
 * - Test 1: Synthetic volume with elliptical bone arch (HU = 800) on soft tissue (HU = 40)
 * - Test 2: Point ordering verification (patient right -> anterior -> patient left)
 * - Test 3: Empty volume (all voxels AIR_HU = -1024) returns null
 * - Test 4: Insufficient bone density (< boneThreshold or < 50 voxels) returns null
 * - Test 5: smoothPolyline noise attenuation and degenerate input guards
 * - Test 6: ArchDetectOptions boundaries (custom focalWorldZ, slabHalfMm, numControlPoints)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	detectArchControlPoints,
	smoothPolyline,
	type ArchDetectOptions,
} from "../archDetectEngine.js";
import {
	AIR_HU,
	type Point2,
	type VolumeSamplingData,
} from "../cprMath.js";

describe("Wave 121: CBCT Automatic Arch Detection Engine", () => {
	// Standard volume geometry
	const DIMS: [number, number, number] = [120, 120, 20];
	const SPACING: [number, number, number] = [1, 1, 1];
	const ORIGIN: [number, number, number] = [0, 0, 0];

	// Arch geometry constants in world/index coordinates
	const CX = 60;
	const CY = 60;
	const A = 35; // lateral semi-major axis (X)
	const B = 30; // anteroposterior semi-minor axis (Y)
	const SPAN_RAD = (115 * Math.PI) / 180;

	function createVolume(
		voxelFn: (i: number, j: number, k: number) => number,
		dims = DIMS,
		origin = ORIGIN,
		spacing = SPACING,
	): VolumeSamplingData {
		return {
			dims,
			origin,
			getVoxel: voxelFn,
			invSx: 1 / spacing[0],
			invSy: 1 / spacing[1],
			invSz: 1 / spacing[2],
			zMin: origin[2],
			zMax: origin[2] + (dims[2] - 1) * spacing[2],
			vSpacing: spacing[2],
		};
	}

	// Synthetic elliptical dental arch: bone HU = 800, soft tissue HU = 40
	const ellipticalBoneArch = (i: number, j: number): number => {
		const dx = i - CX;
		const dy = j - CY;
		const rNorm = Math.hypot(dx / A, dy / B);
		const phi = Math.atan2(dx, -dy); // 0 is anterior (-Y), + toward patient left (+X)
		if (Math.abs(rNorm - 1.0) < 0.12 && Math.abs(phi) <= SPAN_RAD) {
			return 800; // cortical alveolar bone / teeth
		}
		return 40; // background soft tissue
	};

	// ── Test 1: Synthetic Elliptical Arch Detection ────────────────

	it("Test 1: detects exactly 9 control points on synthetic elliptical bone arch", () => {
		const vol = createVolume(ellipticalBoneArch);
		const cps = detectArchControlPoints(vol);

		assert.ok(cps !== null, "Arch detection should succeed for valid bone arch");
		assert.equal(cps.length, 9, "Default numControlPoints must be 9");

		// Verify every emitted control point lies directly on the elliptical bone band
		for (let i = 0; i < cps.length; i++) {
			const pt = cps[i];
			assert.ok(pt !== undefined, `Point at index ${i} must be defined`);
			const [x, y] = pt;
			const dx = x - CX;
			const dy = y - CY;
			const rNorm = Math.hypot(dx / A, dy / B);
			assert.ok(
				rNorm >= 0.85 && rNorm <= 1.15,
				`Control point ${i} [${x.toFixed(2)}, ${y.toFixed(2)}] must lie on the bone band (rNorm: ${rNorm.toFixed(3)})`,
			);
		}
	});

	// ── Test 2: Anatomical Ordering (Right -> Anterior -> Left) ───

	it("Test 2: orders control points patient-right -> anterior -> patient-left", () => {
		const vol = createVolume(ellipticalBoneArch);
		const cps = detectArchControlPoints(vol);

		assert.ok(cps !== null, "Arch detection should succeed");
		assert.equal(cps.length, 9);

		const firstPoint = cps[0]!;
		const middlePoint = cps[4]!;
		const lastPoint = cps[8]!;

		// 1. Patient right is on the -X side (first point: X < CX)
		assert.ok(
			firstPoint[0] < CX,
			`First point X (${firstPoint[0]}) must be on patient right (< ${CX})`,
		);

		// 2. Patient left is on the +X side (last point: X > CX)
		assert.ok(
			lastPoint[0] > CX,
			`Last point X (${lastPoint[0]}) must be on patient left (> ${CX})`,
		);

		// 3. Overall lateral progression across endpoints
		assert.ok(
			lastPoint[0] > firstPoint[0],
			`Last point X (${lastPoint[0]}) must be greater than first point X (${firstPoint[0]})`,
		);

		// 4. Anterior cusp / incisors: minimum Y in LPS coordinates (-Y is anterior)
		const frontPoint = cps.reduce((minPt, pt) => (pt[1] < minPt[1] ? pt : minPt));

		// Middle control point (index 4) should be the most anterior point
		assert.equal(
			frontPoint,
			middlePoint,
			"Middle point (index 4) must be the most anterior point",
		);

		// Anterior point should be centered laterally near CX
		assert.ok(
			Math.abs(frontPoint[0] - CX) < 5,
			`Anterior point X (${frontPoint[0]}) must be centered near CX (${CX})`,
		);

		// Anterior point Y should be near CY - B (anterior apex of ellipse)
		assert.ok(
			frontPoint[1] < CY - B + 6,
			`Anterior point Y (${frontPoint[1]}) must be near apex (~${CY - B})`,
		);
	});

	// ── Test 3: Empty Volume Returns Null ─────────────────────────

	it("Test 3: returns null when volume is empty (all voxels AIR_HU = -1024)", () => {
		const emptyVol = createVolume(() => AIR_HU);
		const result = detectArchControlPoints(emptyVol);

		assert.equal(
			result,
			null,
			"Empty air volume must return null without throwing",
		);
	});

	// ── Test 4: Insufficient Bone Density Returns Null ────────────

	it("Test 4: returns null when bone density is insufficient", () => {
		// Scenario A: Soft tissue only (HU = 40, strictly below default 400 HU threshold)
		const softTissueVol = createVolume(() => 40);
		assert.equal(
			detectArchControlPoints(softTissueVol),
			null,
			"Soft tissue volume (40 HU) must return null",
		);

		// Scenario B: Sparse bone (only 10 isolated voxels above threshold, below 50 voxel cutoff)
		const sparseBoneVol = createVolume((i, j, k) => {
			if (k === 10 && i === 60 && j >= 50 && j < 60) {
				return 1000; // only 10 voxels
			}
			return 40;
		});
		assert.equal(
			detectArchControlPoints(sparseBoneVol),
			null,
			"Sparse bone (< 50 voxels) must return null",
		);

		// Scenario C: Custom high bone threshold (bone is 500 HU, but threshold is 700 HU)
		const moderateBoneVol = createVolume((i, j) => {
			const dx = i - CX;
			const dy = j - CY;
			const rNorm = Math.hypot(dx / A, dy / B);
			return Math.abs(rNorm - 1.0) < 0.12 ? 500 : 40;
		});
		assert.equal(
			detectArchControlPoints(moderateBoneVol, { boneThreshold: 700 }),
			null,
			"Volume below custom boneThreshold (700 HU) must return null",
		);
	});

	// ── Test 5: Polyline Moving-Average Smoothing ──────────────────

	it("Test 5: verifies smoothPolyline noise attenuation and boundary conditions", () => {
		// 1. Noise attenuation on synthetic oscillating polyline
		const N = 30;
		const rawPoints: Point2[] = [];
		for (let i = 0; i < N; i++) {
			// Linear trend y = 2x with alternating +/- 8 noise
			const noise = i % 2 === 0 ? 8 : -8;
			rawPoints.push([i * 2, i * 4 + noise]);
		}

		const smoothed = smoothPolyline(rawPoints, 2);

		assert.equal(smoothed.length, N, "Smoothed points count must match input length");

		// Compute variance of adjacent second differences: sum((y[i+1] - 2*y[i] + y[i-1])^2)
		let rawRoughness = 0;
		let smoothRoughness = 0;
		for (let i = 1; i < N - 1; i++) {
			const rawCur = rawPoints[i]![1];
			const rawPrev = rawPoints[i - 1]![1];
			const rawNext = rawPoints[i + 1]![1];
			rawRoughness += Math.pow(rawNext - 2 * rawCur + rawPrev, 2);

			const smCur = smoothed[i]![1];
			const smPrev = smoothed[i - 1]![1];
			const smNext = smoothed[i + 1]![1];
			smoothRoughness += Math.pow(smNext - 2 * smCur + smPrev, 2);
		}

		assert.ok(
			smoothRoughness < rawRoughness * 0.25,
			`Smoothing with radius 2 must reduce roughness by at least 75% (raw: ${rawRoughness}, smooth: ${smoothRoughness})`,
		);

		// 2. Boundary edge cases
		// Empty array
		assert.deepEqual(smoothPolyline([]), []);

		// Fewer than 3 points returns unmodified copy
		const singlePt: Point2[] = [[10, 20]];
		assert.deepEqual(smoothPolyline(singlePt), singlePt);

		const twoPts: Point2[] = [
			[0, 0],
			[10, 10],
		];
		assert.deepEqual(smoothPolyline(twoPts), twoPts);

		// Radius < 1 returns copy of points
		assert.deepEqual(smoothPolyline(rawPoints, 0), rawPoints);

		// Large radius handles edge clipping cleanly without out-of-bounds
		const largeRadius = smoothPolyline(rawPoints, 50);
		assert.equal(largeRadius.length, N);
	});

	// ── Test 6: ArchDetectOptions Boundary Parameters ─────────────

	it("Test 6: verifies ArchDetectOptions boundaries (custom focalWorldZ, slabHalfMm, numControlPoints)", () => {
		const vol = createVolume(ellipticalBoneArch);

		// A. Custom numControlPoints: 5 and 15
		const cps5 = detectArchControlPoints(vol, { numControlPoints: 5 });
		assert.ok(cps5 !== null, "Custom 5-point detection should succeed");
		assert.equal(cps5.length, 5, "Must emit exactly 5 control points");

		const cps15 = detectArchControlPoints(vol, { numControlPoints: 15 });
		assert.ok(cps15 !== null, "Custom 15-point detection should succeed");
		assert.equal(cps15.length, 15, "Must emit exactly 15 control points");

		// B. Custom focalWorldZ inside vs outside bone slice region
		// Volume where bone only exists at slice k = 14..18 (Z = 14..18 mm)
		const localizedZVol = createVolume((i, j, k) => {
			if (k >= 14 && k <= 18) {
				return ellipticalBoneArch(i, j);
			}
			return 40;
		});

		// Focal Z matching the bone layer (Z = 16 mm, slabHalfMm = 2 mm -> k in [14, 18])
		const matchingZResult = detectArchControlPoints(localizedZVol, {
			focalWorldZ: 16,
			slabHalfMm: 2,
		});
		assert.ok(
			matchingZResult !== null,
			"Detection must succeed when focalWorldZ targets the bone slab",
		);
		assert.equal(matchingZResult.length, 9);

		// Focal Z away from bone layer (Z = 4 mm, slabHalfMm = 2 mm -> k in [2, 6])
		const missingZResult = detectArchControlPoints(localizedZVol, {
			focalWorldZ: 4,
			slabHalfMm: 2,
		});
		assert.equal(
			missingZResult,
			null,
			"Detection must return null when focalWorldZ slab contains no bone",
		);

		// C. Degenerate volume dimensions guard (nx < 4 || ny < 4 || nz < 1)
		const tinyVol = createVolume(
			() => 800,
			[3, 3, 1], // too small
			ORIGIN,
			SPACING,
		);
		assert.equal(
			detectArchControlPoints(tinyVol),
			null,
			"Degenerate volume dims must return null",
		);
	});
});
