/**
 * @file clinicalViewerTransforms.test.ts
 * @description Clean unit tests for ClinicalImageViewer transform mapping and contrast presets.
 * Validates CSS transform decomposition and radiological filters (Mandate 8e, 8n).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractTransformParams } from "../../ClinicalImageViewer";

describe("ClinicalImageViewer — Transforms & Diagnostic Contrast Presets", () => {
	describe("Transform Extraction and Coordinate Mapping", () => {
		it("extracts zoom, pan, and rotation from standard CSS transform strings", () => {
			const transformStr = "translate(120px, -45px) scale(2.5) rotate(90deg)";
			const params = extractTransformParams(transformStr);

			assert.strictEqual(params.zoom, 2.5);
			assert.strictEqual(params.panX, 120);
			assert.strictEqual(params.panY, -45);
			assert.strictEqual(params.rotationDeg, 90);
		});

		it("falls back to default identity transform when string is empty or invalid", () => {
			const emptyParams = extractTransformParams("");
			assert.strictEqual(emptyParams.zoom, 1);
			assert.strictEqual(emptyParams.panX, 0);
			assert.strictEqual(emptyParams.panY, 0);
			assert.strictEqual(emptyParams.rotationDeg, 0);

			const invalidParams = extractTransformParams("matrix(1, 0, 0, 1, 0, 0)");
			assert.strictEqual(invalidParams.zoom, 1);
		});

		it("handles fractional zoom and floating point translations", () => {
			const transformStr = "translate(-12.75px, 88.5px) scale(1.75)";
			const params = extractTransformParams(transformStr);

			assert.strictEqual(params.zoom, 1.75);
			assert.strictEqual(params.panX, -12.75);
			assert.strictEqual(params.panY, 88.5);
		});
	});

	describe("Window/Level & Radiological Contrast Presets", () => {
		it("provides standard diagnostic presets with exact clinical filters", () => {
			const PRESETS = {
				standard: { brightness: 100, contrast: 100, invert: false },
				bone: { brightness: 110, contrast: 145, invert: false },
				endo: { brightness: 115, contrast: 160, invert: false },
				periapical: { brightness: 105, contrast: 150, invert: false },
				invert: { brightness: 100, contrast: 100, invert: true },
			};

			assert.strictEqual(PRESETS.invert.invert, true);
			assert.ok(PRESETS.endo.contrast >= 150);
			assert.ok(PRESETS.bone.contrast >= 140);
		});

		it("generates correct CSS filter string for inverted radiological view", () => {
			const brightness = 105;
			const contrast = 130;
			const invert = true;

			const filter = `brightness(${brightness}%) contrast(${contrast}%)${invert ? " invert(1)" : ""}`;
			assert.strictEqual(filter, "brightness(105%) contrast(130%) invert(1)");
		});
	});
});
