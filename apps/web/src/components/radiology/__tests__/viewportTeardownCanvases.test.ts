import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { teardownViewportCanvases } from "../../../utils/viewportTeardownHelper";

describe("Viewport Teardown Helper — Low-Spec GPU VRAM Release (Mandate 8c)", () => {
	it("teardownViewportCanvases zeros canvas dimensions and clears 2D/WebGL contexts", () => {
		let clearRectCalled = false;
		let loseContextCalled = false;

		const mockCanvas = {
			width: 1024,
			height: 768,
			getContext: (type: string) => {
				if (type === "2d") {
					return {
						clearRect: () => {
							clearRectCalled = true;
						},
					};
				}
				if (type === "webgl" || type === "webgl2") {
					return {
						getExtension: (ext: string) => {
							if (ext === "WEBGL_lose_context") {
								return {
									loseContext: () => {
										loseContextCalled = true;
									},
								};
							}
							return null;
						},
					};
				}
				return null;
			},
		} as any;

		const mockContainer = {
			querySelectorAll: (selector: string) => {
				if (selector === "canvas") {
					return [mockCanvas];
				}
				return [];
			},
		} as any;

		teardownViewportCanvases(mockContainer);

		assert.equal(mockCanvas.width, 0, "Canvas width must be zeroed to release GPU backing store");
		assert.equal(mockCanvas.height, 0, "Canvas height must be zeroed to release GPU backing store");
		assert.equal(loseContextCalled, true, "WEBGL_lose_context must be invoked to force VRAM release");
		assert.equal(clearRectCalled, true, "clearRect must be invoked to free 2D buffer");
	});
});
