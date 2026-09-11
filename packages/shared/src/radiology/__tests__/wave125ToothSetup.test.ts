/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 125: TOOTH SETUP & PROSTHETICALLY-DRIVEN IMPLANT PLANNING TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive unit tests for:
 * 1. principalAxis:
 *    - Elongated cuboid along Z axis (exact long axis and extent recovery)
 *    - Translation / centroid independence
 *    - < 3 points validation (returns null)
 * 2. anglesFromWorldAxis:
 *    - Direct & inverse round-trip with implantAxis (BL and MD angles)
 *    - Mandible (apex down) and maxilla (apex up) clinical angles
 *    - Arbitrary rotated arch frames
 * 3. orientAxisByBone:
 *    - Apical vector selection towards denser Hounsfield bone
 *    - Inversion when negative direction has higher density
 * 4. suggestImplantFromMesh:
 *    - Platform placement at apical end of crown
 *    - Default mandible (apex down) vs maxilla (apex up)
 *    - Automated bone density orientation with volumetric sampling
 *    - Degenerate inputs (< 3 points or invalid arch)
 * 5. Strict absence of cartoon emojis (Mandate 8d, item 7)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	principalAxis,
	anglesFromWorldAxis,
	orientAxisByBone,
	suggestImplantFromMesh,
	type PrincipalAxis,
	type CrownSuggestion,
} from "../toothSetupEngine.js";
import {
	implantAxis,
	type ArchFrame,
	type Vec3,
} from "../cbctSafetyEngine.js";
import type { Point2, VolumeSamplingData } from "../cprMath.js";

/** Helper to construct a synthetic volumetric sampling dataset */
function createSyntheticVolume(
	field: (i: number, j: number, k: number) => number,
	dims: [number, number, number] = [50, 50, 50],
	spacing: [number, number, number] = [1, 1, 1],
	origin: [number, number, number] = [0, 0, 0],
): VolumeSamplingData {
	return {
		dims,
		origin,
		getVoxel: field,
		invSx: 1 / spacing[0],
		invSy: 1 / spacing[1],
		invSz: 1 / spacing[2],
		zMin: origin[2],
		zMax: origin[2] + (dims[2] - 1) * spacing[2],
		vSpacing: spacing[2],
	};
}

