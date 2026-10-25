import assert from "node:assert";
import { describe, test } from "node:test";
import { buildVisiographLUT, DEFAULT_VISIOGRAPH_IMAGE_PARAMS } from "../VisiographImageProcessor";

describe("Visiograph LUT Generation & Transfer Functions", () => {
	test("neutral parameters produce identity LUT mapping", () => {
		const lut = buildVisiographLUT(DEFAULT_VISIOGRAPH_IMAGE_PARAMS);
		assert.strictEqual(lut.length, 256);
		for (let i = 0; i < 256; i++) {
			assert.strictEqual(lut[i], i);
		}
	});

	test("invert filter creates exact negative film inversion [255 - I]", () => {
		const lut = buildVisiographLUT({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS, invert: true });
		assert.strictEqual(lut[0], 255);
		assert.strictEqual(lut[255], 0);
		assert.strictEqual(lut[128], 127);
	});

	test("brightness adjustment shifts values upwards with proper 255 clamping", () => {
		const lut = buildVisiographLUT({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS, brightness: 20 });
		assert.ok(lut[0]! > 0);
		assert.strictEqual(lut[250], 255);
		assert.strictEqual(lut[255], 255);
	});

	test("brightness adjustment shifts values downwards with proper 0 clamping", () => {
		const lut = buildVisiographLUT({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS, brightness: -20 });
		assert.strictEqual(lut[0], 0);
		assert.strictEqual(lut[20], 0);
		assert.ok(lut[200]! < 200);
	});

	test("contrast adjustment expands tonal range around midpoint 128", () => {
		const lut = buildVisiographLUT({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS, contrast: 30 });
		assert.strictEqual(lut[128], 128);
		assert.ok(lut[64]! < 64);
		assert.ok(lut[192]! > 192);
	});

	test("gamma correction applies non-linear response curve", () => {
		const lutHighGamma = buildVisiographLUT({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS, gamma: 2.0 });
		const lutLowGamma = buildVisiographLUT({ ...DEFAULT_VISIOGRAPH_IMAGE_PARAMS, gamma: 0.5 });
		assert.strictEqual(lutHighGamma[0], 0);
		assert.strictEqual(lutHighGamma[255], 255);
		assert.ok(lutHighGamma[128]! > 128);
		assert.ok(lutLowGamma[128]! < 128);
	});
});
