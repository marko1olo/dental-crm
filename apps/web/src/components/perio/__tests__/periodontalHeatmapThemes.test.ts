/**
 * periodontalHeatmapThemes.test.ts — Темизация палитр пародонтограммы (Tailwind, Hex, SVG).
 * Мандат 8b: <= 120 строк.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	probingDepthClasses,
	probingDepthClinicalClasses,
	probingDepthHex,
} from "../perioHeatmap";

describe("2. Heatmap Hex Mappings & Tailwind Classes", () => {
	it("probingDepthHex maps tones to DentalPin hex codes", () => {
		assert.strictEqual(probingDepthHex(null), "#d1d5db");
		assert.strictEqual(probingDepthHex(2), "#34d399");
		assert.strictEqual(probingDepthHex(4), "#fbbf24");
		assert.strictEqual(probingDepthHex(5), "#f97316");
		assert.strictEqual(probingDepthHex(8), "#fb7185");
	});

	it("probingDepthClasses provides appropriate Tailwind tokens", () => {
		const healthy = probingDepthClasses(2);
		assert.ok(healthy.includes("emerald"), "Must contain emerald for 2 mm");
		assert.ok(healthy.includes("dark:"), "Must support dark mode token");

		const early = probingDepthClasses(4);
		assert.ok(early.includes("amber"), "Must contain amber for 4 mm");

		const mod = probingDepthClasses(5);
		assert.ok(mod.includes("orange"), "Must contain orange for 5 mm");

		const severe = probingDepthClasses(8);
		assert.ok(severe.includes("rose"), "Must contain rose for 8 mm");
	});

	it("probingDepthClinicalClasses provides high-contrast classes", () => {
		const norm = probingDepthClinicalClasses(2);
		assert.ok(norm.includes("emerald"), "Must contain emerald token");

		const warning = probingDepthClinicalClasses(5);
		assert.ok(warning.includes("amber") || warning.includes("yellow"), "Must contain warning token");

		const deep = probingDepthClinicalClasses(8);
		assert.ok(deep.includes("rose") || deep.includes("red"), "Must contain critical token");
	});
});