describe("Wave 125: Tooth Setup & Prosthetically-Driven Implant Planning Engine", () => {
	// ── 1. principalAxis Tests ───────────────────────────────────

	describe("1. principalAxis (PCA Long Axis & Spread)", () => {
		it("returns null for empty array or point sets with fewer than 3 points", () => {
			assert.strictEqual(principalAxis([]), null);
			assert.strictEqual(principalAxis([1, 2, 3]), null);
			assert.strictEqual(principalAxis([1, 2, 3, 4, 5, 6]), null);
			assert.strictEqual(principalAxis(new Float32Array(0)), null);
			assert.strictEqual(principalAxis(new Float32Array([10, 20, 30, 40, 50])), null);
		});

		it("recovers exact Z axis and extent for an elongated cuboid along Z", () => {
			// Points distributed along X in [-1, 1], Y in [-1, 1], Z in [-10, 10]
			const pts: number[] = [];
			for (let z = -10; z <= 10; z += 2) {
				for (let y = -1; y <= 1; y += 1) {
					for (let x = -1; x <= 1; x += 1) {
						pts.push(x, y, z);
					}
				}
			}

			const res = principalAxis(pts);
			assert.ok(res !== null, "Result must not be null");

			// Centroid should be exactly [0, 0, 0]
			assert.ok(Math.abs(res.centroid[0]) < 1e-6, `Centroid X ${res.centroid[0]} should be 0`);
			assert.ok(Math.abs(res.centroid[1]) < 1e-6, `Centroid Y ${res.centroid[1]} should be 0`);
			assert.ok(Math.abs(res.centroid[2]) < 1e-6, `Centroid Z ${res.centroid[2]} should be 0`);

			// Principal axis must be aligned with Z axis ([0, 0, 1] or [0, 0, -1])
			assert.ok(Math.abs(res.axis[0]) < 1e-6, `Axis X ${res.axis[0]} should be 0`);
			assert.ok(Math.abs(res.axis[1]) < 1e-6, `Axis Y ${res.axis[1]} should be 0`);
			assert.ok(
				Math.abs(Math.abs(res.axis[2]) - 1) < 1e-6,
				`Axis Z magnitude ${Math.abs(res.axis[2])} should be 1`,
			);

			// Extent should match the total Z span: 10 - (-10) = 20
			assert.ok(Math.abs(res.extent - 20) < 1e-6, `Extent ${res.extent} should be 20`);
		});

		it("is invariant to global translation / offset", () => {
			const offsetX = 42;
			const offsetY = -88;
			const offsetZ = 200;
			const pts: number[] = [];
			for (let z = -10; z <= 10; z += 2) {
				for (let y = -1; y <= 1; y += 1) {
					for (let x = -1; x <= 1; x += 1) {
						pts.push(x + offsetX, y + offsetY, z + offsetZ);
					}
				}
			}

			const res = principalAxis(pts);
			assert.ok(res !== null);

			assert.ok(Math.abs(res.centroid[0] - offsetX) < 1e-6);
			assert.ok(Math.abs(res.centroid[1] - offsetY) < 1e-6);
			assert.ok(Math.abs(res.centroid[2] - offsetZ) < 1e-6);

			assert.ok(Math.abs(res.axis[0]) < 1e-6);
			assert.ok(Math.abs(res.axis[1]) < 1e-6);
			assert.ok(Math.abs(Math.abs(res.axis[2]) - 1) < 1e-6);
			assert.ok(Math.abs(res.extent - 20) < 1e-6);
		});

		it("identifies principal axis along X when elongated along X", () => {
			const pts: number[] = [];
			for (let x = -25; x <= 25; x += 5) {
				for (let y = -2; y <= 2; y += 2) {
					for (let z = -2; z <= 2; z += 2) {
						pts.push(x, y, z);
					}
				}
			}

			const res = principalAxis(pts);
			assert.ok(res !== null);
			assert.ok(Math.abs(Math.abs(res.axis[0]) - 1) < 1e-6);
			assert.ok(Math.abs(res.axis[1]) < 1e-6);
			assert.ok(Math.abs(res.axis[2]) < 1e-6);
			assert.ok(Math.abs(res.extent - 50) < 1e-6);
		});
	});

	// ── 2. anglesFromWorldAxis Tests ─────────────────────────────

	describe("2. anglesFromWorldAxis (Inverse Arch Frame Angles)", () => {
		const standardFrame: ArchFrame = {
			s: 0.5,
			point: [0, 0],
			normal: [0, 1],
			tangent: [1, 0],
		};

		it("correctly round-trips with implantAxis for standard vertical mandible (0, 0)", () => {
			const axis = implantAxis(standardFrame, 0, 0);
			// For (0, 0), apex is down along -Z: [0, 0, -1]
			assert.ok(Math.abs(axis[0]) < 1e-6);
			assert.ok(Math.abs(axis[1]) < 1e-6);
			assert.ok(Math.abs(axis[2] - (-1)) < 1e-6);

			const recovered = anglesFromWorldAxis(standardFrame, axis);
			assert.ok(Math.abs(recovered.angleBLDeg - 0) < 1e-5);
			assert.ok(Math.abs(recovered.angleMDDeg - 0) < 1e-5);
		});

		it("correctly round-trips for standard vertical maxilla (180, 0)", () => {
			const axis = implantAxis(standardFrame, 180, 0);
			// For (180, 0), apex is up along +Z: [0, 0, 1]
			assert.ok(Math.abs(axis[0]) < 1e-6);
			assert.ok(Math.abs(axis[1]) < 1e-6);
			assert.ok(Math.abs(axis[2] - 1) < 1e-6);

			const recovered = anglesFromWorldAxis(standardFrame, axis);
			assert.ok(Math.abs(recovered.angleBLDeg - 180) < 1e-5);
			assert.ok(Math.abs(recovered.angleMDDeg - 0) < 1e-5);
		});

		it("round-trips various clinical tilt angles in mandible and maxilla", () => {
			const testAngles: Array<[number, number]> = [
				[15, 10],
				[-20, -15],
				[30, -25],
				[-10, 5],
				[165, 12],
				[-170, -8],
				[150, -20],
			];

			for (const [bl, md] of testAngles) {
				const axis = implantAxis(standardFrame, bl, md);
				const recovered = anglesFromWorldAxis(standardFrame, axis);
				assert.ok(
					Math.abs(recovered.angleBLDeg - bl) < 1e-4,
					`BL failed for (${bl}, ${md}): got ${recovered.angleBLDeg}`,
				);
				assert.ok(
					Math.abs(recovered.angleMDDeg - md) < 1e-4,
					`MD failed for (${bl}, ${md}): got ${recovered.angleMDDeg}`,
				);
			}
		});

		it("round-trips on an arbitrary 45-degree rotated arch frame", () => {
			const rotatedFrame: ArchFrame = {
				s: 0.25,
				point: [10, 10],
				normal: [Math.SQRT1_2, Math.SQRT1_2],
				tangent: [Math.SQRT1_2, -Math.SQRT1_2],
			};

			const testAngles: Array<[number, number]> = [
				[0, 0],
				[180, 0],
				[12, -7],
				[-18, 14],
				[168, -11],
			];

			for (const [bl, md] of testAngles) {
				const axis = implantAxis(rotatedFrame, bl, md);
				const recovered = anglesFromWorldAxis(rotatedFrame, axis);
				assert.ok(
					Math.abs(recovered.angleBLDeg - bl) < 1e-4,
					`Rotated BL failed for (${bl}, ${md}): got ${recovered.angleBLDeg}`,
				);
				assert.ok(
					Math.abs(recovered.angleMDDeg - md) < 1e-4,
					`Rotated MD failed for (${bl}, ${md}): got ${recovered.angleMDDeg}`,
				);
			}
		});

		it("handles non-normalized axis inputs safely", () => {
			const axisUnnormalized: Vec3 = [0, 0, -4.5];
			const recovered = anglesFromWorldAxis(standardFrame, axisUnnormalized);
			assert.ok(Math.abs(recovered.angleBLDeg - 0) < 1e-5);
			assert.ok(Math.abs(recovered.angleMDDeg - 0) < 1e-5);
		});
	});

	// ── 3. orientAxisByBone Tests ────────────────────────────────

	describe("3. orientAxisByBone (Bone Density Sampling)", () => {
		it("maintains axis direction when positive direction has denser bone", () => {
			const centroid: Vec3 = [0, 0, 0];
			const axis: Vec3 = [0, 0, 1];
			const extent = 10; // base = 5, samples at z = 7, 9, 11, 13 vs -7, -9, -11, -13

			// Positive side is dense bone (800 HU), negative side is air (-1000 HU)
			const huAt = (p: Vec3) => (p[2] > 0 ? 800 : -1000);

			const oriented = orientAxisByBone(centroid, axis, extent, huAt);
			assert.deepStrictEqual(oriented, [0, 0, 1]);
		});

		it("inverts axis direction when negative direction has denser bone", () => {
			const centroid: Vec3 = [0, 0, 0];
			const axis: Vec3 = [0, 0, 1];
			const extent = 10;

			// Negative side is dense bone (800 HU), positive side is air (-1000 HU)
			const huAt = (p: Vec3) => (p[2] > 0 ? -1000 : 800);

			const oriented = orientAxisByBone(centroid, axis, extent, huAt);
			assert.deepStrictEqual(oriented, [-0, -0, -1]);
			assert.ok(Math.abs(oriented[2] - (-1)) < 1e-6);
		});
	});

	// ── 4. suggestImplantFromMesh Tests ──────────────────────────

	describe("4. suggestImplantFromMesh (Crown Setup Suggestion)", () => {
		const archPoints: Point2[] = [
			[-20, 20],
			[-15, 0],
			[0, -10],
			[15, 0],
			[20, 20],
		];

		// Create synthetic crown mesh centered around [15, 0, 5], vertical span from z = 0 to 10
		function createCrownMesh(): number[] {
			const pts: number[] = [];
			for (let z = 0; z <= 10; z += 1) {
				for (let dy = -1.5; dy <= 1.5; dy += 1) {
					for (let dx = -1.5; dx <= 1.5; dx += 1) {
						pts.push(15 + dx, dy, z);
					}
				}
			}
			return pts;
		}

		it("returns null when positions have fewer than 3 points", () => {
			assert.strictEqual(suggestImplantFromMesh(archPoints, [1, 2, 3]), null);
		});

		it("returns null when arch control points are insufficient (< 2 points)", () => {
			const crown = createCrownMesh();
			assert.strictEqual(suggestImplantFromMesh([], crown), null);
			assert.strictEqual(suggestImplantFromMesh([[0, 0]], crown), null);
		});

		it("suggests implant platform at apical end with default apex down (mandible)", () => {
			const crown = createCrownMesh();
			const suggestion = suggestImplantFromMesh(archPoints, crown);

			assert.ok(suggestion !== null, "Suggestion must not be null");

			// Crown centroid is at [15, 0, 5], extent is 10.
			// Default apex down (-Z): axis is [0, 0, -1].
			// Platform = centroid + axis * (extent / 2) = [15, 0, 5] + [0, 0, -1] * 5 = [15, 0, 0].
			assert.ok(
				Math.abs(suggestion.position[0] - 15) < 1e-3,
				`Expected X ≈ 15, got ${suggestion.position[0]}`,
			);
			assert.ok(
				Math.abs(suggestion.position[1] - 0) < 1e-3,
				`Expected Y ≈ 0, got ${suggestion.position[1]}`,
			);
			assert.ok(
				Math.abs(suggestion.position[2] - 0) < 1e-3,
				`Expected Z ≈ 0, got ${suggestion.position[2]}`,
			);

			// For vertical mandible implant, BL and MD angles should be close to 0
			assert.ok(
				Math.abs(suggestion.angleBLDeg) < 1.0,
				`Expected BL ≈ 0, got ${suggestion.angleBLDeg}`,
			);
			assert.ok(
				Math.abs(suggestion.angleMDDeg) < 1.0,
				`Expected MD ≈ 0, got ${suggestion.angleMDDeg}`,
			);
		});

		it("suggests implant platform at apical end with apex up (maxilla)", () => {
			const crown = createCrownMesh();
			const suggestion = suggestImplantFromMesh(archPoints, crown, { apexUp: true });

			assert.ok(suggestion !== null);

			// Crown centroid is at [15, 0, 5], extent is 10.
			// Apex up (+Z): axis is [0, 0, 1].
			// Platform = centroid + axis * (extent / 2) = [15, 0, 5] + [0, 0, 1] * 5 = [15, 0, 10].
			assert.ok(Math.abs(suggestion.position[0] - 15) < 1e-3);
			assert.ok(Math.abs(suggestion.position[1] - 0) < 1e-3);
			assert.ok(Math.abs(suggestion.position[2] - 10) < 1e-3);

			// Apex up corresponds to BL ≈ 180°
			assert.ok(
				Math.abs(suggestion.angleBLDeg - 180) < 1.0,
				`Expected BL ≈ 180, got ${suggestion.angleBLDeg}`,
			);
		});

		it("auto-detects apical direction using volumetric HU data", () => {
			const crown = createCrownMesh();

			// Volume where bone is below z = 0 (lower jaw, mandible)
			// World coordinates mapping: origin = [0, -25, -25], dims = [50, 50, 50], spacing = [1, 1, 1]
			// z < 0 has bone (800 HU), z >= 0 has air (-1000 HU)
			const vol = createSyntheticVolume(
				(i, j, k) => {
					const worldZ = -25 + k;
					return worldZ < 0 ? 800 : -1000;
				},
				[50, 50, 50],
				[1, 1, 1],
				[0, -25, -25],
			);

			const suggestion = suggestImplantFromMesh(archPoints, crown, { vol });
			assert.ok(suggestion !== null);

			// Since bone is below z = 0, axis points down (-Z), platform at z = 0
			assert.ok(Math.abs(suggestion.position[2] - 0) < 1e-3);
			assert.ok(Math.abs(suggestion.angleBLDeg) < 1.0);
		});
	});

	// ── 5. Absence of Cartoon Emojis ─────────────────────────────

	describe("5. Zero Cartoon Emojis (Mandate 8d, item 7)", () => {
		it("strictly contains zero cartoon emojis in toothSetupEngine.ts", () => {
			const sourceCode = readFileSync(
				resolve(import.meta.dirname, "../toothSetupEngine.ts"),
				"utf-8",
			);
			const emojiRegex =
				/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
			assert.strictEqual(
				emojiRegex.test(sourceCode),
				false,
				"toothSetupEngine.ts must not contain cartoon emojis",
			);
		});

		it("strictly contains zero cartoon emojis in wave125ToothSetup.test.ts", () => {
			const testCode = readFileSync(
				resolve(import.meta.dirname, "wave125ToothSetup.test.ts"),
				"utf-8",
			);
			const emojiRegex =
				/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
			assert.strictEqual(
				emojiRegex.test(testCode),
				false,
				"wave125ToothSetup.test.ts must not contain cartoon emojis",
			);
		});
	});
});
