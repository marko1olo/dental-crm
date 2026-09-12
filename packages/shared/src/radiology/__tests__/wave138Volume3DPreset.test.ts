/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 138: CBCT 3D VOLUME PRESETS & TRANSFER FUNCTION UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive unit test suite (100% Zero Mocks):
 *  1. Ray-marching sampling parameters across low, medium and high quality.
 *  2. RGB color transfer function generation across all 5 clinical colormaps.
 *  3. Piecewise-linear opacity ramps for bone, tooth, endo, soft-tissue, airway, x-ray-mip.
 *  4. Ray-marching ray count & recommended step budget evaluation.
 *  5. Style configuration generation with defaults & overrides.
 *  6. Russian Form 043/u A4 3D rendering protocol generation & strict 0 emojis audit.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	SAMPLE_DISTANCE_BY_QUALITY,
	MAX_SAMPLES_BY_QUALITY,
	COLORMAP_STOPS_MAP,
	VOLUME_PRESET_DEFINITIONS,
	type Volume3DQuality,
	type Volume3DColormap,
	type VolumePresetType,
	calculateSampleParams,
	generateColorTransferFunction,
	generateOpacityPiecewiseRamp,
	computeRayMarchingStepBudget,
	createVolume3DStyleConfig,
	formatVolume3DVisualizationA4Report,
	volume3DQualitySchema,
	volume3DColormapSchema,
	volumePresetTypeSchema,
	transferFunctionStopSchema,
	opacityRampNodeSchema,
	volume3DStyleConfigSchema,
} from "../volume3DPresetEngine.js";

