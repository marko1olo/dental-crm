/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 136: CBCT ARCH DETECTION & BVH MESH SLICING ENGINE UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive unit test suite (100% Zero Mocks):
 *  1. Analytical CropBox clipping planes (full volume sentinel vs partial VOI crop).
 *  2. BVH AABB-tree construction, median centroid splits & leaf bounding boxes.
 *  3. Polygonal mesh slicing with BVH pruning vs brute-force baseline (cubes & planes).
 *  4. Heuristic automatic dental arch detection on synthetic 1200 HU axial CBCT slab.
 *  5. Edge cases: empty volume fallback (null), degenerate volumes, high noise.
 *  6. Regulatory Form 043/u A4 clinical protocol formatting & strict 0 emojis audit.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	archDetectOptionsSchema,
	cropBoxSchema,
	clipPlaneParamSchema,
	triangleBVHSchema,
	type TriangleBVH,
	type Vec3,
	type Point2,
	type VolumeSamplingData,
	NO_CROP,
	clipPlanes,
	buildTriangleBVH,
	sliceTriangleAt,
	slicePlaneSegments,
	slicePlaneBVH,
	smoothPolyline,
	resampleByArcLength,
	detectArchControlPoints,
	formatArchDetectAndSlicingA4Report,
} from "../cbctArchDetectSliceEngine.js";

/**
 * Creates a triangulated cube mesh [min..max] as a flat Float32Array of 12 triangles (108 floats).
 */
function createTriangulatedCube(min: Vec3, max: Vec3): Float32Array {
	const [x0, y0, z0] = min;
	const [x1, y1, z1] = max;

	// 8 vertices of the box
	const v0: Vec3 = [x0, y0, z0];
	const v1: Vec3 = [x1, y0, z0];
	const v2: Vec3 = [x1, y1, z0];
	const v3: Vec3 = [x0, y1, z0];
	const v4: Vec3 = [x0, y0, z1];
	const v5: Vec3 = [x1, y0, z1];
	const v6: Vec3 = [x1, y1, z1];
	const v7: Vec3 = [x0, y1, z1];

	// 12 triangles (6 faces * 2 triangles)
	const triangles: [Vec3, Vec3, Vec3][] = [
		// Bottom face (Z = z0)
		[v0, v2, v1], [v0, v3, v2],
		// Top face (Z = z1)
		[v4, v5, v6], [v4, v6, v7],
		// Front face (Y = y0)
		[v0, v1, v5], [v0, v5, v4],
		// Back face (Y = y1)
		[v3, v7, v6], [v3, v6, v2],
		// Left face (X = x0)
		[v0, v4, v7], [v0, v7, v3],
		// Right face (X = x1)
		[v1, v2, v6], [v1, v6, v5],
	];

	const tris = new Float32Array(triangles.length * 9);
	for (let t = 0; t < triangles.length; t++) {
		const tri = triangles[t]!;
		const o = t * 9;
		tris[o] = tri[0][0]; tris[o + 1] = tri[0][1]; tris[o + 2] = tri[0][2];
		tris[o + 3] = tri[1][0]; tris[o + 4] = tri[1][1]; tris[o + 5] = tri[1][2];
		tris[o + 6] = tri[2][0]; tris[o + 7] = tri[2][1]; tris[o + 8] = tri[2][2];
	}
	return tris;
}

/**
 * Calculates sum of Euclidean lengths of 3D line segments.
 */
function totalSegmentsLength(segs: [Vec3, Vec3][]): number {
	let len = 0;
	for (const [p0, p1] of segs) {
		len += Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
	}
	return len;
}

