/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 129: CBCT MEASURE STATS & HU DENSITY PROFILE ENGINE TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * 100% Zero-Mock comprehensive unit tests for:
 * 1. 3D Euclidean distances & 3D trajectory angles (Pythagoras, 90°, 45°, 180°, 0°)
 * 2. 3D Polygon area and perimeter (Newell's Stokes theorem for flat & inclined planes)
 * 3. Continuous HU line profile sampling with trilinear voxel interpolation
 * 4. Population HU mathematical statistics (mean, stdDev, median, min, max, Misch D1–D4)
 * 5. Official A4 clinical measurement protocol (Format 043/у, 0 emojis by Mandate 8d)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateDistance3D,
	calculateAngle3D,
	calculatePolygonArea3D,
	sampleVolumeHU,
	sampleProfileHU,
	computeHUStats,
	measureDistance,
	measureAngle,
	measurePolygonArea,
	formatMeasureStatsA4Report,
	type DistanceMeasurement,
	type AngleMeasurement,
	type PolygonAreaMeasurement,
	type HUProfileSample,
	type HUStats,
	type Vec3,
} from "../measureStatsEngine.js";
import type { VolumeSamplingData } from "../cprMath.js";

/** Helper to construct an exact synthetic volumetric sampling field */
function createSyntheticVolume(
	field: (i: number, j: number, k: number) => number,
	dims: [number, number, number] = [60, 60, 60],
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

describe("Wave 129: CBCT Measure Stats & HU Density Profile Engine", () => {
	// ── 1. 3D Distance & Angle Measurements ───────────────────────

	describe("1. 3D Distance & Angle Measurements", () => {
		it("calculates 2D Pythagoras distance (3-4-5 triangle)", () => {
			const d = calculateDistance3D([0, 0, 0], [3, 4, 0]);
			assert.ok(Math.abs(d - 5.0) < 1e-6, `Expected 5.0, got ${d}`);
		});

		it("calculates 3D Pythagoras distance (3-4-12 -> 13 mm)", () => {
			const p1: Vec3 = [10, 20, 30];
			const p2: Vec3 = [13, 24, 42]; // dx=3, dy=4, dz=12 -> hypot=13
			const d = calculateDistance3D(p1, p2);
			assert.ok(Math.abs(d - 13.0) < 1e-6, `Expected 13.0, got ${d}`);
		});

		it("returns 0 for coincident points", () => {
			const d = calculateDistance3D([12.5, -4.2, 7.8], [12.5, -4.2, 7.8]);
			assert.strictEqual(d, 0);
		});

		it("creates DistanceMeasurement object via measureDistance", () => {
			const m = measureDistance([0, 0, 0], [0, 10, 0]);
			assert.strictEqual(m.distanceMm, 10);
			assert.deepStrictEqual(m.p1, [0, 0, 0]);
			assert.deepStrictEqual(m.p2, [0, 10, 0]);
		});

		it("calculates exact 90° right angle in 3D coordinate planes", () => {
			const angle = calculateAngle3D([10, 0, 0], [0, 0, 0], [0, 15, 0]);
			assert.ok(Math.abs(angle - 90.0) < 1e-6, `Expected 90.0, got ${angle}`);
		});

		it("calculates exact 45° angle in 3D", () => {
			const angle = calculateAngle3D([10, 0, 0], [0, 0, 0], [10, 10, 0]);
			assert.ok(Math.abs(angle - 45.0) < 1e-6, `Expected 45.0, got ${angle}`);
		});

		it("calculates exact 180° straight angle in 3D", () => {
			const angle = calculateAngle3D([5, 0, 0], [0, 0, 0], [-5, 0, 0]);
			assert.ok(Math.abs(angle - 180.0) < 1e-6, `Expected 180.0, got ${angle}`);
		});

		it("calculates 0° angle for coincident rays", () => {
			const angle = calculateAngle3D([10, 5, 2], [0, 0, 0], [20, 10, 4]);
			assert.ok(Math.abs(angle - 0.0) < 1e-6, `Expected 0.0, got ${angle}`);
		});

		it("returns 0° for degenerate zero-length rays", () => {
			const a1 = calculateAngle3D([0, 0, 0], [0, 0, 0], [10, 0, 0]);
			const a2 = calculateAngle3D([10, 0, 0], [0, 0, 0], [0, 0, 0]);
			assert.strictEqual(a1, 0);
			assert.strictEqual(a2, 0);
		});

		it("creates AngleMeasurement object via measureAngle", () => {
			const m = measureAngle([0, 5, 0], [0, 0, 0], [0, 0, 5]);
			assert.ok(Math.abs(m.angleDeg - 90) < 1e-6);
			assert.deepStrictEqual(m.vertex, [0, 0, 0]);
		});
	});

	// ── 2. 3D Polygon Area & Perimeter Measurements ───────────────

	describe("2. 3D Polygon Area & Perimeter Measurements", () => {
		it("calculates area and perimeter of a 10x10 mm square in XY plane", () => {
			const square: Vec3[] = [
				[0, 0, 0],
				[10, 0, 0],
				[10, 10, 0],
				[0, 10, 0],
			];
			const { areaMm2, perimeterMm } = calculatePolygonArea3D(square);
			assert.ok(Math.abs(areaMm2 - 100.0) < 1e-6, `Expected 100.0, got ${areaMm2}`);
			assert.ok(Math.abs(perimeterMm - 40.0) < 1e-6, `Expected 40.0, got ${perimeterMm}`);
		});

		it("calculates area and perimeter of a 10x10 mm square in a 45° inclined 3D plane", () => {
			// Square inclined 45° around X axis: y' = y/sqrt(2), z' = y/sqrt(2)
			const s2 = Math.SQRT2;
			const inclinedSquare: Vec3[] = [
				[0, 0, 0],
				[10, 0, 0],
				[10, 10 / s2, 10 / s2],
				[0, 10 / s2, 10 / s2],
			];
			const { areaMm2, perimeterMm } = calculatePolygonArea3D(inclinedSquare);
			assert.ok(Math.abs(areaMm2 - 100.0) < 1e-5, `Expected 100.0, got ${areaMm2}`);
			assert.ok(Math.abs(perimeterMm - 40.0) < 1e-5, `Expected 40.0, got ${perimeterMm}`);
		});

		it("calculates area of a 10x10 mm square in an arbitrary 3D oblique plane", () => {
			// Plane with normal [1, 1, 1] / sqrt(3)
			// Orthonormal basis in plane:
			// u = [1, -1, 0] / sqrt(2)
			// v = [1, 1, -2] / sqrt(6)
			const u: Vec3 = [1 / Math.SQRT2, -1 / Math.SQRT2, 0];
			const v: Vec3 = [1 / Math.sqrt(6), 1 / Math.sqrt(6), -2 / Math.sqrt(6)];

			const p0: Vec3 = [5, 5, 5];
			const p1: Vec3 = [p0[0] + 10 * u[0], p0[1] + 10 * u[1], p0[2] + 10 * u[2]];
			const p2: Vec3 = [
				p0[0] + 10 * u[0] + 10 * v[0],
				p0[1] + 10 * u[1] + 10 * v[1],
				p0[2] + 10 * u[2] + 10 * v[2],
			];
			const p3: Vec3 = [p0[0] + 10 * v[0], p0[1] + 10 * v[1], p0[2] + 10 * v[2]];

			const { areaMm2, perimeterMm } = calculatePolygonArea3D([p0, p1, p2, p3]);
			assert.ok(Math.abs(areaMm2 - 100.0) < 1e-4, `Expected 100.0, got ${areaMm2}`);
			assert.ok(Math.abs(perimeterMm - 40.0) < 1e-4, `Expected 40.0, got ${perimeterMm}`);
		});

		it("calculates area of a 3D triangle (legs 6 and 8 mm -> area 24 mm², perim 24 mm)", () => {
			const triangle: Vec3[] = [
				[0, 0, 0],
				[6, 0, 0],
				[0, 8, 0],
			];
			const { areaMm2, perimeterMm } = calculatePolygonArea3D(triangle);
			assert.ok(Math.abs(areaMm2 - 24.0) < 1e-6, `Expected 24.0, got ${areaMm2}`);
			assert.ok(Math.abs(perimeterMm - (6 + 8 + 10)) < 1e-6, `Expected 24.0, got ${perimeterMm}`);
		});

		it("automatically handles duplicate closing point (closed loop array)", () => {
			const closedSquare: Vec3[] = [
				[0, 0, 0],
				[10, 0, 0],
				[10, 10, 0],
				[0, 10, 0],
				[0, 0, 0], // Duplicate closing vertex
			];
			const { areaMm2, perimeterMm } = calculatePolygonArea3D(closedSquare);
			assert.ok(Math.abs(areaMm2 - 100.0) < 1e-6, `Expected 100.0, got ${areaMm2}`);
			assert.ok(Math.abs(perimeterMm - 40.0) < 1e-6, `Expected 40.0, got ${perimeterMm}`);
		});

		it("handles degenerate polygons with < 3 points safely", () => {
			assert.deepStrictEqual(calculatePolygonArea3D([]), { areaMm2: 0, perimeterMm: 0 });
			assert.deepStrictEqual(calculatePolygonArea3D([[0, 0, 0]]), { areaMm2: 0, perimeterMm: 0 });
			const twoPts = calculatePolygonArea3D([
				[0, 0, 0],
				[10, 0, 0],
			]);
			assert.strictEqual(twoPts.areaMm2, 0);
			assert.strictEqual(twoPts.perimeterMm, 10);
		});

		it("creates PolygonAreaMeasurement via measurePolygonArea", () => {
			const m = measurePolygonArea([
				[0, 0, 0],
				[4, 0, 0],
				[4, 3, 0],
				[0, 3, 0],
			]);
			assert.strictEqual(m.areaMm2, 12);
			assert.strictEqual(m.perimeterMm, 14);
		});
	});

	// ── 3. HU Line Profile Sampling with Trilinear Interpolation ──

	describe("3. HU Line Profile Sampling (Trilinear)", () => {
		it("samples along an axis-aligned linear gradient with exact interpolation", () => {
			// Field: f(x, y, z) = 100 + 15 * x
			const vol = createSyntheticVolume((i) => 100 + 15 * i);
			const samples = sampleProfileHU(vol, [0, 5, 5], [10, 5, 5], 1.0);

			assert.strictEqual(samples.length, 11);
			for (let i = 0; i < samples.length; i++) {
				const s = samples[i]!;
				assert.strictEqual(s.distanceMm, i);
				const expectedHU = 100 + 15 * i;
				assert.ok(
					Math.abs(s.hu - expectedHU) < 1e-5,
					`Sample ${i}: expected ${expectedHU}, got ${s.hu}`,
				);
			}
		});

		it("samples along a 3D diagonal path (3-4-12 -> 13 mm) with 1 mm step", () => {
			// Field: f(x, y, z) = 200 + 10*x + 20*y + 30*z
			const vol = createSyntheticVolume((i, j, k) => 200 + 10 * i + 20 * j + 30 * k);
			const p1: Vec3 = [2, 3, 4];
			const p2: Vec3 = [5, 7, 16]; // dx=3, dy=4, dz=12 -> dist = 13 mm

			const samples = sampleProfileHU(vol, p1, p2, 1.0);

			assert.strictEqual(samples.length, 14); // 0, 1, 2, ..., 13 mm
			assert.strictEqual(samples[0]!.distanceMm, 0);
			assert.strictEqual(samples[13]!.distanceMm, 13);

			// Check first point: 200 + 10*2 + 20*3 + 30*4 = 200 + 20 + 60 + 120 = 400
			assert.ok(Math.abs(samples[0]!.hu - 400) < 1e-4);
			// Check last point: 200 + 10*5 + 20*7 + 30*16 = 200 + 50 + 140 + 480 = 870
			assert.ok(Math.abs(samples[13]!.hu - 870) < 1e-4);
		});

		it("handles zero distance gracefully (returns single sample)", () => {
			const vol = createSyntheticVolume(() => 750);
			const samples = sampleProfileHU(vol, [5, 5, 5], [5, 5, 5], 1.0);
			assert.strictEqual(samples.length, 1);
			assert.strictEqual(samples[0]!.distanceMm, 0);
			assert.strictEqual(samples[0]!.hu, 750);
		});

		it("correctly samples direct volume points via sampleVolumeHU", () => {
			const vol = createSyntheticVolume((i, j, k) => i * 100 + j * 10 + k);
			const hu = sampleVolumeHU(vol, [2.5, 3.5, 4.5]);
			// Linear field trilinear interpolation at half coordinates:
			// 2.5 * 100 + 3.5 * 10 + 4.5 = 250 + 35 + 4.5 = 289.5
			assert.ok(Math.abs(hu - 289.5) < 1e-4);
		});
	});

	// ── 4. HU Statistics & Carl Misch Classification ──────────────

	describe("4. HU Statistics & Carl Misch Classification (D1–D4)", () => {
		it("computes exact mean, stdDev, median, min, max for known population [100, 200, 300, 400, 500]", () => {
			const stats = computeHUStats([100, 200, 300, 400, 500]);
			assert.strictEqual(stats.count, 5);
			assert.strictEqual(stats.min, 100);
			assert.strictEqual(stats.max, 500);
			assert.strictEqual(stats.mean, 300);
			assert.strictEqual(stats.median, 300);
			// Population SD: sqrt(100000 / 5) = sqrt(20000) ≈ 141.421356
			assert.ok(Math.abs(stats.stdDev - Math.sqrt(20000)) < 1e-6);
		});

		it("computes median correctly for even number of values [100, 200, 400, 500]", () => {
			const stats = computeHUStats([100, 200, 400, 500]);
			assert.strictEqual(stats.count, 4);
			assert.strictEqual(stats.median, 300); // (200 + 400) / 2
		});

		it("accepts HUProfileSample[] as input and extracts values", () => {
			const samples: HUProfileSample[] = [
				{ distanceMm: 0, point: [0, 0, 0], hu: 900 },
				{ distanceMm: 1, point: [1, 0, 0], hu: 1000 },
				{ distanceMm: 2, point: [2, 0, 0], hu: 1100 },
			];
			const stats = computeHUStats(samples);
			assert.strictEqual(stats.count, 3);
			assert.strictEqual(stats.mean, 1000);
			assert.strictEqual(stats.median, 1000);
			assert.strictEqual(stats.boneDensityClass, "D2");
		});

		it("classifies bone as D1 when mean > 1250 HU", () => {
			const stats = computeHUStats([1300, 1400, 1350]);
			assert.strictEqual(stats.boneDensityClass, "D1");
		});

		it("classifies bone as D2 when mean is 850–1250 HU", () => {
			assert.strictEqual(computeHUStats([1250]).boneDensityClass, "D2");
			assert.strictEqual(computeHUStats([1000]).boneDensityClass, "D2");
			assert.strictEqual(computeHUStats([850]).boneDensityClass, "D2");
		});

		it("classifies bone as D3 when mean is 350–849 HU", () => {
			assert.strictEqual(computeHUStats([849]).boneDensityClass, "D3");
			assert.strictEqual(computeHUStats([600]).boneDensityClass, "D3");
			assert.strictEqual(computeHUStats([350]).boneDensityClass, "D3");
		});

		it("classifies bone as D4 when mean < 350 HU", () => {
			assert.strictEqual(computeHUStats([349]).boneDensityClass, "D4");
			assert.strictEqual(computeHUStats([200]).boneDensityClass, "D4");
			assert.strictEqual(computeHUStats([50]).boneDensityClass, "D4");
			assert.strictEqual(computeHUStats([-500]).boneDensityClass, "D4");
		});

		it("returns safe defaults for empty input array", () => {
			const empty = computeHUStats([]);
			assert.strictEqual(empty.count, 0);
			assert.strictEqual(empty.mean, 0);
			assert.strictEqual(empty.boneDensityClass, "D4");
		});
	});

	// ── 5. Official A4 Clinical Measurement Protocol ──────────────

	describe("5. Official A4 Clinical Measurement Protocol (Mandate 8d)", () => {
		it("generates a comprehensive clinical protocol without emojis", () => {
			const distances: DistanceMeasurement[] = [
				{ p1: [10, 5, 2], p2: [18, 5, 2], distanceMm: 8.0 },
				{ p1: [10, 0, 0], p2: [10, 0, 13], distanceMm: 13.0 },
			];
			const angles: AngleMeasurement[] = [
				{ p1: [5, 10, 0], vertex: [5, 0, 0], p2: [15, 0, 0], angleDeg: 90.0 },
			];
			const polygons: PolygonAreaMeasurement[] = [
				{
					points: [
						[0, 0, 0],
						[8, 0, 0],
						[8, 6, 0],
						[0, 6, 0],
					],
					areaMm2: 48.0,
					perimeterMm: 28.0,
				},
			];
			const profileSamples: HUProfileSample[] = [
				{ distanceMm: 0, point: [0, 0, 0], hu: 1200 },
				{ distanceMm: 2, point: [2, 0, 0], hu: 1050 },
				{ distanceMm: 4, point: [4, 0, 0], hu: 950 },
				{ distanceMm: 6, point: [6, 0, 0], hu: 900 },
			];
			const huStats: HUStats = computeHUStats(profileSamples);

			const report = formatMeasureStatsA4Report({
				patientName: "Иванов Иван Сергеевич",
				patientBirthDate: "1984-05-12",
				studyDate: "2026-09-12",
				doctorName: "Д-р Смирнов А.В.",
				clinicName: "Стоматологический Центр DENTE",
				indication: "Планирование имплантации в области зуба 36",
				distances,
				angles,
				polygons,
				profileSamples,
				huStats,
				notes: "Ширина альвеолярного гребня достаточна для установки имплантата 4.0 x 11.5 мм.",
			});

			// Header checks
			assert.ok(report.includes("ПРОТОКОЛ РЕНТГЕНОМОРФОМЕТРИЧЕСКИХ И ДЕНСИТОМЕТРИЧЕСКИХ ИЗМЕРЕНИЙ КЛКТ"));
			assert.ok(report.includes("Иванов Иван Сергеевич"));
			assert.ok(report.includes("Д-р Смирнов А.В."));
			assert.ok(report.includes("зуба 36"));

			// Distance section
			assert.ok(report.includes("8.00 мм"));
			assert.ok(report.includes("13.00 мм"));

			// Angle section
			assert.ok(report.includes("90.0°"));

			// Polygon section
			assert.ok(report.includes("48.00 мм²"));
			assert.ok(report.includes("28.00 мм"));

			// Densitometry section & Misch guidance
			assert.ok(report.includes("Классификация плотности по Карлу Мишу"));
			assert.ok(report.includes("Класс D2"));

			// Notes
			assert.ok(report.includes("Ширина альвеолярного гребня достаточна"));

			// Strict absence of cartoon emojis (Mandate 8d item 7)
			const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/u;
			assert.strictEqual(
				emojiPattern.test(report),
				false,
				"Report must not contain cartoon emojis per Mandate 8d item 7",
			);
		});

		it("handles empty measurement datasets gracefully", () => {
			const report = formatMeasureStatsA4Report({});
			assert.ok(report.includes("Линейные измерения не проводились."));
			assert.ok(report.includes("Угловые измерения не проводились."));
			assert.ok(report.includes("Площадные измерения не проводились."));
			assert.ok(report.includes("Денситометрический профиль не рассчитывался."));
		});
	});
});
