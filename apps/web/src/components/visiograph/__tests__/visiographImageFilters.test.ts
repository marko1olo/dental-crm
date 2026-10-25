import assert from "node:assert";
import { describe, test } from "node:test";
import {
	applyChamferCornerCutToImageData,
	applyEmboss45ToImageData,
	applyHighBoostToImageData,
	applyUnsharpMaskToImageData,
	processVisiographImageData,
} from "../VisiographImageProcessor";

describe("Visiograph Spatial Image Filters", () => {
	test("applyUnsharpMaskToImageData enhances local edge transitions", () => {
		const width = 5;
		const height = 5;
		const buffer = new Uint8ClampedArray(width * height * 4);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const idx = (y * width + x) * 4;
				const val = x < 2 ? 50 : 200;
				buffer[idx] = val; buffer[idx + 1] = val; buffer[idx + 2] = val; buffer[idx + 3] = 255;
			}
		}
		const fakeImageData = { width, height, data: buffer, colorSpace: "srgb" as PredefinedColorSpace };
		applyUnsharpMaskToImageData(fakeImageData as unknown as ImageData, 50);
		const idxBefore = (2 * width + 1) * 4;
		const idxAfter = (2 * width + 2) * 4;
		assert.ok(buffer[idxBefore]! < 50);
		assert.ok(buffer[idxAfter]! > 200);
		assert.strictEqual(buffer[idxBefore + 3], 255);
	});

	test("applyUnsharpMaskToImageData applies Noise Coring to suppress subtle sensor noise", () => {
		const width = 3;
		const height = 3;
		const buffer = new Uint8ClampedArray(width * height * 4);
		buffer.fill(100);
		const centerIdx = (1 * width + 1) * 4;
		buffer[centerIdx] = 102; buffer[centerIdx + 1] = 102; buffer[centerIdx + 2] = 102; buffer[centerIdx + 3] = 255;
		const fakeImg = { width, height, data: buffer, colorSpace: "srgb" as PredefinedColorSpace };
		applyUnsharpMaskToImageData(fakeImg as unknown as ImageData, 80);
		assert.strictEqual(buffer[centerIdx], 102);
	});

	test("applyEmboss45ToImageData generates 128 baseline on flat areas and highlights relief edges", () => {
		const width = 5;
		const height = 5;
		const buffer = new Uint8ClampedArray(width * height * 4);
		buffer.fill(150);
		for (let i = 3; i < buffer.length; i += 4) buffer[i] = 255;
		const fakeImg = { width, height, data: buffer, colorSpace: "srgb" as PredefinedColorSpace };
		applyEmboss45ToImageData(fakeImg as unknown as ImageData);
		const centerIdx = (2 * width + 2) * 4;
		assert.strictEqual(buffer[centerIdx], 128);
		assert.strictEqual(buffer[centerIdx + 3], 255);
	});

	test("applyHighBoostToImageData sharply amplifies high frequency dental structures", () => {
		const width = 3;
		const height = 3;
		const buffer = new Uint8ClampedArray(width * height * 4);
		buffer.fill(100);
		for (let i = 3; i < buffer.length; i += 4) buffer[i] = 255;
		const centerIdx = (1 * width + 1) * 4;
		buffer[centerIdx] = 150; buffer[centerIdx + 1] = 150; buffer[centerIdx + 2] = 150;
		const fakeImg = { width, height, data: buffer, colorSpace: "srgb" as PredefinedColorSpace };
		applyHighBoostToImageData(fakeImg as unknown as ImageData);
		assert.strictEqual(buffer[centerIdx], 255);
	});

	test("applyChamferCornerCutToImageData masks beveled sensor corners", () => {
		const width = 10;
		const height = 10;
		const buffer = new Uint8ClampedArray(width * height * 4);
		buffer.fill(200);
		for (let i = 3; i < buffer.length; i += 4) buffer[i] = 255;
		const fakeImg = { width, height, data: buffer, colorSpace: "srgb" as PredefinedColorSpace };
		applyChamferCornerCutToImageData(fakeImg as unknown as ImageData, 4);
		assert.strictEqual(buffer[(9 * 10 + 0) * 4], 0);
	});

	test("processVisiographImageData processes complete buffer with filters and negative LUT", () => {
		const width = 4;
		const height = 4;
		const buffer = new Uint8ClampedArray(width * height * 4);
		buffer.fill(100);
		for (let i = 3; i < buffer.length; i += 4) buffer[i] = 255;
		const fakeImg = { width, height, data: buffer, colorSpace: "srgb" as PredefinedColorSpace };
		processVisiographImageData(fakeImg as unknown as ImageData, {
			brightness: 0, contrast: 0, gamma: 1.0, sharpness: 0, invert: true,
		});
		assert.strictEqual(buffer[0], 155);
	});
});
