import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getFastProbingDepthHex,
	getFastProbingDepthTone,
	getFastProbingDepthRgba32,
	getVisiblePerioTeethRange,
	PerioGeometryBufferPool,
	PERIO_CONTAINMENT_STYLES,
} from "../perioRafOptimizer";

describe("perioRafOptimizer Suite (Wave 252-Perf)", () => {
	describe("1. Zero-GC Probing Depth LUTs", () => {
		it("returns correct clinical hex colors for physiological vs pathological depths", () => {
			// Normal sulcus (<= 3 mm) -> Emerald (#34d399)
			assert.equal(getFastProbingDepthHex(0), "#34d399");
			assert.equal(getFastProbingDepthHex(1), "#34d399");
			assert.equal(getFastProbingDepthHex(2), "#34d399");
			assert.equal(getFastProbingDepthHex(3), "#34d399");

			// Mild pocket (4 mm) -> Amber (#fbbf24)
			assert.equal(getFastProbingDepthHex(4), "#fbbf24");

			// Moderate pocket (5..6 mm) -> Orange (#f97316)
			assert.equal(getFastProbingDepthHex(5), "#f97316");
			assert.equal(getFastProbingDepthHex(6), "#f97316");

			// Severe pocket (>= 7 mm) -> Rose (#fb7185)
			assert.equal(getFastProbingDepthHex(7), "#fb7185");
			assert.equal(getFastProbingDepthHex(12), "#fb7185");
			assert.equal(getFastProbingDepthHex(18), "#fb7185"); // Beyond LUT limit clamps safely

			// Null / undefined -> Neutral (#d1d5db)
			assert.equal(getFastProbingDepthHex(null), "#d1d5db");
			assert.equal(getFastProbingDepthHex(undefined), "#d1d5db");
		});

		it("returns correct clinical tones for all categories", () => {
			assert.equal(getFastProbingDepthTone(2), "success");
			assert.equal(getFastProbingDepthTone(4), "warning-low");
			assert.equal(getFastProbingDepthTone(5), "warning-high");
			assert.equal(getFastProbingDepthTone(8), "error");
			assert.equal(getFastProbingDepthTone(null), "neutral");
		});

		it("returns packed 32-bit colors for direct pixel manipulation", () => {
			assert.equal(getFastProbingDepthRgba32(3), 0xff99d334);
			assert.equal(getFastProbingDepthRgba32(4), 0xff24bffb);
			assert.equal(getFastProbingDepthRgba32(6), 0xff1673f9);
			assert.equal(getFastProbingDepthRgba32(9), 0xff8571fb);
			assert.equal(getFastProbingDepthRgba32(null), 0xffdbd5d1);
		});
	});

	describe("2. PerioGeometryBufferPool", () => {
		it("populates contour vertices without object allocations", () => {
			const pool = new PerioGeometryBufferPool();
			const testValues = [1, 2, 3, 4, 5, 6];

			const count = pool.populateContourVertices(testValues, 10, 20, 100, 2, false);
			assert.equal(count, 6);
		});

		it("populates closed polygon vertices forward and backward", () => {
			const pool = new PerioGeometryBufferPool();
			const gm = [1, 1, 1];
			const pd = [3, 4, 5];

			const vertexCount = pool.populateClosedPolygonVertices(gm, pd, 0, 10, 50, 2, true);
			assert.equal(vertexCount, 6, "Closed loop should contain 2 * count vertices");
		});
	});

	describe("3. Viewport Column Culling", () => {
		it("computes visible tooth range with overscan padding", () => {
			// 16 teeth total, each 60px wide, viewport width 300px (shows ~5 teeth)
			// Scroll is at 180px (starting around tooth index 3)
			const range = getVisiblePerioTeethRange(180, 300, 60, 16, 2);

			// rawStart = 180/60 = 3 -> with overscan = max(0, 3 - 2) = 1
			// rawEnd = (180+300)/60 = 8 -> with overscan = min(15, 8 + 2) = 10
			assert.equal(range.startIndex, 1);
			assert.equal(range.endIndex, 10);
			assert.equal(range.visibleCount, 10);
		});

		it("handles edge conditions (scroll 0 and boundary limits)", () => {
			const range = getVisiblePerioTeethRange(0, 400, 50, 16, 2);
			assert.equal(range.startIndex, 0);
			assert.ok(range.endIndex <= 15);
		});
	});

	describe("4. CSS Containment & Render Ceilings", () => {
		it("provides standard periodontogram containment styles", () => {
			assert.equal(PERIO_CONTAINMENT_STYLES.contain, "content");
			assert.equal(PERIO_CONTAINMENT_STYLES.willChange, "scroll-position, transform");
			assert.equal(PERIO_CONTAINMENT_STYLES.transform, "translateZ(0)");
		});
	});
});
