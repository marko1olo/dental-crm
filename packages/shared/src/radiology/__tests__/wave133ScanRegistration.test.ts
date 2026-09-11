/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 133: 3D OPTICAL SCAN REGISTRATION & PROSTHETIC TOOTH SETUP ENGINE TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * 100% Zero-Mock comprehensive unit tests:
 * 1. 4×4 Matrix algebra: mul4, applyMat4, identity4, IDENTITY4
 * 2. Cyclic Jacobi symmetric eigensolver: identity, diagonal, and arbitrary symmetric 3×3 & 4×4
 * 3. Horn's unit-quaternion Kabsch registration: recovering exact rotation + translation (RMS < 1e-6)
 * 4. Clinical registration quality classification:
 *    - RMS < 0.5 mm -> 'excellent'
 *    - 0.7 mm -> 'acceptable'
 *    - RMS > 1.0 mm -> 'poor'
 * 5. Möller–Trumbore ray-triangle picking: direct hit, outside miss, pickMeshRay with indexed & soup mesh
 * 6. PCA tooth shape analysis: elongated ellipsoid along Z -> principal axis aligns with Z (|axis[2]| > 0.98)
 * 7. Prosthetically-driven implant setup: virtual wax-up -> platform position and BL/MD angles (mandible & maxilla)
 * 8. Form 043/u A4 registration protocol formatting & strict 0 emoji audit (Mandate 8d #7)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Point2, Vec3 } from "../cprMath.js";
import {
	IDENTITY4,
	identity4,
	mul4,
	applyMat4,
	rigidMatrix,
	centroid,
	jacobiEigenSymmetric,
	classifyRegistrationQuality,
	kabschTransform,
	kabschTransformWithRms,
	rayTriangleHit,
	pickMeshRay,
	principalAxis,
	anglesFromWorldAxis,
	suggestImplantFromCrown,
	formatScanRegistrationA4Protocol,
	type ArchFrame,
	type CrownImplantSuggestion,
} from "../scanRegistrationEngine.js";
import { implantAxis } from "../implantGeometryEngine.js";

describe("Wave 133: 3D Scan Registration & Tooth Setup Engine", () => {
	// ── 1. 4×4 Matrix Algebra ─────────────────────────────────────

	describe("1. 4x4 Matrix Algebra", () => {
		it("identity4 and IDENTITY4 leave points and matrices unchanged", () => {
			const p: Vec3 = [12.5, -7.3, 42.0];
			const pTransformed = applyMat4(IDENTITY4, p);
			assert.ok(Math.abs(pTransformed[0] - p[0]) < 1e-9);
			assert.ok(Math.abs(pTransformed[1] - p[1]) < 1e-9);
			assert.ok(Math.abs(pTransformed[2] - p[2]) < 1e-9);

			const idFresh = identity4();
			const m = mul4(IDENTITY4, idFresh);
			for (let i = 0; i < 16; i++) {
				assert.ok(Math.abs(m[i]! - IDENTITY4[i]!) < 1e-9);
			}
		});

		it("multiplies two translation matrices correctly", () => {
			// T1: translate by (10, 0, 0)
			const T1 = [
				1, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, 1, 0,
				10, 0, 0, 1,
			];
			// T2: translate by (0, 20, 5)
			const T2 = [
				1, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, 1, 0,
				0, 20, 5, 1,
			];
			const T12 = mul4(T2, T1);
			const pt: Vec3 = [1, 2, 3];
			const out = applyMat4(T12, pt);
			assert.ok(Math.abs(out[0] - 11) < 1e-9);
			assert.ok(Math.abs(out[1] - 22) < 1e-9);
			assert.ok(Math.abs(out[2] - 8) < 1e-9);
		});

		it("constructs rigid matrix from 3x3 rotation and translation", () => {
			const R = [
				[0, -1, 0],
				[1, 0, 0],
				[0, 0, 1],
			];
			const t: Vec3 = [5, -3, 2];
			const M = rigidMatrix(R, t);
			const out = applyMat4(M, [1, 0, 0]);
			// R * [1, 0, 0] = [0, 1, 0] + [5, -3, 2] = [5, -2, 2]
			assert.ok(Math.abs(out[0] - 5) < 1e-6);
			assert.ok(Math.abs(out[1] - -2) < 1e-6);
			assert.ok(Math.abs(out[2] - 2) < 1e-6);
		});
	});

	// ── 2. Cyclic Jacobi Symmetric Eigensolver ─────────────────────

	describe("2. Cyclic Jacobi Symmetric Eigensolver", () => {
		it("decomposes an identity matrix", () => {
			const I3 = [
				[1, 0, 0],
				[0, 1, 0],
				[0, 0, 1],
			];
			const res = jacobiEigenSymmetric(I3, 3);
			assert.strictEqual(res.values.length, 3);
			for (let i = 0; i < 3; i++) {
				assert.ok(Math.abs(res.values[i]! - 1.0) < 1e-9);
			}
		});

		it("decomposes a diagonal matrix with known distinct eigenvalues", () => {
			const D = [
				[9.5, 0, 0],
				[0, 3.2, 0],
				[0, 0, -1.8],
			];
			const res = jacobiEigenSymmetric(D, 3);
			const sorted = [...res.values].sort((a, b) => a - b);
			assert.ok(Math.abs(sorted[0]! - -1.8) < 1e-6);
			assert.ok(Math.abs(sorted[1]! - 3.2) < 1e-6);
			assert.ok(Math.abs(sorted[2]! - 9.5) < 1e-6);
		});

		it("accurately diagonalizes an arbitrary symmetric matrix A * v = lambda * v", () => {
			const A = [
				[4, 2, 1],
				[2, 5, 3],
				[1, 3, 6],
			];
			const { values, vectors } = jacobiEigenSymmetric(A, 3);

			for (let col = 0; col < 3; col++) {
				const lambda = values[col]!;
				const v = [vectors[0]![col]!, vectors[1]![col]!, vectors[2]![col]!];
				// Matrix-vector product A * v
				const Av0 = A[0]![0]! * v[0]! + A[0]![1]! * v[1]! + A[0]![2]! * v[2]!;
				const Av1 = A[1]![0]! * v[0]! + A[1]![1]! * v[1]! + A[1]![2]! * v[2]!;
				const Av2 = A[2]![0]! * v[0]! + A[2]![1]! * v[1]! + A[2]![2]! * v[2]!;

				assert.ok(Math.abs(Av0 - lambda * v[0]!) < 1e-6, `A*v[0] = lambda*v[0] for col ${col}`);
				assert.ok(Math.abs(Av1 - lambda * v[1]!) < 1e-6, `A*v[1] = lambda*v[1] for col ${col}`);
				assert.ok(Math.abs(Av2 - lambda * v[2]!) < 1e-6, `A*v[2] = lambda*v[2] for col ${col}`);
			}

			// Check orthogonality of eigenvectors
			for (let i = 0; i < 3; i++) {
				for (let j = i + 1; j < 3; j++) {
					const dot =
						vectors[0]![i]! * vectors[0]![j]! +
						vectors[1]![i]! * vectors[1]![j]! +
						vectors[2]![i]! * vectors[2]![j]!;
					assert.ok(Math.abs(dot) < 1e-6, `eigenvector ${i} and ${j} are orthogonal`);
				}
			}
		});
	});

	// ── 3. Horn's Unit-Quaternion Kabsch Registration ───────────────

	describe("3. Horn Unit-Quaternion Rigid Registration (Kabsch)", () => {
		function applyKnownRigid(p: Vec3): Vec3 {
			// Rotation 90° about Z: (x, y, z) -> (-y, x, z), plus translation (5, -3, 2)
			return [-p[1] + 5, p[0] - 3, p[2] + 2];
		}

		it("recovers exact rotation + translation with RMS < 1e-6 mm", () => {
			const src: Vec3[] = [
				[0, 0, 0],
				[10, 0, 0],
				[0, 8, 0],
				[3, 4, 6],
			];
			const tgt = src.map(applyKnownRigid);

			const result = kabschTransformWithRms(src, tgt);
			assert.ok(result !== null, "kabschTransformWithRms should succeed for 4 non-collinear points");
			assert.ok(result.rmsMm < 1e-6, `RMS must be < 1e-6 mm for ideal transform, got ${result.rmsMm}`);
			assert.strictEqual(result.quality, "excellent");

			for (let i = 0; i < src.length; i++) {
				const transformed = applyMat4(result.matrix, src[i]!);
				const target = tgt[i]!;
				assert.ok(Math.abs(transformed[0] - target[0]) < 1e-4);
				assert.ok(Math.abs(transformed[1] - target[1]) < 1e-4);
				assert.ok(Math.abs(transformed[2] - target[2]) < 1e-4);
			}
		});

		it("recovers a pure 3D translation", () => {
			const src: Vec3[] = [
				[0, 0, 0],
				[15, 0, 0],
				[0, 12, 0],
				[5, 5, 8],
			];
			const offset: Vec3 = [7.5, -4.2, 11.0];
			const tgt: Vec3[] = src.map((p) => [p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]]);

			const m = kabschTransform(src, tgt);
			assert.ok(m !== null);
			const testPt = applyMat4(m, [1, 2, 3]);
			assert.ok(Math.abs(testPt[0] - (1 + 7.5)) < 1e-4);
			assert.ok(Math.abs(testPt[1] - (2 - 4.2)) < 1e-4);
			assert.ok(Math.abs(testPt[2] - (3 + 11.0)) < 1e-4);
		});

		it("returns null for degenerate landmark inputs (< 3 points or mismatched sizes)", () => {
			assert.strictEqual(kabschTransform([[0, 0, 0]], [[0, 0, 0]]), null);
			assert.strictEqual(kabschTransform([[0, 0, 0], [1, 1, 1]], [[0, 0, 0], [1, 1, 1]]), null);
			assert.strictEqual(
				kabschTransform(
					[[0, 0, 0], [1, 0, 0], [0, 1, 0]],
					[[0, 0, 0], [1, 0, 0]],
				),
				null,
			);
			assert.strictEqual(kabschTransformWithRms([[0, 0, 0]], [[0, 0, 0]]), null);
		});

		it("computes 3D centroid accurately", () => {
			const pts: Vec3[] = [
				[1, 2, 3],
				[4, 5, 6],
				[7, 8, 9],
			];
			const c = centroid(pts);
			assert.ok(Math.abs(c[0] - 4) < 1e-9);
			assert.ok(Math.abs(c[1] - 5) < 1e-9);
			assert.ok(Math.abs(c[2] - 6) < 1e-9);
		});
	});

	// ── 4. Registration Quality Classification ─────────────────────

	describe("4. Registration Quality Classification", () => {
		it("classifies RMS according to clinical CBCT surgical thresholds", () => {
			// RMS < 0.5 mm -> excellent
			assert.strictEqual(classifyRegistrationQuality(0.0), "excellent");
			assert.strictEqual(classifyRegistrationQuality(0.12), "excellent");
			assert.strictEqual(classifyRegistrationQuality(0.499), "excellent");

			// 0.5 mm <= RMS <= 1.0 mm -> acceptable
			assert.strictEqual(classifyRegistrationQuality(0.50), "acceptable");
			assert.strictEqual(classifyRegistrationQuality(0.70), "acceptable");
			assert.strictEqual(classifyRegistrationQuality(1.00), "acceptable");

			// RMS > 1.0 mm -> poor
			assert.strictEqual(classifyRegistrationQuality(1.001), "poor");
			assert.strictEqual(classifyRegistrationQuality(1.25), "poor");
			assert.strictEqual(classifyRegistrationQuality(3.50), "poor");
		});

		it("evaluates quality rating with simulated noise on landmark pairs", () => {
			const base: Vec3[] = [
				[0, 0, 0],
				[20, 0, 0],
				[0, 15, 0],
				[5, 5, 10],
				[-10, 8, 4],
			];

			// Small noise (< 0.5 mm error)
			const smallNoiseTgt: Vec3[] = base.map((p, i) => [
				p[0] + (i % 2 === 0 ? 0.2 : -0.2),
				p[1] + (i % 3 === 0 ? 0.2 : -0.1),
				p[2] + 0.1,
			]);
			const resSmall = kabschTransformWithRms(base, smallNoiseTgt)!;
			assert.ok(resSmall !== null);
			assert.ok(resSmall.rmsMm < 0.5);
			assert.strictEqual(resSmall.quality, "excellent");

			// Moderate noise (~0.7 mm error)
			const modNoiseTgt: Vec3[] = base.map((p, i) => [
				p[0] + (i % 2 === 0 ? 0.7 : -0.6),
				p[1] + (i % 3 === 0 ? 0.5 : -0.7),
				p[2] + 0.5,
			]);
			const resMod = kabschTransformWithRms(base, modNoiseTgt)!;
			assert.ok(resMod !== null);
			assert.ok(resMod.rmsMm >= 0.5 && resMod.rmsMm <= 1.0);
			assert.strictEqual(resMod.quality, "acceptable");

			// Excessive noise (> 1.0 mm error)
			const bigNoiseTgt: Vec3[] = base.map((p, i) => [
				p[0] + (i % 2 === 0 ? 2.5 : -2.0),
				p[1] + (i % 3 === 0 ? 1.8 : -2.2),
				p[2] + 2.0,
			]);
			const resBig = kabschTransformWithRms(base, bigNoiseTgt)!;
			assert.ok(resBig !== null);
			assert.ok(resBig.rmsMm > 1.0);
			assert.strictEqual(resBig.quality, "poor");
		});
	});

	// ── 5. Möller–Trumbore Ray-Triangle Picking ─────────────────────

	describe("5. Möller-Trumbore Ray-Triangle Picking", () => {
		const v0: Vec3 = [0, 0, 5];
		const v1: Vec3 = [10, 0, 5];
		const v2: Vec3 = [0, 10, 5];

		it("detects direct ray hit and computes exact distance", () => {
			const orig: Vec3 = [2, 2, 0];
			const dir: Vec3 = [0, 0, 1];
			const t = rayTriangleHit(orig, dir, v0, v1, v2);
			assert.ok(t !== null);
			assert.ok(Math.abs(t - 5.0) < 1e-6);
		});

		it("returns null when ray misses outside triangle", () => {
			const orig: Vec3 = [12, 12, 0];
			const dir: Vec3 = [0, 0, 1];
			const t = rayTriangleHit(orig, dir, v0, v1, v2);
			assert.strictEqual(t, null);
		});

		it("returns null when triangle is behind the ray origin", () => {
			const orig: Vec3 = [2, 2, 10];
			const dir: Vec3 = [0, 0, 1]; // pointing away from z = 5
			const t = rayTriangleHit(orig, dir, v0, v1, v2);
			assert.strictEqual(t, null);
		});

		it("picks nearest triangle from flat triangle soup mesh", () => {
			// Two triangles: T0 at z=5, T1 at z=3
			const soup = [
				// T0: z = 5
				0, 0, 5,  10, 0, 5,  0, 10, 5,
				// T1: z = 3 (closer)
				0, 0, 3,  10, 0, 3,  0, 10, 3,
			];
			const hit = pickMeshRay([1, 1, 0], [0, 0, 1], soup);
			assert.ok(hit !== null);
			assert.strictEqual(hit.triangleIndex, 1);
			assert.ok(Math.abs(hit.distance - 3.0) < 1e-6);
			assert.ok(Math.abs(hit.point[2] - 3.0) < 1e-6);
		});

		it("picks nearest triangle from indexed mesh buffers", () => {
			const positions = [
				// vertex 0, 1, 2 (triangle 0 at z = 10)
				0, 0, 10,  10, 0, 10,  0, 10, 10,
				// vertex 3, 4, 5 (triangle 1 at z = 4)
				0, 0, 4,   10, 0, 4,   0, 10, 4,
			];
			const indices = [0, 1, 2, 3, 4, 5];

			const hit = pickMeshRay([2, 2, 0], [0, 0, 1], positions, indices);
			assert.ok(hit !== null);
			assert.strictEqual(hit.triangleIndex, 1);
			assert.ok(Math.abs(hit.distance - 4.0) < 1e-6);
			assert.ok(Math.abs(hit.point[0] - 2.0) < 1e-6);
			assert.ok(Math.abs(hit.point[1] - 2.0) < 1e-6);
			assert.ok(Math.abs(hit.point[2] - 4.0) < 1e-6);
		});

		it("returns null when pickMeshRay misses all mesh triangles", () => {
			const soup = [0, 0, 5, 10, 0, 5, 0, 10, 5];
			const hit = pickMeshRay([50, 50, 0], [0, 0, 1], soup);
			assert.strictEqual(hit, null);
		});
	});

	// ── 6. PCA Tooth Shape Analysis ────────────────────────────────

	describe("6. PCA Tooth Shape Analysis", () => {
		it("detects principal long axis aligned with Z for an elongated ellipsoid cloud", () => {
			// Synthetic elongated tooth crown:
			// X and Y spread within [-1, 1], Z spread within [-8, 8]
			const pts: number[] = [];
			for (let z = -8; z <= 8; z += 0.5) {
				const rad = 1.0 - (z * z) / 100; // taper at ends
				for (let a = 0; a < 8; a++) {
					const angle = (a * Math.PI) / 4;
					pts.push(
						rad * Math.cos(angle) * 0.8,
						rad * Math.sin(angle) * 0.7,
						z,
					);
				}
			}

			const pa = principalAxis(pts);
			assert.ok(pa !== null, "PCA should return valid PrincipalAxis");
			// Axis must be predominantly along Z
			assert.ok(
				Math.abs(pa.axis[2]) > 0.98,
				`Principal axis must align with Z (|axis[2]| > 0.98), got ${pa.axis[2]}`,
			);
			assert.ok(Math.abs(pa.axis[0]) < 0.15);
			assert.ok(Math.abs(pa.axis[1]) < 0.15);

			// Extent should be close to 16 mm (-8 to +8)
			assert.ok(
				Math.abs(pa.extent - 16.0) < 1.0,
				`Extent must be ~16 mm, got ${pa.extent}`,
			);
			// Centroid should be near origin
			assert.ok(Math.abs(pa.centroid[0]) < 0.1);
			assert.ok(Math.abs(pa.centroid[1]) < 0.1);
			assert.ok(Math.abs(pa.centroid[2]) < 0.1);
		});

		it("returns null for fewer than 3 points", () => {
			assert.strictEqual(principalAxis([]), null);
			assert.strictEqual(principalAxis([1, 2, 3]), null);
			assert.strictEqual(principalAxis([1, 2, 3, 4, 5, 6]), null);
		});
	});

	// ── 7. Prosthetic Tooth Setup & Implant Placement ──────────────

	describe("7. Prosthetically-Driven Implant Suggestion", () => {
		// Arch along y = 5
		const arch: Point2[] = [
			[-10, 5],
			[0, 5],
			[10, 5],
			[20, 5],
			[30, 5],
		];

		// Local arch frame for verification
		const testFrame: ArchFrame = {
			point: [10, 5],
			normal: [0, 1], // +Y
			tangent: [1, 0], // +X
			s: 20,
		};

		it("round-trips anglesFromWorldAxis through implantAxis", () => {
			for (const bl of [-35, -15, 0, 15, 45, 165]) {
				for (const md of [-20, -5, 0, 10, 25]) {
					const worldVec = implantAxis(testFrame, bl, md);
					const recovered = anglesFromWorldAxis(testFrame, worldVec);
					const roundTripVec = implantAxis(testFrame, recovered.angleBLDeg, recovered.angleMDDeg);

					assert.ok(
						Math.abs(roundTripVec[0] - worldVec[0]) < 1e-4,
						`X roundtrip match for BL=${bl}, MD=${md}`,
					);
					assert.ok(
						Math.abs(roundTripVec[1] - worldVec[1]) < 1e-4,
						`Y roundtrip match for BL=${bl}, MD=${md}`,
					);
					assert.ok(
						Math.abs(roundTripVec[2] - worldVec[2]) < 1e-4,
						`Z roundtrip match for BL=${bl}, MD=${md}`,
					);
				}
			}
		});

		it("generates mandibular implant position (apex down -Z) from vertical crown", () => {
			// Tooth cluster centered at (10, 5, 20), height 10 mm (z from 15 to 25)
			const pts: number[] = [];
			for (let z = -5; z <= 5; z += 1) {
				pts.push(10 + 0.2 * (z % 2), 5 - 0.1 * (z % 3), 20 + z);
			}

			const suggestion = suggestImplantFromCrown(arch, pts, { apexUp: false });
			assert.ok(suggestion !== null);

			// Mandible: apex should point down (-Z)
			assert.ok(suggestion.axis[2] < 0, "Apex direction must point into bone (-Z for mandible)");

			// Platform should be at the apical end (z <= 15.5)
			assert.ok(
				suggestion.position[2] <= 15.5,
				`Platform Z should be at apical end (<= 15.5), got ${suggestion.position[2]}`,
			);
			assert.ok(Math.abs(suggestion.position[0] - 10) < 1.0);
			assert.ok(Math.abs(suggestion.position[1] - 5) < 1.0);

			// Tilt angles should be small for vertical tooth
			assert.ok(Math.abs(suggestion.angleBLDeg) < 15);
			assert.ok(Math.abs(suggestion.angleMDDeg) < 15);
		});

		it("generates maxillary implant position (apex up +Z) when apexUp: true", () => {
			const pts: number[] = [];
			for (let z = -5; z <= 5; z += 1) {
				pts.push(10 + 0.2 * (z % 2), 5 - 0.1 * (z % 3), 20 + z);
			}

			const suggDown = suggestImplantFromCrown(arch, pts, { apexUp: false })!;
			const suggUp = suggestImplantFromCrown(arch, pts, { apexUp: true })!;

			assert.ok(suggDown !== null && suggUp !== null);

			// Maxilla: apex should point up (+Z)
			assert.ok(suggUp.axis[2] > 0, "Apex direction must point up (+Z for maxilla)");
			// Maxilla platform sits at higher Z than mandible platform
			assert.ok(
				suggUp.position[2] > suggDown.position[2],
				`Maxillary platform Z (${suggUp.position[2]}) must be > mandibular platform Z (${suggDown.position[2]})`,
			);
		});
	});

	// ── 8. Form 043/u A4 Clinical Protocol & Zero Emoji Law ────────

	describe("8. Form 043/u A4 Protocol & 0 Emoji Law (Mandate 8d #7)", () => {
		it("formats full A4 protocol with clinical verdict and transform matrix", () => {
			const mockCrown: CrownImplantSuggestion = {
				position: [12.4, 5.2, 14.8],
				angleBLDeg: 4.5,
				angleMDDeg: -2.1,
				axis: [0.03, 0.08, -0.99],
				centroid: [12.4, 5.2, 19.8],
				extentMm: 10.0,
			};

			const protocol = formatScanRegistrationA4Protocol({
				clinicName: "Клиника Дента-Люкс",
				patientName: "Барабаш С.В.",
				doctorName: "д-р Смирнов А.П.",
				toothNumber: 46,
				landmarkCount: 4,
				rmsMm: 0.3124,
				quality: "excellent",
				transformMatrix: IDENTITY4,
				crownSuggestion: mockCrown,
				clinicalNotes: "Зона первого моляра нижней челюсти справа, плотный кортикал.",
			});

			assert.ok(protocol.includes("КЛИНИКА ДЕНТА-ЛЮКС"));
			assert.ok(protocol.includes("Барабаш С.В."));
			assert.ok(protocol.includes("д-р Смирнов А.П."));
			assert.ok(protocol.includes("Зуб FDI 46"));
			assert.ok(protocol.includes("0.3124 мм"));
			assert.ok(protocol.includes("ОТЛИЧНОЕ (RMS < 0.500 мм)"));
			assert.ok(protocol.includes("[ДОПУЩЕНО К ИЗГОТОВЛЕНИЮ ХИРУРГИЧЕСКОГО ШАБЛОНА]"));
			assert.ok(protocol.includes("Матрица жесткой трансформации"));
			assert.ok(protocol.includes("Вестибуло-оральный наклон (BL)"));
			assert.ok(protocol.includes("4.50 град."));
			assert.ok(protocol.includes("-2.10 град."));
		});

		it("outputs appropriate warning text when registration quality is poor", () => {
			const protocol = formatScanRegistrationA4Protocol({
				patientName: "Петров И.Н.",
				doctorName: "д-р Кузнецов",
				rmsMm: 1.45,
				quality: "poor",
			});
			assert.ok(protocol.includes("НИЗКАЯ ТОЧНОСТЬ (RMS > 1.000 мм)"));
			assert.ok(protocol.includes("[ВНИМАНИЕ: ТРЕБУЕТСЯ ПОВТОРНАЯ РАССТАНОВКА РЕПЕРОВ]"));
			assert.ok(protocol.includes("Категорически запрещено использовать текущую матрицу"));
		});

		it("STRICT AUDIT: 0 emojis across all output lines (Mandate 8d item 7)", () => {
			const protocols = [
				formatScanRegistrationA4Protocol({
					patientName: "Иванов А.А.",
					doctorName: "д-р Врач",
					rmsMm: 0.2,
					quality: "excellent",
				}),
				formatScanRegistrationA4Protocol({
					patientName: "Сидорова Е.В.",
					doctorName: "д-р Терапевт",
					rmsMm: 0.75,
					quality: "acceptable",
				}),
				formatScanRegistrationA4Protocol({
					patientName: "Козлов Д.М.",
					doctorName: "д-р Хирург",
					rmsMm: 1.8,
					quality: "poor",
				}),
			];

			// Comprehensive Unicode regex detecting pictographs, emojis, and decorative symbols
			const emojiRegex =
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/u;

			for (const p of protocols) {
				assert.strictEqual(
					emojiRegex.test(p),
					false,
					"Protocol must contain strictly 0 emojis per Mandate 8d #7",
				);
			}
		});
	});
});
