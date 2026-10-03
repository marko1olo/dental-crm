import assert from "node:assert";
import { describe, test } from "node:test";
import {
	applyChamferCornerCutToImageData,
	applyEmboss45ToImageData,
	applyHighBoostToImageData,
	applyUnsharpMaskToImageData,
	buildVisiographLUT,
	DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
	processVisiographImageData,
	type VisiographImageParams,
} from "../VisiographImageProcessor";

describe("Visiograph Image Processing & Real-Time Filters", () => {
	test("neutral parameters produce identity LUT mapping", () => {
		const lut = buildVisiographLUT(DEFAULT_VISIOGRAPH_IMAGE_PARAMS);
		assert.strictEqual(lut.length, 256);
		for (let i = 0; i < 256; i++) {
			assert.strictEqual(
				lut[i],
				i,
				`Expected LUT[${i}] to be ${i}, got ${lut[i]}`,
			);
		}
	});

	test("invert filter creates exact negative film inversion [255 - I]", () => {
		const lut = buildVisiographLUT({
			...DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
			invert: true,
		});

		assert.strictEqual(lut[0], 255);
		assert.strictEqual(lut[255], 0);
		assert.strictEqual(lut[128], 127);
		assert.strictEqual(lut[100], 155);
	});

	test("brightness adjustment shifts values upwards with proper 255 clamping", () => {
		const lut = buildVisiographLUT({
			...DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
			brightness: 20, // +51 shift
		});

		assert.ok(lut[0]! > 0, "Black should be shifted to dark gray");
		assert.strictEqual(lut[250], 255, "Bright values should clamp at 255");
		assert.strictEqual(lut[255], 255);
	});

	test("brightness adjustment shifts values downwards with proper 0 clamping", () => {
		const lut = buildVisiographLUT({
			...DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
			brightness: -20, // -51 shift
		});

		assert.strictEqual(lut[0], 0, "Zero remains zero");
		assert.strictEqual(lut[20], 0, "Dark values should clamp at 0");
		assert.ok(lut[200]! < 200, "Values should be shifted downwards");
	});

	test("contrast adjustment expands tonal range around midpoint 128", () => {
		const lut = buildVisiographLUT({
			...DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
			contrast: 30,
		});

		// Midpoint 128 remains unchanged
		assert.strictEqual(lut[128], 128);

		// Values below 128 become darker
		assert.ok(lut[64]! < 64, "Dark values should become darker");

		// Values above 128 become brighter
		assert.ok(lut[192]! > 192, "Bright values should become brighter");
	});

	test("gamma correction applies non-linear response curve", () => {
		const lutHighGamma = buildVisiographLUT({
			...DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
			gamma: 2.0, // Brightens midtones
		});

		const lutLowGamma = buildVisiographLUT({
			...DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
			gamma: 0.5, // Darkens midtones
		});

		assert.strictEqual(lutHighGamma[0], 0);
		assert.strictEqual(lutHighGamma[255], 255);

		// Gamma 2.0 -> (128/255)^(0.5) * 255 ≈ 180 (brightened)
		assert.ok(
			lutHighGamma[128]! > 128,
			`Expected gamma 2.0 to brighten midpoint, got ${lutHighGamma[128]}`,
		);

		// Gamma 0.5 -> (128/255)^2 * 255 ≈ 64 (darkened)
		assert.ok(
			lutLowGamma[128]! < 128,
			`Expected gamma 0.5 to darken midpoint, got ${lutLowGamma[128]}`,
		);
	});

	test("applyUnsharpMaskToImageData enhances local edge transitions", () => {
		const width = 5;
		const height = 5;
		const buffer = new Uint8ClampedArray(width * height * 4);

		// Create a sharp edge in the middle (left column 50, right column 200)
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const idx = (y * width + x) * 4;
				const val = x < 2 ? 50 : 200;
				buffer[idx] = val; // R
				buffer[idx + 1] = val; // G
				buffer[idx + 2] = val; // B
				buffer[idx + 3] = 255; // A
			}
		}

		const fakeImageData = {
			width,
			height,
			data: buffer,
			colorSpace: "srgb" as PredefinedColorSpace,
		};

		applyUnsharpMaskToImageData(fakeImageData as unknown as ImageData, 50);

		// Sharp edge contrast should be boosted:
		// Pixel before edge (x=1) should be pushed darker (< 50)
		// Pixel after edge (x=2) should be pushed brighter (> 200)
		const idxBefore = (2 * width + 1) * 4;
		const idxAfter = (2 * width + 2) * 4;

		assert.ok(
			buffer[idxBefore]! < 50,
			`Expected pre-edge pixel to be darkened by USM, got ${buffer[idxBefore]}`,
		);
		assert.ok(
			buffer[idxAfter]! > 200,
			`Expected post-edge pixel to be brightened by USM, got ${buffer[idxAfter]}`,
		);
		assert.strictEqual(buffer[idxBefore + 3], 255, "Alpha must stay 255");
	});

	test("applyUnsharpMaskToImageData applies Noise Coring to suppress subtle sensor noise", () => {
		const width = 3;
		const height = 3;
		const buffer = new Uint8ClampedArray(width * height * 4);

		// Sub-threshold noise: all neighbors 100, center 102 (difference 2 <= 5)
		buffer.fill(100);
		const centerIdx = (1 * width + 1) * 4;
		buffer[centerIdx] = 102;
		buffer[centerIdx + 1] = 102;
		buffer[centerIdx + 2] = 102;
		buffer[centerIdx + 3] = 255;

		const fakeImg = { width, height, data: buffer, colorSpace: "srgb" as PredefinedColorSpace };
		applyUnsharpMaskToImageData(fakeImg as unknown as ImageData, 80);

		// Under coring threshold (5), center pixel should be preserved without noise boosting
		assert.strictEqual(buffer[centerIdx], 102, "Noise below threshold should be cored out");
	});

	test("applyEmboss45ToImageData generates 128 baseline on flat areas and highlights relief edges", () => {
		const width = 5;
		const height = 5;
		const buffer = new Uint8ClampedArray(width * height * 4);
		buffer.fill(150); // Uniform gray
		for (let i = 3; i < buffer.length; i += 4) buffer[i] = 255;

		const fakeImg = { width, height, data: buffer, colorSpace: "srgb" as PredefinedColorSpace };
		applyEmboss45ToImageData(fakeImg as unknown as ImageData);

		// Center pixel in flat area must evaluate to 128
		const centerIdx = (2 * width + 2) * 4;
		assert.strictEqual(buffer[centerIdx], 128, "Flat regions must produce neutral 128 relief");
		assert.strictEqual(buffer[centerIdx + 3], 255, "Alpha channel preserved");
	});

	test("applyHighBoostToImageData sharply amplifies high frequency dental structures", () => {
		const width = 3;
		const height = 3;
		const buffer = new Uint8ClampedArray(width * height * 4);
		buffer.fill(100); // Background trabeculae 100
		for (let i = 3; i < buffer.length; i += 4) buffer[i] = 255;

		// Apex/canal high frequency impulse: center = 150
		const centerIdx = (1 * width + 1) * 4;
		buffer[centerIdx] = 150;
		buffer[centerIdx + 1] = 150;
		buffer[centerIdx + 2] = 150;

		const fakeImg = { width, height, data: buffer, colorSpace: "srgb" as PredefinedColorSpace };
		applyHighBoostToImageData(fakeImg as unknown as ImageData);

		// High-Boost 13.0 kernel pushes 150 with neighbors 100 to 255
		assert.strictEqual(buffer[centerIdx], 255, "Apical detail must be boosted to maximum brightness");
	});

	test("applyChamferCornerCutToImageData masks beveled sensor corners", () => {
		const width = 10;
		const height = 10;
		const buffer = new Uint8ClampedArray(width * height * 4);
		buffer.fill(200); // White sensor background
		for (let i = 3; i < buffer.length; i += 4) buffer[i] = 255;

		const fakeImg = { width, height, data: buffer, colorSpace: "srgb" as PredefinedColorSpace };
		// Chamfer cut with 4px cut distance
		applyChamferCornerCutToImageData(fakeImg as unknown as ImageData, 4);

		// Bottom-left pixel (x=0, y=9): x + (height - 1 - y) = 0 + (9 - 9) = 0 < 4 -> should be black 0
		const blIdx = (9 * width + 0) * 4;
		assert.strictEqual(buffer[blIdx], 0, "Beveled corner pixel must be cut to black");
		assert.strictEqual(buffer[blIdx + 3], 255);

		// Center pixel (x=5, y=5): 5 + 4 = 9 >= 4 -> should remain untouched 200
		const centerIdx = (5 * width + 5) * 4;
		assert.strictEqual(buffer[centerIdx], 200, "Central sensor active area must remain intact");
	});

	test("processVisiographImageData processes complete buffer with filters and negative LUT", () => {
		const width = 2;
		const height = 2;
		const buffer = new Uint8ClampedArray([
			0, 0, 0, 255,
			100, 100, 100, 255,
			200, 200, 200, 255,
			255, 255, 255, 255,
		]);

		const fakeImageData = {
			width,
			height,
			data: buffer,
			colorSpace: "srgb" as PredefinedColorSpace,
		};

		processVisiographImageData(fakeImageData as unknown as ImageData, {
			...DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
			invert: true,
		});

		assert.strictEqual(buffer[0], 255);
		assert.strictEqual(buffer[1], 255);
		assert.strictEqual(buffer[2], 255);
		assert.strictEqual(buffer[3], 255);

		assert.strictEqual(buffer[12], 0);
		assert.strictEqual(buffer[13], 0);
		assert.strictEqual(buffer[14], 0);
		assert.strictEqual(buffer[15], 255);
	});
});