describe("Wave 138: CBCT 3D Volume Presets & Transfer Function Engine", () => {
	// ── 1. Ray-Marching Sampling Parameters ──────────────────────────

	describe("1. Sampling Parameters by Quality Level", () => {
		const qualities: Volume3DQuality[] = ["low", "medium", "high"];

		it("returns correct sample distance and max samples for each quality tier", () => {
			const low = calculateSampleParams("low");
			assert.equal(low.sampleDistanceMm, 1.6);
			assert.equal(low.maxSamples, 2000);

			const med = calculateSampleParams("medium");
			assert.equal(med.sampleDistanceMm, 0.7);
			assert.equal(med.maxSamples, 4000);

			const high = calculateSampleParams("high");
			assert.equal(high.sampleDistanceMm, 0.3);
			assert.equal(high.maxSamples, 8000);
		});

		it("monotonically decreases sample distance as quality increases", () => {
			const low = calculateSampleParams("low");
			const med = calculateSampleParams("medium");
			const high = calculateSampleParams("high");

			assert.ok(low.sampleDistanceMm > med.sampleDistanceMm);
			assert.ok(med.sampleDistanceMm > high.sampleDistanceMm);

			assert.ok(low.maxSamples < med.maxSamples);
			assert.ok(med.maxSamples < high.maxSamples);
		});

		it("rejects invalid quality values through Zod parsing", () => {
			assert.throws(() => calculateSampleParams("ultra" as Volume3DQuality));
			assert.throws(() => calculateSampleParams("" as Volume3DQuality));
		});
	});

	// ── 2. RGB Color Transfer Functions ──────────────────────────────

	describe("2. RGB Color Transfer Function Generation", () => {
		const colormaps: Volume3DColormap[] = [
			"grayscale",
			"cool",
			"warm",
			"spectral",
			"inverted",
		];
		const wc = 400;
		const ww = 1000;
		const lo = wc - ww / 2; // -100
		const hi = wc + ww / 2; // +900

		for (const cmap of colormaps) {
			it(`generates valid color stops across W/L for colormap '${cmap}'`, () => {
				const stops = generateColorTransferFunction(cmap, wc, ww);
				assert.ok(stops.length >= 2, "Must contain at least 2 stops");

				// First stop must start at lo
				const first = stops[0]!;
				assert.equal(first[0], lo);
				assert.equal(first[4], 0.0); // opacity at t=0

				// Last stop must end at hi
				const last = stops[stops.length - 1]!;
				assert.equal(last[0], hi);
				assert.equal(last[4], 1.0); // opacity at t=1

				// Validate strictly against schema
				for (const stop of stops) {
					assert.doesNotThrow(() => transferFunctionStopSchema.parse(stop));
					const [val, r, g, b, opacity] = stop;
					assert.ok(val >= lo && val <= hi);
					assert.ok(r >= 0 && r <= 1);
					assert.ok(g >= 0 && g <= 1);
					assert.ok(b >= 0 && b <= 1);
					assert.ok(opacity >= 0 && opacity <= 1);
				}
			});
		}

		it("correctly maps grayscale from black (0,0,0) to white (1,1,1)", () => {
			const stops = generateColorTransferFunction("grayscale", 0, 1000);
			assert.deepEqual(stops[0], [-500, 0, 0, 0, 0]);
			assert.deepEqual(stops[1], [500, 1, 1, 1, 1]);
		});

		it("correctly maps inverted from white (1,1,1) to black (0,0,0)", () => {
			const stops = generateColorTransferFunction("inverted", 0, 1000);
			assert.deepEqual(stops[0], [-500, 1, 1, 1, 0]);
			assert.deepEqual(stops[1], [500, 0, 0, 0, 1]);
		});
	});

	// ── 3. Piecewise-Linear Opacity Ramps ─────────────────────────────

	describe("3. Piecewise-Linear Opacity Ramps for Anatomical Presets", () => {
		const presets: VolumePresetType[] = [
			"ct-bone",
			"tooth-enamel",
			"endo-guttapercha",
			"soft-tissue",
			"airway",
			"x-ray-mip",
		];
		const wc = 300;
		const ww = 1500;

		for (const preset of presets) {
			it(`generates valid non-empty opacity nodes for preset '${preset}'`, () => {
				const nodes = generateOpacityPiecewiseRamp(preset, wc, ww);
				assert.ok(nodes.length >= 4, "Must contain at least 4 nodes for smooth curve");

				// Strictly validate each node against schema
				for (const node of nodes) {
					assert.doesNotThrow(() => opacityRampNodeSchema.parse(node));
					assert.ok(node.opacity >= 0 && node.opacity <= 1.0);
				}

				// Values must be strictly non-decreasing
				for (let i = 0; i < nodes.length - 1; i++) {
					assert.ok(
						nodes[i]!.value <= nodes[i + 1]!.value,
						"Ramp scalar values must be monotonic",
					);
				}
			});
		}

		it("implements DenCT X-ray translucent ramp with maxOpacity ceiling", () => {
			const nodes = generateOpacityPiecewiseRamp("x-ray-mip", 300, 1500);
			const lo = 300 - 1500 / 2; // -450
			const hi = 300 + 1500 / 2; // +1050

			// 1) lo -> opacity 0
			assert.equal(nodes[0]!.value, lo);
			assert.equal(nodes[0]!.opacity, 0.0);

			// 2) mid -> opacity = 0.2 * 0.3 = 0.06
			assert.equal(nodes[1]!.value, lo + (hi - lo) * 0.5);
			assert.equal(nodes[1]!.opacity, 0.06);

			// 3) hi -> opacity = 0.20
			assert.equal(nodes[2]!.value, hi);
			assert.equal(nodes[2]!.opacity, 0.2);

			// 4) high attenuation dense structures -> min(0.9, 0.2*2.4) = 0.48
			assert.equal(nodes[3]!.value, hi + (hi - lo) * 0.8);
			assert.equal(nodes[3]!.opacity, 0.48);
		});

		it("implements airway inverted ramp where air is opaque and tissue is transparent", () => {
			const nodes = generateOpacityPiecewiseRamp("airway", -600, 600);
			const lo = -900;
			const hi = -300;

			// Lowest air density has highest opacity
			assert.equal(nodes[0]!.value, lo);
			assert.ok(nodes[0]!.opacity > 0.8);

			// Dense tissue has zero opacity
			const lastNode = nodes[nodes.length - 1]!;
			assert.equal(lastNode.opacity, 0.0);
		});
	});

	// ── 4. Ray-Marching Step Budget Calculation ──────────────────────

	describe("4. Ray-Marching Step Budget & Ray Count", () => {
		const volumeBounds: [number, number, number] = [120, 120, 80]; // 120x120x80 mm CBCT FOV

		it("calculates ray counts and recommended step mm", () => {
			const lowBudget = computeRayMarchingStepBudget(volumeBounds, "low");
			assert.equal(lowBudget.recommendedStepMm, 1.6);
			assert.ok(lowBudget.estimatedRays > 1000);

			const medBudget = computeRayMarchingStepBudget(volumeBounds, "medium");
			assert.equal(medBudget.recommendedStepMm, 0.7);
			assert.ok(medBudget.estimatedRays > lowBudget.estimatedRays);

			const highBudget = computeRayMarchingStepBudget(volumeBounds, "high");
			assert.equal(highBudget.recommendedStepMm, 0.3);
			assert.ok(highBudget.estimatedRays > medBudget.estimatedRays);
		});

		it("handles zero or degenerate dimensions gracefully with minimum floor", () => {
			const degenerate = computeRayMarchingStepBudget([0, 0, 0], "medium");
			assert.ok(degenerate.estimatedRays >= 256); // min 16x16
			assert.equal(degenerate.recommendedStepMm, 0.7);
		});
	});

	// ── 5. Style Configuration Helper ────────────────────────────────

	describe("5. Style Configuration Helper (createVolume3DStyleConfig)", () => {
		it("creates default configuration matching clinical preset definitions", () => {
			const boneConfig = createVolume3DStyleConfig("ct-bone", "medium");
			assert.equal(boneConfig.preset, "ct-bone");
			assert.equal(boneConfig.quality, "medium");
			assert.equal(boneConfig.colormap, "warm");
			assert.equal(boneConfig.windowCenter, 300);
			assert.equal(boneConfig.windowWidth, 1500);
			assert.equal(boneConfig.sampleDistanceMm, 0.7);
			assert.equal(boneConfig.maxSamplesPerRay, 4000);

			assert.doesNotThrow(() => volume3DStyleConfigSchema.parse(boneConfig));
		});

		it("respects custom window/level and colormap overrides", () => {
			const customConfig = createVolume3DStyleConfig("tooth-enamel", "high", {
				windowCenter: 1400,
				windowWidth: 2000,
				colormap: "spectral",
			});

			assert.equal(customConfig.windowCenter, 1400);
			assert.equal(customConfig.windowWidth, 2000);
			assert.equal(customConfig.colormap, "spectral");
			assert.equal(customConfig.quality, "high");
			assert.equal(customConfig.sampleDistanceMm, 0.3);
			assert.equal(customConfig.maxSamplesPerRay, 8000);
		});
	});

	// ── 6. Official Russian Form 043/u A4 Protocol Formatting ────────

	describe("6. Russian Form 043/u A4 Protocol & Strict 0 Emojis Audit", () => {
		it("formats complete medical report and contains strictly 0 emojis", () => {
			const config = createVolume3DStyleConfig("ct-bone", "medium");
			const report = formatVolume3DVisualizationA4Report(config, {
				name: "Ковалев Андрей Николаевич",
				id: "КТ-2026-0912",
				birthDate: "05.11.1979",
				studyDate: "2026-09-12",
				doctorName: "д-р Мельников В.Г.",
				clinicName: "Клиника Цифровой Стоматологии ДЕНТЕ",
			});

			// Clinical contents verification
			assert.ok(report.includes("МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ"));
			assert.ok(report.includes("ФОРМА 043/У"));
			assert.ok(report.includes("ПРОТОКОЛ 3D ОБЪЕМНОЙ ВИЗУАЛИЗАЦИИ ТОМОГРАММЫ"));
			assert.ok(report.includes("Ковалев Андрей Николаевич"));
			assert.ok(report.includes("КТ-2026-0912"));
			assert.ok(report.includes("1. ПАРАМЕТРЫ ПЕРЕДАТОЧНОЙ ФУНКЦИИ И АНАТОМИЧЕСКИЙ ПРЕСЕТ"));
			assert.ok(report.includes("2. ДЕНСИТОМЕТРИЧЕСКОЕ ОКНО"));
			assert.ok(report.includes("3. КУСОЧНО-ЛИНЕЙНАЯ РАМПА НЕПРОЗРАЧНОСТИ"));
			assert.ok(report.includes("4. ЗАКЛЮЧЕНИЕ СПЕЦИАЛИСТА ЛУЧЕВОЙ ДИАГНОСТИКИ"));
			assert.ok(report.includes("DICOM Part 3"));

			// MANDATE 8d Item 7: COMPLETE UNICODE EMOJI AUDIT
			const emojiRegex =
				/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
			assert.equal(
				emojiRegex.test(report),
				false,
				"Form 043/u 3D visualization protocol MUST contain strictly 0 emojis",
			);
		});
	});

	// ── 7. Zod Schema Verification ────────────────────────────────────

	describe("7. Zod Schema Verification", () => {
		it("validates all enum variants correctly", () => {
			assert.equal(volume3DQualitySchema.parse("low"), "low");
			assert.equal(volume3DQualitySchema.parse("medium"), "medium");
			assert.equal(volume3DQualitySchema.parse("high"), "high");

			assert.equal(volume3DColormapSchema.parse("grayscale"), "grayscale");
			assert.equal(volume3DColormapSchema.parse("cool"), "cool");
			assert.equal(volume3DColormapSchema.parse("warm"), "warm");
			assert.equal(volume3DColormapSchema.parse("spectral"), "spectral");
			assert.equal(volume3DColormapSchema.parse("inverted"), "inverted");

			assert.equal(volumePresetTypeSchema.parse("ct-bone"), "ct-bone");
			assert.equal(volumePresetTypeSchema.parse("tooth-enamel"), "tooth-enamel");
			assert.equal(volumePresetTypeSchema.parse("endo-guttapercha"), "endo-guttapercha");
			assert.equal(volumePresetTypeSchema.parse("soft-tissue"), "soft-tissue");
			assert.equal(volumePresetTypeSchema.parse("airway"), "airway");
			assert.equal(volumePresetTypeSchema.parse("x-ray-mip"), "x-ray-mip");
		});
	});
});
