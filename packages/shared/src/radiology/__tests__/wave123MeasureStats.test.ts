/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 123: CBCT MEASURE STATS, HU LINE PROFILE & DENSITOMETRY TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive unit tests for:
 * 1. ROI statistics (roiStats): empty array, single value, known population SD
 * 2. Continuous volumetric line profiling (lineProfileHU) over linear gradients
 * 3. 2D/3D angular measurements (angleDeg): 90°, 180°, 45°, 0°, degenerate rays
 * 4. Carl Misch implant bed densitometry (calculateImplantBedDensitometry):
 *    - D1, D2, D3, D4 classifications
 *    - Cortical thickness measurement
 *    - Trabecular core mean density
 *    - warningLowDensity triggers (< 350 HU trabecular or < 150 HU min)
 * 5. Strict absence of cartoon emojis (Mandate 8d item 7)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	roiStats,
	lineProfileHU,
	angleDeg,
	calculateImplantBedDensitometry,
	type RoiStats,
	type ImplantBedDensitometry,
	type Vec3,
} from "../measureStatsEngine.js";
import type { VolumeSamplingData } from "../cprMath.js";
import { AIR_HU } from "../cprMath.js";

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

describe("Wave 123: CBCT Measure Stats, HU Line Profile & Densitometry Engine", () => {
	// ── 1. roiStats Tests ────────────────────────────────────────

	describe("1. roiStats (Population Statistics)", () => {
		it("returns null for an empty array or empty typed array", () => {
			assert.strictEqual(roiStats([]), null);
			assert.strictEqual(roiStats(new Float32Array(0)), null);
			assert.strictEqual(roiStats(new Int16Array(0)), null);
		});

		it("correctly computes statistics for a single element array", () => {
			const res = roiStats([42]);
			assert.ok(res !== null);
			assert.strictEqual(res.count, 1);
			assert.strictEqual(res.mean, 42);
			assert.strictEqual(res.stdDev, 0);
			assert.strictEqual(res.min, 42);
			assert.strictEqual(res.max, 42);
		});

		it("computes exact population mean, stdDev, min, max for known numbers [0, 1, 2, 3, 4]", () => {
			const res = roiStats([0, 1, 2, 3, 4]);
			assert.ok(res !== null);
			assert.strictEqual(res.count, 5);
			assert.strictEqual(res.mean, 2);
			assert.strictEqual(res.min, 0);
			assert.strictEqual(res.max, 4);
			// Population SD: sqrt(10 / 5) = sqrt(2)
			assert.ok(Math.abs(res.stdDev - Math.SQRT2) < 1e-10);
		});

		it("handles identical values with zero standard deviation", () => {
			const res = roiStats([750, 750, 750, 750]);
			assert.ok(res !== null);
			assert.strictEqual(res.count, 4);
			assert.strictEqual(res.mean, 750);
			assert.strictEqual(res.stdDev, 0);
			assert.strictEqual(res.min, 750);
			assert.strictEqual(res.max, 750);
		});

		it("handles negative and wide-range Hounsfield values correctly", () => {
			const res = roiStats([-1000, 0, 1000]);
			assert.ok(res !== null);
			assert.strictEqual(res.count, 3);
			assert.strictEqual(res.mean, 0);
			assert.strictEqual(res.min, -1000);
			assert.strictEqual(res.max, 1000);
			// sse = (-1000)^2 + 0^2 + 1000^2 = 2,000,000; stdDev = sqrt(2,000,000 / 3) ≈ 816.49658
			const expectedSD = Math.sqrt(2000000 / 3);
			assert.ok(Math.abs(res.stdDev - expectedSD) < 1e-6);
		});
	});

	// ── 2. lineProfileHU Tests ───────────────────────────────────

	describe("2. lineProfileHU (Volumetric 3D Line Profiling)", () => {
		it("samples a linear gradient along X axis with mathematical exactness", () => {
			const vol = createSyntheticVolume((i) => 10 * i);
			const p = lineProfileHU(vol, [0, 5, 5], [20, 5, 5], 21);

			assert.strictEqual(p.length, 21);
			for (let idx = 0; idx < p.length; idx++) {
				const val = p[idx] ?? 0;
				assert.ok(
					Math.abs(val - idx * 10) < 1e-5,
					`Expected ${idx * 10}, got ${val} at index ${idx}`,
				);
			}
		});

		it("samples along Z axis (f(i, j, k) = 50 + 20 * k)", () => {
			const vol = createSyntheticVolume((_i, _j, k) => 50 + 20 * k);
			const p = lineProfileHU(vol, [3, 3, 0], [3, 3, 10], 11);

			assert.strictEqual(p.length, 11);
			for (let idx = 0; idx < p.length; idx++) {
				const val = p[idx] ?? 0;
				assert.ok(
					Math.abs(val - (50 + 20 * idx)) < 1e-5,
					`Expected ${50 + 20 * idx}, got ${val} at index ${idx}`,
				);
			}
		});

		it("preserves trilinear precision along an arbitrary 3D diagonal path", () => {
			// Linear field in 3D: f(i, j, k) = 2*i + 3*j + 5*k
			const vol = createSyntheticVolume((i, j, k) => 2 * i + 3 * j + 5 * k);
			const p = lineProfileHU(vol, [0, 0, 0], [10, 10, 10], 11);

			assert.strictEqual(p.length, 11);
			// At sample t = idx / 10: x = idx, y = idx, z = idx -> f = (2 + 3 + 5) * idx = 10 * idx
			for (let idx = 0; idx < p.length; idx++) {
				const val = p[idx] ?? 0;
				assert.ok(
					Math.abs(val - 10 * idx) < 1e-5,
					`Expected ${10 * idx}, got ${val} at index ${idx}`,
				);
			}
		});

		it("clamps sample count to at least 2 samples", () => {
			const vol = createSyntheticVolume(() => 500);
			const p1 = lineProfileHU(vol, [0, 0, 0], [10, 0, 0], 1);
			assert.strictEqual(p1.length, 2);

			const p0 = lineProfileHU(vol, [0, 0, 0], [10, 0, 0], -5);
			assert.strictEqual(p0.length, 2);
		});

		it("returns AIR_HU (-1024) sentinel for points outside volume boundaries", () => {
			const vol = createSyntheticVolume(() => 600);
			// Start inside [5, 5, 5], end outside [100, 5, 5] where dims are [50, 50, 50]
			const p = lineProfileHU(vol, [5, 5, 5], [100, 5, 5], 5);
			assert.strictEqual(p.length, 5);
			// First sample is inside -> 600 HU
			assert.ok(Math.abs((p[0] ?? 0) - 600) < 1e-4);
			// Last sample is far outside -> AIR_HU
			assert.strictEqual(p[4], AIR_HU);
		});
	});

	// ── 3. angleDeg Tests ────────────────────────────────────────

	describe("3. angleDeg (2D and 3D Trajectory Angles)", () => {
		it("measures 90° right angle in 2D", () => {
			const angle = angleDeg([1, 0], [0, 0], [0, 1]);
			assert.ok(Math.abs(angle - 90) < 1e-6);
		});

		it("measures 180° straight angle in 2D", () => {
			const angle = angleDeg([1, 0], [0, 0], [-1, 0]);
			assert.ok(Math.abs(angle - 180) < 1e-6);
		});

		it("measures 45° angle in 2D", () => {
			const angle = angleDeg([1, 0], [0, 0], [1, 1]);
			assert.ok(Math.abs(angle - 45) < 1e-6);
		});

		it("measures 0° angle for coincident rays", () => {
			const angle = angleDeg([1, 0], [0, 0], [1, 0]);
			assert.ok(Math.abs(angle - 0) < 1e-6);
		});

		it("measures 90° in 3D orthogonal coordinate axes", () => {
			const angle = angleDeg([0, 0, 10], [0, 0, 0], [0, 10, 0]);
			assert.ok(Math.abs(angle - 90) < 1e-6);
		});

		it("measures 180° in 3D opposite directions", () => {
			const angle = angleDeg([5, 0, 0], [0, 0, 0], [-5, 0, 0]);
			assert.ok(Math.abs(angle - 180) < 1e-6);
		});

		it("safely returns 0 when vertex is coincident with ray endpoint (zero length ray)", () => {
			assert.strictEqual(angleDeg([0, 0, 0], [0, 0, 0], [1, 0, 0]), 0);
			assert.strictEqual(angleDeg([1, 0, 0], [0, 0, 0], [0, 0, 0]), 0);
			assert.strictEqual(angleDeg([0, 0, 0], [0, 0, 0], [0, 0, 0]), 0);
		});
	});

	// ── 4. calculateImplantBedDensitometry Tests ──────────────────

	describe("4. calculateImplantBedDensitometry (Misch D1–D4, Cortical & Trabecular)", () => {
		it("analyzes dense cortical D1 implant bed (> 1250 HU, 1400 HU)", () => {
			const vol = createSyntheticVolume(() => 1400);
			const crest: Vec3 = [10, 10, 0];
			const apex: Vec3 = [10, 10, 10]; // length 10 mm

			const result = calculateImplantBedDensitometry(vol, crest, apex, 11);

			assert.strictEqual(result.boneClass, "D1");
			assert.strictEqual(result.profile.length, 11);
			assert.strictEqual(result.stats.mean, 1400);
			assert.strictEqual(result.corticalThicknessMm, 10); // entire bed is cortical
			assert.strictEqual(result.trabecularMeanHU, 1400);
			assert.strictEqual(result.warningLowDensity, false);
		});

		it("analyzes D2 implant bed (850–1250 HU, 1000 HU)", () => {
			const vol = createSyntheticVolume(() => 1000);
			const crest: Vec3 = [10, 10, 0];
			const apex: Vec3 = [10, 10, 10];

			const result = calculateImplantBedDensitometry(vol, crest, apex, 11);

			assert.strictEqual(result.boneClass, "D2");
			assert.strictEqual(result.stats.mean, 1000);
			assert.strictEqual(result.corticalThicknessMm, 10);
			assert.strictEqual(result.trabecularMeanHU, 1000);
			assert.strictEqual(result.warningLowDensity, false);
		});

		it("analyzes D3 implant bed with cortical plate and trabecular core (350–850 HU)", () => {
			// Cortical plate from z=0 to z=1 (1000 HU), then trabecular 500 HU for z >= 2
			const vol = createSyntheticVolume((_i, _j, k) => (k < 2 ? 1000 : 500));
			const crest: Vec3 = [10, 10, 0];
			const apex: Vec3 = [10, 10, 10]; // length 10 mm, samples = 11 -> 1 mm per sample

			const result = calculateImplantBedDensitometry(vol, crest, apex, 11);

			// Mean density: (2 * 1000 + 9 * 500) / 11 = 6500 / 11 ≈ 590.9 HU -> Misch D3
			assert.strictEqual(result.boneClass, "D3");
			// Drop below 850 HU occurs at sample index 2 (z = 2.0 mm)
			assert.strictEqual(result.corticalThicknessMm, 2);
			// Trabecular samples (indices 2..10) all have 500 HU
			assert.strictEqual(result.trabecularMeanHU, 500);
			// 500 HU is >= 350 and min 500 is >= 150 -> no warning
			assert.strictEqual(result.warningLowDensity, false);
		});

		it("analyzes D4 implant bed (150–350 HU) and sets warningLowDensity = true", () => {
			const vol = createSyntheticVolume(() => 250);
			const crest: Vec3 = [10, 10, 0];
			const apex: Vec3 = [10, 10, 10];

			const result = calculateImplantBedDensitometry(vol, crest, apex, 11);

			assert.strictEqual(result.boneClass, "D4");
			assert.strictEqual(result.stats.mean, 250);
			assert.strictEqual(result.corticalThicknessMm, 0); // crest is 250 < 850 HU
			assert.strictEqual(result.trabecularMeanHU, 250);
			// Low trabecular density warning triggered (250 < 350)
			assert.strictEqual(result.warningLowDensity, true);
		});

		it("triggers warningLowDensity = true when localized minimum drops below 150 HU", () => {
			// Trabecular mean is 400 HU (D3), but apex has a localized defect of 50 HU (< 150 HU)
			const vol = createSyntheticVolume((_i, _j, k) => (k === 10 ? 50 : 400));
			const crest: Vec3 = [10, 10, 0];
			const apex: Vec3 = [10, 10, 10];

			const result = calculateImplantBedDensitometry(vol, crest, apex, 11);

			// Minimum is 50 HU (< 150 HU) -> warningLowDensity must be true
			assert.strictEqual(result.stats.min, 50);
			assert.strictEqual(result.warningLowDensity, true);
		});

		it("correctly measures 3.0 mm cortical plate thickness on layered synthetic volume", () => {
			// Cortical plate for z = 0, 1, 2 (1100 HU >= 850 HU), then trabecular 600 HU for z >= 3
			const vol = createSyntheticVolume((_i, _j, k) => (k < 3 ? 1100 : 600));
			const crest: Vec3 = [20, 20, 0];
			const apex: Vec3 = [20, 20, 10]; // length 10 mm, samples = 11 -> step = 1.0 mm

			const result = calculateImplantBedDensitometry(vol, crest, apex, 11);

			// Sample index 3 is at distance 3.0 mm
			assert.strictEqual(result.corticalThicknessMm, 3);
			assert.strictEqual(result.trabecularMeanHU, 600);
			assert.strictEqual(result.warningLowDensity, false);
		});
	});

	// ── 5. Zero Emojis Compliance ────────────────────────────────

	describe("5. Zero Emojis Compliance (Mandate 8d item 7)", () => {
		it("verifies 100% absence of cartoon emojis in measureStatsEngine.ts source code", () => {
			const sourcePath = resolve(
				import.meta.dirname,
				"../measureStatsEngine.ts",
			);
			const source = readFileSync(sourcePath, "utf8");

			// Matches unicode emoji blocks
			const emojiRegex =
				/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			const match = emojiRegex.exec(source);
			assert.strictEqual(
				match,
				null,
				`Found forbidden emoji character: ${match?.[0]}`,
			);
		});
	});
});
