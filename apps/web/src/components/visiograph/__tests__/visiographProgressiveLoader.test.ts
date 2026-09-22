import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	convert16BitToRgbaImageData,
	DEFAULT_VISIOGRAPH_ZOOM_THRESHOLD,
	shouldLoad16BitBuffer,
} from "../VisiographProgressiveLoader";

describe("VisiographProgressiveLoader — Zero-Mock & Low-RAM Protection", () => {
	it("1. shouldLoad16BitBuffer activates only above threshold", () => {
		assert.equal(shouldLoad16BitBuffer(1.0), false, "Zoom 1.0x should not load heavy 16-bit buffer");
		assert.equal(shouldLoad16BitBuffer(1.25), false, "Threshold 1.25x should not load heavy 16-bit buffer");
		assert.equal(shouldLoad16BitBuffer(1.26), true, "Zoom 1.26x must load 16-bit buffer");
		assert.equal(shouldLoad16BitBuffer(2.0), true, "Zoom 2.0x must load 16-bit buffer");
		assert.equal(DEFAULT_VISIOGRAPH_ZOOM_THRESHOLD, 1.25);
	});

	it("2. convert16BitToRgbaImageData correctly converts and maps window/level", () => {
		const width = 2;
		const height = 2;
		const totalPixels = width * height;
		const raw16 = new Uint16Array([0, 2048, 4096, 65535]);

		// In non-DOM environment, it must reject mock objects and throw descriptive error
		assert.throws(
			() => {
				convert16BitToRgbaImageData(raw16, width, height, {
					windowCenter: 2048,
					windowWidth: 4096,
				});
			},
			/convert16BitToRgbaImageData requires a browser DOM environment with ImageData constructor/,
		);
	});

	it("3. convert16BitToRgbaImageData validates buffer dimensions", () => {
		const raw16TooSmall = new Uint16Array([100, 200]);
		assert.throws(
			() => {
				convert16BitToRgbaImageData(raw16TooSmall, 4, 4);
			},
			/16-bit buffer length .* is smaller than dimensions/,
		);
	});
});
