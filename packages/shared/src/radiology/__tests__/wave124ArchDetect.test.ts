/**
 * WAVE 124: CBCT AUTOMATIC DENTAL ARCH DETECTION ENGINE UNIT TESTS
 *
 * Comprehensive tests for heuristic dental arch detection:
 * - Test 1: Synthetic volume with U-shaped bone arch (1200 HU teeth/bone) on soft tissue (50 HU).
 * - Test 2: Proper anatomical curvature and point ordering (patient right -> anterior -> patient left).
 * - Test 3: Empty volume (AIR_HU = -1024) returns null safely.
 * - Test 4: Dynamic variations of focalWorldZ, boneThreshold, and numControlPoints.
 * - Test 5: Strict verification that zero emojis exist in archDetectEngine.ts.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Wave 124: CBCT Automatic Arch Detection Engine", () => {
	const DIMS: [number, number, number] = [120, 120, 24];
	const SPACING: [number, number, number] = [1, 1, 1];
	const ORIGIN: [number, number, number] = [0, 0, 0];

	// Center and axes of the dental arch in world/index coordinates
	const CX = 60;
	const CY = 60;
	const SEMI_A = 34; // Lateral semi-major axis (X)
	const SEMI_B = 28; // Anteroposterior semi-minor axis (Y)
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

	// Synthetic U-shaped dental arch: 1200 HU for teeth and cortical alveolar bone, 50 HU for soft tissue
	const uShapedBoneArch = (i: number, j: number): number => {
		const dx = i - CX;
		const dy = j - CY;
		const rNorm = Math.hypot(dx / SEMI_A, dy / SEMI_B);
		const phi = Math.atan2(dx, -dy); // 0 is anterior (-Y), +X is patient left
		if (Math.abs(rNorm - 1.0) < 0.12 && Math.abs(phi) <= SPAN_RAD) {
			return 1200; // Cortical bone and teeth
		}
		return 50; // Soft tissue background
	};

	it("Test 1: detects 9 control points with correct anatomical curvature on 1200 HU U-shaped arch", () => {
		const vol = createVolume(uShapedBoneArch);
		const cps = detectArchControlPoints(vol);

		assert.ok(cps !== null, "Arch detection should succeed for valid 1200 HU bone arch");
		assert.equal(cps.length, 9, "Default numControlPoints must be 9");

		// Verify every control point lies on the bone contour band
		for (let i = 0; i < cps.length; i++) {
			const pt = cps[i];
			assert.ok(pt !== undefined, `Point ${i} must be defined`);
			const [x, y] = pt;
			const dx = x - CX;
			const dy = y - CY;
			const rNorm = Math.hypot(dx / SEMI_A, dy / SEMI_B);
			assert.ok(
				rNorm >= 0.85 && rNorm <= 1.15,
				`Control point ${i} [${x.toFixed(2)}, ${y.toFixed(2)}] must lie within bone band (rNorm: ${rNorm.toFixed(3)})`,
			);
		}

		// Anatomical ordering and curvature:
		// Right molar (first point): X < CX (patient right is -X)
		const rightMolar = cps[0]!;
		assert.ok(rightMolar[0] < CX, `Right molar X (${rightMolar[0]}) must be < ${CX}`);

		// Left molar (last point): X > CX (patient left is +X)
		const leftMolar = cps[8]!;
		assert.ok(leftMolar[0] > CX, `Left molar X (${leftMolar[0]}) must be > ${CX}`);

		// Anterior incisors (center point): minimum Y in LPS (-Y is anterior)
		const incisorPoint = cps[4]!;
		assert.ok(
			incisorPoint[1] < rightMolar[1] && incisorPoint[1] < leftMolar[1],
			"Anterior incisors must be anterior to molars (lower Y coordinate)",
		);
		assert.ok(
			Math.abs(incisorPoint[0] - CX) < 6,
			`Anterior incisors X (${incisorPoint[0]}) must be centered near CX (${CX})`,
		);

		// Monotonic lateral progression between endpoints
		assert.ok(
			leftMolar[0] > rightMolar[0],
			"Patient left molar X must be strictly greater than patient right molar X",
		);
	});

	it("Test 2: returns null when volume is empty (all voxels AIR_HU = -1024)", () => {
		const emptyVol = createVolume(() => AIR_HU);
		const result = detectArchControlPoints(emptyVol);

		assert.equal(result, null, "Empty volume must return null without throwing");
	});

	it("Test 3: returns null when volume contains only soft tissue (50 HU < 400 HU threshold)", () => {
		const softTissueVol = createVolume(() => 50);
		const result = detectArchControlPoints(softTissueVol);

		assert.equal(result, null, "Soft tissue only volume must return null");
	});

	it("Test 4: dynamically respects custom numControlPoints (7, 11, 15)", () => {
		const vol = createVolume(uShapedBoneArch);

		const cps7 = detectArchControlPoints(vol, { numControlPoints: 7 });
		assert.ok(cps7 !== null);
		assert.equal(cps7.length, 7);

		const cps11 = detectArchControlPoints(vol, { numControlPoints: 11 });
		assert.ok(cps11 !== null);
		assert.equal(cps11.length, 11);

		const cps15 = detectArchControlPoints(vol, { numControlPoints: 15 });
		assert.ok(cps15 !== null);
		assert.equal(cps15.length, 15);
	});

	it("Test 5: dynamically respects custom boneThreshold", () => {
		const vol = createVolume(uShapedBoneArch);

		// With boneThreshold = 800 HU, the 1200 HU teeth/bone arch is detected
		const detected = detectArchControlPoints(vol, { boneThreshold: 800 });
		assert.ok(detected !== null, "Arch with 1200 HU should be detected at 800 HU threshold");

		// With boneThreshold = 1500 HU, the 1200 HU arch is rejected
		const rejected = detectArchControlPoints(vol, { boneThreshold: 1500 });
		assert.equal(rejected, null, "Arch with 1200 HU must return null at 1500 HU threshold");
	});

	it("Test 6: dynamically respects focalWorldZ and slabHalfMm positioning", () => {
		// Volume where bone arch only exists at Z = 18..22 mm (slices k = 18..22)
		const localizedVol = createVolume((i, j, k) => {
			if (k >= 18 && k <= 22) {
				return uShapedBoneArch(i, j);
			}
			return 50;
		});

		// Targeted slab around focalWorldZ = 20 with slabHalfMm = 3 -> covers k in [17, 23]
		const targetedResult = detectArchControlPoints(localizedVol, {
			focalWorldZ: 20,
			slabHalfMm: 3,
		});
		assert.ok(targetedResult !== null, "Detection must succeed when focalWorldZ matches bone layer");
		assert.equal(targetedResult.length, 9);

		// Distant slab around focalWorldZ = 6 with slabHalfMm = 2 -> covers k in [4, 8] (pure soft tissue)
		const distantResult = detectArchControlPoints(localizedVol, {
			focalWorldZ: 6,
			slabHalfMm: 2,
		});
		assert.equal(distantResult, null, "Detection must return null when focalWorldZ is outside bone layer");
	});

	it("Test 7: smoothPolyline handles noise smoothing and boundary constraints", () => {
		const raw: Point2[] = [
			[0, 10],
			[1, 5],
			[2, 12],
			[3, 4],
			[4, 11],
			[5, 6],
		];
		const smoothed = smoothPolyline(raw, 1);
		assert.equal(smoothed.length, raw.length);

		// Empty and short arrays
		assert.deepEqual(smoothPolyline([]), []);
		const single: Point2[] = [[5, 5]];
		assert.deepEqual(smoothPolyline(single), single);
	});

	it("Test 8: confirms zero emojis in archDetectEngine.ts and test file", () => {
		const enginePath = path.resolve(__dirname, "../archDetectEngine.ts");
		const engineContent = fs.readFileSync(enginePath, "utf-8");
		const testContent = fs.readFileSync(__filename, "utf-8");

		// Regex matching unicode emoji ranges
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;

		assert.equal(
			emojiRegex.test(engineContent),
			false,
			"archDetectEngine.ts must contain strictly 0 emojis",
		);
		assert.equal(
			emojiRegex.test(testContent),
			false,
			"wave124ArchDetect.test.ts must contain strictly 0 emojis",
		);
	});
});