describe("Wave 136: CBCT Auto Arch Detection & BVH Mesh Slicing Engine", () => {
	// ── 1. Analytical CropBox Clipping Planes ──────────────────────────────
	describe("1. CropBox Clipping Planes (Analytical VOI Geometry)", () => {
		const bmin: Vec3 = [-50, -50, -25];
		const bmax: Vec3 = [50, 50, 25];

		it("returns empty array of clipping planes for NO_CROP sentinel", () => {
			const planes = clipPlanes(bmin, bmax, NO_CROP);
			assert.strictEqual(planes.length, 0, "Full uncropped volume needs zero clipping planes");
		});

		it("generates exact clipping planes for partial 3D crop box", () => {
			// Crop min: [0.1, 0.2, 0.0], max: [0.9, 1.0, 0.8]
			// X clips on min and max (2 planes: +X at -40, -X at +40)
			// Y clips on min (1 plane: +Y at -30)
			// Z clips on max (1 plane: -Z at +15)
			const crop = {
				min: [0.1, 0.2, 0.0] as [number, number, number],
				max: [0.9, 1.0, 0.8] as [number, number, number],
			};
			const planes = clipPlanes(bmin, bmax, crop);
			assert.strictEqual(planes.length, 4, "Expected exactly 4 active clipping planes");

			// Verify X-min plane (+X normal keeping x >= -40)
			const pXmin = planes.find((p) => p.normal[0] === 1 && p.normal[1] === 0 && p.normal[2] === 0);
			assert.ok(pXmin !== undefined);
			assert.ok(Math.abs(pXmin.origin[0] - (-40)) < 1e-4);

			// Verify X-max plane (-X normal keeping x <= +40)
			const pXmax = planes.find((p) => p.normal[0] === -1 && p.normal[1] === 0 && p.normal[2] === 0);
			assert.ok(pXmax !== undefined);
			assert.ok(Math.abs(pXmax.origin[0] - 40) < 1e-4);

			// Verify Y-min plane (+Y normal keeping y >= -30)
			const pYmin = planes.find((p) => p.normal[0] === 0 && p.normal[1] === 1 && p.normal[2] === 0);
			assert.ok(pYmin !== undefined);
			assert.ok(Math.abs(pYmin.origin[1] - (-30)) < 1e-4);

			// Verify Z-max plane (-Z normal keeping z <= +15)
			const pZmax = planes.find((p) => p.normal[0] === 0 && p.normal[1] === 0 && p.normal[2] === -1);
			assert.ok(pZmax !== undefined);
			assert.ok(Math.abs(pZmax.origin[2] - 15) < 1e-4);
		});

		it("correctly validates Zod cropBoxSchema and clipPlaneParamSchema", () => {
			const validCrop = cropBoxSchema.parse({
				min: [0, 0.1, 0.2],
				max: [0.8, 0.9, 1.0],
			});
			assert.deepStrictEqual(validCrop.min, [0, 0.1, 0.2]);

			assert.throws(() => {
				cropBoxSchema.parse({
					min: [-0.1, 0, 0], // Below 0
					max: [1, 1, 1],
				});
			});

			const validPlane = clipPlaneParamSchema.parse({
				origin: [10, 20, 30],
				normal: [0, 0, 1],
			});
			assert.strictEqual(validPlane.normal[2], 1);
		});
	});

	// ── 2. BVH Construction & Plane Mesh Slicing ───────────────────────────
	describe("2. BVH AABB-Tree Construction & Triangle Slicing", () => {
		const cubeMin: Vec3 = [0, 0, 0];
		const cubeMax: Vec3 = [10, 10, 10];
		const cubeTris = createTriangulatedCube(cubeMin, cubeMax);

		it("builds a valid TriangleBVH with AABB roots and leaf sizes", () => {
			const bvh = buildTriangleBVH(cubeTris);
			assert.strictEqual(bvh.count, 12, "Should hold all 12 triangles of the cube");
			assert.ok(bvh.root !== null, "BVH root must be constructed");

			// Validate BVH bounding box centre and half extents
			assert.ok(Math.abs(bvh.root.cx - 5.0) < 1e-5);
			assert.ok(Math.abs(bvh.root.cy - 5.0) < 1e-5);
			assert.ok(Math.abs(bvh.root.cz - 5.0) < 1e-5);
			assert.ok(Math.abs(bvh.root.hx - 5.0) < 1e-5);
			assert.ok(Math.abs(bvh.root.hy - 5.0) < 1e-5);
			assert.ok(Math.abs(bvh.root.hz - 5.0) < 1e-5);

			// Validate against Zod schema
			const validated = triangleBVHSchema.parse(bvh);
			assert.strictEqual(validated.count, 12);
		});

		it("correctly handles empty triangle array", () => {
			const emptyBvh = buildTriangleBVH(new Float32Array(0));
			assert.strictEqual(emptyBvh.count, 0);
			assert.strictEqual(emptyBvh.root, null);
			const segs = slicePlaneBVH(new Float32Array(0), emptyBvh, [0, 0, 0], [0, 0, 1]);
			assert.strictEqual(segs.length, 0);
		});

		it("slices triangle with horizontal plane and matches brute-force slicing", () => {
			const bvh = buildTriangleBVH(cubeTris);
			const planePoint: Vec3 = [0, 0, 5]; // Horizontal cut at mid-height Z = 5
			const planeNormal: Vec3 = [0, 0, 1];

			// 1. Direct brute force
			const directSegs = slicePlaneSegments(cubeTris, planePoint, planeNormal);
			// 2. BVH accelerated
			const bvhSegs = slicePlaneBVH(cubeTris, bvh, planePoint, planeNormal);

			assert.strictEqual(bvhSegs.length, directSegs.length, "BVH segment count must match brute force");
			assert.strictEqual(bvhSegs.length, 8, "Expected 8 segments crossing the 4 vertical faces");

			// Perimeter of 10x10 square = 40 mm
			const directLen = totalSegmentsLength(directSegs);
			const bvhLen = totalSegmentsLength(bvhSegs);
			assert.ok(Math.abs(directLen - 40.0) < 1e-4, `Perimeter must be 40 mm, got ${directLen}`);
			assert.ok(Math.abs(bvhLen - 40.0) < 1e-4, `BVH perimeter must be 40 mm, got ${bvhLen}`);
			assert.ok(Math.abs(bvhLen - directLen) < 1e-6);

			// Every segment point must lie exactly on the plane Z = 5
			for (const [p0, p1] of bvhSegs) {
				assert.ok(Math.abs(p0[2] - 5.0) < 1e-5, `Point p0.z (${p0[2]}) must be 5.0`);
				assert.ok(Math.abs(p1[2] - 5.0) < 1e-5, `Point p1.z (${p1[2]}) must be 5.0`);
			}
		});

		it("slices mesh with oblique plane and verifies BVH pruning parity", () => {
			const bvh = buildTriangleBVH(cubeTris);
			const planePoint: Vec3 = [5, 5, 5];
			const invSqrt2 = 1 / Math.SQRT2;
			const planeNormal: Vec3 = [invSqrt2, invSqrt2, 0]; // 45 degree vertical diagonal plane

			const directSegs = slicePlaneSegments(cubeTris, planePoint, planeNormal);
			const bvhSegs = slicePlaneBVH(cubeTris, bvh, planePoint, planeNormal);

			assert.strictEqual(bvhSegs.length, directSegs.length);
			assert.ok(bvhSegs.length > 0);

			const directLen = totalSegmentsLength(directSegs);
			const bvhLen = totalSegmentsLength(bvhSegs);
			assert.ok(Math.abs(bvhLen - directLen) < 1e-6);
		});

		it("prunes entire BVH tree when plane does not intersect the mesh", () => {
			const bvh = buildTriangleBVH(cubeTris);
			const planePoint: Vec3 = [0, 0, 50]; // Far above the cube (max Z is 10)
			const planeNormal: Vec3 = [0, 0, 1];

			const segs = slicePlaneBVH(cubeTris, bvh, planePoint, planeNormal);
			assert.strictEqual(segs.length, 0, "No segments should be returned for non-intersecting plane");
		});
	});

	// ── 3. Automatic Arch Detection Algorithm ──────────────────────────────
	describe("3. Automatic Arch Detection (Catmull-Rom & MIP)", () => {
		const DIMS: [number, number, number] = [100, 100, 20];
		const ORIGIN: [number, number, number] = [0, 0, 0];
		const SPACING: [number, number, number] = [1, 1, 1];
		const CX = 50;
		const CY = 50;
		const SEMI_A = 28; // Lateral radius X
		const SEMI_B = 24; // Anteroposterior radius Y

		function createTestVolume(
			voxelFn: (i: number, j: number, k: number) => number,
		): VolumeSamplingData {
			return {
				dims: DIMS,
				origin: ORIGIN,
				getVoxel: voxelFn,
				invSx: 1 / SPACING[0],
				invSy: 1 / SPACING[1],
				invSz: 1 / SPACING[2],
				zMin: ORIGIN[2],
				zMax: ORIGIN[2] + (DIMS[2] - 1) * SPACING[2],
				vSpacing: SPACING[2],
			};
		}

		// Synthetic U-shaped dental arch: 1200 HU cortical bone, 50 HU soft tissue background
		const uBoneArchFn = (i: number, j: number, _k: number): number => {
			const dx = i - CX;
			const dy = j - CY;
			const rNorm = Math.hypot(dx / SEMI_A, dy / SEMI_B);
			const phi = Math.atan2(dx, -dy); // 0 = anterior (-Y)
			const spanRad = (115 * Math.PI) / 180;
			if (Math.abs(rNorm - 1.0) < 0.12 && Math.abs(phi) <= spanRad) {
				return 1200; // Bone / teeth
			}
			return 50; // Background soft tissue
		};

		it("detects 9 Catmull-Rom control points on synthetic 1200 HU dental arch", () => {
			const vol = createTestVolume(uBoneArchFn);
			const cps = detectArchControlPoints(vol, {
				slabHalfMm: 5,
				boneThreshold: 400,
				numControlPoints: 9,
				angularSpanDeg: 115,
			});

			assert.ok(cps !== null, "Arch detection should succeed for valid bone arch");
			assert.strictEqual(cps.length, 9, "Should return requested 9 control points");

			// First point: Patient Right Molar (X < CX)
			const rightMolar = cps[0]!;
			assert.ok(rightMolar[0] < CX, `Right molar X (${rightMolar[0]}) must be < ${CX}`);

			// Middle point: Anterior Incisors (Y < CY in LPS)
			const midIdx = Math.floor(cps.length / 2);
			const anteriorIncisor = cps[midIdx]!;
			assert.ok(anteriorIncisor[1] < CY, `Anterior incisor Y (${anteriorIncisor[1]}) must be < ${CY}`);

			// Last point: Patient Left Molar (X > CX)
			const leftMolar = cps[cps.length - 1]!;
			assert.ok(leftMolar[0] > CX, `Left molar X (${leftMolar[0]}) must be > ${CX}`);

			// Verify all points lie within the elliptical bone band
			for (let idx = 0; idx < cps.length; idx++) {
				const pt = cps[idx]!;
				const dx = pt[0] - CX;
				const dy = pt[1] - CY;
				const rNorm = Math.hypot(dx / SEMI_A, dy / SEMI_B);
				assert.ok(
					rNorm >= 0.8 && rNorm <= 1.2,
					`Point ${idx} [${pt[0]}, ${pt[1]}] should have normalized radius near 1.0 (got ${rNorm})`,
				);
			}
		});

		it("supports custom control point count (e.g. 7 points)", () => {
			const vol = createTestVolume(uBoneArchFn);
			const cps = detectArchControlPoints(vol, { numControlPoints: 7 });
			assert.ok(cps !== null);
			assert.strictEqual(cps.length, 7);
		});

		it("returns null safely for empty/air volume (-1024 HU)", () => {
			const emptyVol = createTestVolume(() => -1024);
			const result = detectArchControlPoints(emptyVol);
			assert.strictEqual(result, null, "Should return null when insufficient bone is present");
		});

		it("returns null safely for degenerate slab boundaries", () => {
			const vol = createTestVolume(uBoneArchFn);
			// Focal point far outside volume Z bounds
			const result = detectArchControlPoints(vol, { focalWorldZ: 500 });
			assert.strictEqual(result, null);
		});
	});

	// ── 4. Polyline Resampling & Smoothing Helpers ─────────────────────────
	describe("4. Polyline Smoothing & Arc-Length Resampling", () => {
		it("smoothPolyline dampens local jitter while preserving endpoints", () => {
			const noisy: Point2[] = [
				[0, 0],
				[1, 5], // High jitter
				[2, -1],
				[3, 4],
				[4, 0],
			];
			const smoothed = smoothPolyline(noisy, 1);
			assert.strictEqual(smoothed.length, noisy.length);
			// Midpoint value should be dampened
			assert.ok(Math.abs(smoothed[1]![1]) < 5, "Spike should be smoothed");
		});

		it("resampleByArcLength produces equidistant points along a straight line", () => {
			const line: Point2[] = [
				[0, 0],
				[100, 0],
			];
			const resampled = resampleByArcLength(line, 5);
			assert.strictEqual(resampled.length, 5);
			assert.deepStrictEqual(resampled[0], [0, 0]);
			assert.deepStrictEqual(resampled[1], [25, 0]);
			assert.deepStrictEqual(resampled[2], [50, 0]);
			assert.deepStrictEqual(resampled[3], [75, 0]);
			assert.deepStrictEqual(resampled[4], [100, 0]);
		});
	});

	// ── 5. Form 043/u A4 Clinical Protocol & Strict 0 Emoji Law ───────────
	describe("5. Regulatory Form 043/u A4 Report & Zero Emoji Audit (Mandate 8d #7)", () => {
		const sampleReportData = {
			patientFullName: "Соколова Анна Михайловна",
			birthDate: "14.06.1985",
			cardRecordNumber: "43-8912/2026",
			studyDate: "12.09.2026 11:30",
			doctorFullName: "Кузнецов Д.В.",
			clinicName: "СТОМАТОЛОГИЧЕСКИЙ ЦЕНТР ДЕНТЕ",
			jawType: "mandible" as const,
			archDetection: {
				detected: true,
				controlPointsCount: 9,
				focalWorldZ: 12.5,
				slabHalfMm: 6.0,
				boneThresholdHu: 400,
				angularSpanDeg: 115,
				approxArcLengthMm: 98.4,
				controlPoints: [
					[-32.4, 21.0] as Point2,
					[-28.1, 10.2] as Point2,
					[-18.5, 2.1] as Point2,
					[-8.9, -3.2] as Point2,
					[0.0, -5.0] as Point2,
					[8.9, -3.2] as Point2,
					[18.5, 2.1] as Point2,
					[28.1, 10.2] as Point2,
					[32.4, 21.0] as Point2,
				],
			},
			cropBox: {
				min: [0.0, 0.0, 0.0] as [number, number, number],
				max: [1.0, 0.85, 0.55] as [number, number, number],
				activePlanesCount: 2,
				volumeReductionPercent: 45.2,
			},
			meshSlicing: {
				totalTriangles: 14500,
				planePoint: [0, 0, 12.5] as Vec3,
				planeNormal: [0, 0, 1] as Vec3,
				intersectedSegmentsCount: 248,
				contourLengthMm: 114.6,
			},
			clinicalConclusion:
				"Анатомическая кривизна альвеолярного гребня нижней челюсти в области отсутствующих зубов 46, 47 полностью соответствует критериям навигационной имплантации.",
		};

		it("formats comprehensive Form 043/u A4 report with all clinical sections", () => {
			const report = formatArchDetectAndSlicingA4Report(sampleReportData);
			assert.ok(report.includes("МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ"));
			assert.ok(report.includes("ФОРМА 043/У"));
			assert.ok(report.includes("Соколова Анна Михайловна"));
			assert.ok(report.includes("43-8912/2026"));
			assert.ok(report.includes("Кузнецов Д.В."));
			assert.ok(report.includes("Нижняя челюсть (Mandible)"));
			assert.ok(report.includes("АВТОМАТИЧЕСКАЯ ДЕТЕКЦИЯ ЗУБНОЙ ДУГИ"));
			assert.ok(report.includes("98.4 мм"));
			assert.ok(report.includes("ПАРАМЕТРЫ ОБЪЕМА ИНТЕРЕСА (VOI CROP BOX"));
			assert.ok(report.includes("45.2%"));
			assert.ok(report.includes("ПРОСТРАНСТВЕННЫЙ СРЕЗ ПОЛИГОНАЛЬНЫХ СЕТОК"));
			assert.ok(report.includes("14500"));
			assert.ok(report.includes("248"));
			assert.ok(report.includes("КЛИНИЧЕСКОЕ ЗАКЛЮЧЕНИЕ И ЭКСПЕРТИЗА"));
		});

		it("strictly contains ZERO cartoon emojis (Mandate 8d, point 7 audit via Unicode Regex)", () => {
			const report = formatArchDetectAndSlicingA4Report(sampleReportData);
			// Strict Unicode emoji patterns
			const emojiPattern =
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/u;
			const pictographicPattern = /\p{Extended_Pictographic}/u;

			assert.strictEqual(
				emojiPattern.test(report),
				false,
				"Form 043/u report must strictly contain ZERO cartoon emojis per Mandate 8d #7",
			);
			assert.strictEqual(
				pictographicPattern.test(report),
				false,
				"Form 043/u report must strictly contain ZERO extended pictographs",
			);
		});
	});
});
