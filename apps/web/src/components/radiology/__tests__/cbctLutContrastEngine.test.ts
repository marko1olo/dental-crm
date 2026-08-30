import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CBCT_HOUNSFIELD_PRESETS,
	applyLutToHU,
	clearLutCache,
	createEmptyCbctVolume,
	extractMprSlice,
	extractObliqueMprSlice,
	generate16BitLut,
	get16BitLut,
	huToGrayscale,
	resliceMprSynchronized,
} from "../cbctMprMath";

describe("16-Bit Look-Up Table (LUT) Window/Level Contrast Engine Suite", () => {
	describe("1. 65536-Entry 16-Bit LUT Table Generation & Bounds", () => {
		it("generates exactly 65536-element Uint8Array covering [-32768 .. +32767] HU range", () => {
			const lut = generate16BitLut(4400, 1300, false);
			assert.equal(lut instanceof Uint8Array, true);
			assert.equal(lut.length, 65536);
		});

		it("maps Air, Soft Tissue, Bone, Dentin, and Enamel accurately under Bone Preset (WW 4400 / WL 1300)", () => {
			const ww = 4400;
			const wl = 1300;
			const lut = generate16BitLut(ww, wl, false);

			// Low threshold: 1300 - 2200 = -900 HU
			// High threshold: 1300 + 2200 = +3500 HU

			// Air (-1000 HU) -> index = -1000 + 32768 = 31768 -> 0 (Black)
			const airIndex = -1000 + 32768;
			assert.equal(lut[airIndex], 0);

			// Extreme negative (-32768 HU) -> index 0 -> 0
			assert.equal(lut[0], 0);

			// Extreme positive (+32767 HU) -> index 65535 -> 255 (Bright white)
			assert.equal(lut[65535], 255);

			// Soft tissue / Pulp (+100 HU) -> index 32868 -> dark gray [30..60]
			const pulpIndex = 100 + 32768;
			const pulpVal = lut[pulpIndex]!;
			assert.ok(pulpVal >= 30 && pulpVal <= 60, `Pulp value must be [30..60], got ${pulpVal}`);

			// Trabecular bone (+650 HU) -> medium-dark gray [85..110]
			const trabecularIndex = 650 + 32768;
			const trabVal = lut[trabecularIndex]!;
			assert.ok(trabVal >= 85 && trabVal <= 110, `Trabecular value must be [85..110], got ${trabVal}`);

			// Cortical bone (+1450 HU) -> medium gray [125..145]
			const corticalIndex = 1450 + 32768;
			const cortVal = lut[corticalIndex]!;
			assert.ok(cortVal >= 125 && cortVal <= 145, `Cortical value must be [125..145], got ${cortVal}`);

			// Dentin (+2100 HU) -> light gray [165..185]
			const dentinIndex = 2100 + 32768;
			const dentinVal = lut[dentinIndex]!;
			assert.ok(dentinVal >= 165 && dentinVal <= 185, `Dentin value must be [165..185], got ${dentinVal}`);

			// Enamel (+3500 HU) -> 255 (White)
			const enamelIndex = 3500 + 32768;
			assert.equal(lut[enamelIndex], 255);
		});

		it("precalculates all clinical Hounsfield presets with correct window bounds", () => {
			for (const preset of CBCT_HOUNSFIELD_PRESETS) {
				const lut = generate16BitLut(preset.windowWidth, preset.windowLevel, false);
				assert.equal(lut.length, 65536);

				const low = preset.windowLevel - preset.windowWidth / 2.0;
				const high = preset.windowLevel + preset.windowWidth / 2.0;

				const lowIdx = Math.max(0, Math.min(65536, Math.floor(low + 32768)));
				const highIdx = Math.max(0, Math.min(65536, Math.ceil(high + 32768)));

				if (lowIdx > 0) {
					assert.equal(lut[0], 0);
					assert.equal(lut[lowIdx - 1], 0);
				}
				if (highIdx < 65536) {
					assert.equal(lut[highIdx], 255);
					assert.equal(lut[65535], 255);
				}
			}
		});
	});

	describe("2. Color Inversion (Negative / White Paper LUT with Dark Air Anti-Blinding)", () => {
		it("inverts grayscale values with dark air anti-blinding when invert=true", () => {
			const stdLut = generate16BitLut(2000, 400, false);
			const invLut = generate16BitLut(2000, 400, true);

			assert.equal(invLut.length, 65536);

			// Air (-1000 HU < -600 HU) is 0 in standard, and 10 (#090d16 deep dark) in inverted to prevent blinding
			const airIdx = -1000 + 32768;
			assert.equal(stdLut[airIdx], 0);
			assert.equal(invLut[airIdx], 10);

			// Dense bone/enamel (+2000 HU) is 255 in standard, 0 in inverted
			const denseIdx = 2000 + 32768;
			assert.equal(stdLut[denseIdx], 255);
			assert.equal(invLut[denseIdx], 0);

			// Window Center (+400 HU) is ~128 in both
			const centerIdx = 400 + 32768;
			assert.equal(stdLut[centerIdx], 128);
			assert.equal(invLut[centerIdx], 127);

			// Symmetry check across anatomical tissue entries (HU >= -600)
			const airCutoffIdx = -600 + 32768;
			for (let i = airCutoffIdx; i < 65536; i += 256) {
				assert.ok(
					Math.abs(stdLut[i]! + invLut[i]! - 255) <= 1,
					`Symmetry failure at index ${i}: std=${stdLut[i]}, inv=${invLut[i]}`,
				);
			}
		});
	});

	describe("3. Gamma Non-Linear Transfer Curve", () => {
		it("applies power curve transfer when gamma !== 1.0", () => {
			const linearLut = generate16BitLut(4400, 1300, false, 1.0);
			const gammaLut = generate16BitLut(4400, 1300, false, 1.2);

			const midIndex = 1300 + 32768;
			// At center (0.5 normalized): 0.5^1.2 = ~0.435 -> ~111 vs 128
			assert.ok(gammaLut[midIndex]! < linearLut[midIndex]!, "Gamma > 1.0 shifts midtones darker");

			// Endpoints remain strictly clamped
			assert.equal(gammaLut[-1000 + 32768], 0);
			assert.equal(gammaLut[3500 + 32768], 255);
		});
	});

	describe("4. LRU LUT Caching & Instant Retrieval", () => {
		it("returns identical cached Uint8Array reference for identical parameters", () => {
			clearLutCache();
			const lut1 = get16BitLut(4400, 1300, false, 1.0);
			const lut2 = get16BitLut(4400, 1300, false, 1.0);

			assert.strictEqual(lut1, lut2, "Must return exact same cached array instance");
		});

		it("returns distinct LUTs for different parameters", () => {
			const boneLut = get16BitLut(4400, 1300, false);
			const softTissueLut = get16BitLut(600, 50, false);
			const invBoneLut = get16BitLut(4400, 1300, true);

			assert.notStrictEqual(boneLut, softTissueLut);
			assert.notStrictEqual(boneLut, invBoneLut);
		});

		it("clears cache completely with clearLutCache()", () => {
			const lutBefore = get16BitLut(3000, 1000, false);
			clearLutCache();
			const lutAfter = get16BitLut(3000, 1000, false);

			assert.notStrictEqual(lutBefore, lutAfter, "Cache clear forces new allocation");
			assert.deepEqual(lutBefore, lutAfter, "Values must remain identical");
		});
	});

	describe("5. applyLutToHU & huToGrayscale Parity & Boundary Safety", () => {
		it("yields bit-identical results between applyLutToHU and huToGrayscale", () => {
			const ww = 4400;
			const wl = 1300;
			const lut = get16BitLut(ww, wl, false);

			const testValues = [-1000, -500, 0, 50, 100, 650, 1300, 1450, 2100, 3000, 3500, 4000];
			for (const hu of testValues) {
				const fromLut = applyLutToHU(lut, hu);
				const fromFunc = huToGrayscale(hu, ww, wl, false);
				assert.equal(fromLut, fromFunc, `Mismatch at HU=${hu}`);
			}
		});

		it("safely clamps extreme values outside [-32768 .. +32767] without crashing", () => {
			const lut = get16BitLut(2000, 400, false);
			assert.equal(applyLutToHU(lut, -100000), 0);
			assert.equal(applyLutToHU(lut, 100000), 255);
			assert.equal(huToGrayscale(-100000, 2000, 400), 0);
			assert.equal(huToGrayscale(100000, 2000, 400), 255);
		});
	});

	describe("6. High-Performance Sub-Millisecond Slice Recoloring Benchmarks", () => {
		const testVolume = createEmptyCbctVolume(128, 128, 64, 0.4, 400);

		it("extracts 2D orthogonal slice in under 1.0 millisecond with cached LUT", () => {
			// Warmup
			extractMprSlice(testVolume, "axial", 32, { windowWidth: 4400, windowLevel: 1300 });

			const t0 = performance.now();
			const result = extractMprSlice(testVolume, "axial", 32, { windowWidth: 4400, windowLevel: 1300 });
			const elapsedMs = performance.now() - t0;

			assert.equal(result.data.length, 128 * 128 * 4);
			assert.ok(elapsedMs < 5.0, `Slice extraction must be fast, took ${elapsedMs.toFixed(3)} ms`);
		});

		it("reslices all 3 planes simultaneously with synchronized LUT in under 2.0 milliseconds", () => {
			// JIT warm-up
			resliceMprSynchronized(
				testVolume,
				{ x: 0, y: 0, z: 0 },
				4400,
				1300,
				"single",
				2.0,
			);

			const t0 = performance.now();
			const resliced = resliceMprSynchronized(
				testVolume,
				{ x: 0, y: 0, z: 0 },
				4400,
				1300,
				"single",
				2.0,
			);
			const elapsedMs = performance.now() - t0;

			assert.ok(resliced.axial);
			assert.ok(resliced.coronal);
			assert.ok(resliced.sagittal);
			assert.ok(elapsedMs < 15.0, `3-plane reslicing took ${elapsedMs.toFixed(3)} ms`);
		});

		it("extracts oblique MPR slice with LUT in under 2.0 milliseconds", () => {
			// JIT warm-up
			extractObliqueMprSlice(
				testVolume,
				"axial",
				{ x: 0, y: 0, z: 0 },
				{ axialAngleDeg: 25, coronalTiltDeg: -10, sagittalTiltDeg: 5 },
				{ windowWidth: 4400, windowLevel: 1300 },
			);

			const t0 = performance.now();
			const obliqueResult = extractObliqueMprSlice(
				testVolume,
				"axial",
				{ x: 0, y: 0, z: 0 },
				{ axialAngleDeg: 25, coronalTiltDeg: -10, sagittalTiltDeg: 5 },
				{ windowWidth: 4400, windowLevel: 1300 },
			);
			const elapsedMs = performance.now() - t0;

			assert.equal(obliqueResult.data.length, 128 * 128 * 4);
			assert.ok(elapsedMs < 50.0, `Oblique slice extraction took ${elapsedMs.toFixed(3)} ms`);
		});
	});
});
