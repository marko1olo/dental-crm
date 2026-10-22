import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getFastProbingDepthHex,
	getFastProbingDepthTone,
	getFastProbingDepthRgba32,
	getFastClinicalProbingDepthHex,
	getFastClinicalProbingDepthTone,
	getVisiblePerioTeethRange,
	PERIO_CONTAINMENT_STYLES,
} from "../perioRafOptimizer";

describe("perioRafOptimizer Suite (Zero-Simulation & Fast LUTs)", () => {
	describe("1. Zero-GC Probing Depth LUTs", () => {
		it("returns correct clinical hex colors for physiological vs pathological depths", () => {
			// Норма борозды (<= 3 мм) -> Emerald (#34d399)
			assert.equal(getFastProbingDepthHex(0), "#34d399");
			assert.equal(getFastProbingDepthHex(1), "#34d399");
			assert.equal(getFastProbingDepthHex(2), "#34d399");
			assert.equal(getFastProbingDepthHex(3), "#34d399");

			// Ранний карман (4 мм) -> Amber (#fbbf24)
			assert.equal(getFastProbingDepthHex(4), "#fbbf24");

			// Умеренный карман (5..6 мм) -> Orange (#f97316)
			assert.equal(getFastProbingDepthHex(5), "#f97316");
			assert.equal(getFastProbingDepthHex(6), "#f97316");

			// Глубокий карман (>= 7 мм) -> Rose (#fb7185)
			assert.equal(getFastProbingDepthHex(7), "#fb7185");
			assert.equal(getFastProbingDepthHex(12), "#fb7185");
			assert.equal(getFastProbingDepthHex(18), "#fb7185");

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

		it("returns 4-tier clinical colors for periodontal pathology", () => {
			assert.equal(getFastClinicalProbingDepthHex(2), "#34d399");
			assert.equal(getFastClinicalProbingDepthHex(4), "#fbbf24");
			assert.equal(getFastClinicalProbingDepthHex(6), "#f97316");
			assert.equal(getFastClinicalProbingDepthHex(8), "#e11d48");
			assert.equal(getFastClinicalProbingDepthTone(2), "success");
			assert.equal(getFastClinicalProbingDepthTone(8), "critical");
		});
	});

	describe("2. Viewport Column Culling", () => {
		it("computes visible tooth range with overscan padding", () => {
			const range = getVisiblePerioTeethRange(180, 300, 60, 16, 2);
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

	describe("3. CSS Containment & Render Ceilings", () => {
		it("provides standard periodontogram containment styles", () => {
			assert.equal(PERIO_CONTAINMENT_STYLES.contain, "content");
			assert.equal(PERIO_CONTAINMENT_STYLES.willChange, "scroll-position, transform");
			assert.equal(PERIO_CONTAINMENT_STYLES.transform, "translateZ(0)");
		});
	});
});
