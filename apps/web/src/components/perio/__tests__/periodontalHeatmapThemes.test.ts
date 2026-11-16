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
	it("probingDepthHex maps tones to DentalPin hex codes or semantic tokens", () => {
		assert.ok(probingDepthHex(null).includes("muted") || probingDepthHex(null) === "#d1d5db");
		assert.ok(probingDepthHex(2).includes("teal") || probingDepthHex(2) === "#34d399");
		assert.ok(probingDepthHex(4).includes("warning") || probingDepthHex(4) === "#fbbf24");
		assert.ok(probingDepthHex(5).includes("warning") || probingDepthHex(5) === "#f97316");
		assert.ok(probingDepthHex(8).includes("danger") || probingDepthHex(8) === "#fb7185");
	});

	it("probingDepthClasses provides appropriate design tokens", () => {
		const healthy = probingDepthClasses(2);
		assert.ok(healthy.includes("teal") || healthy.includes("emerald"), "Must contain teal or emerald for 2 mm");

		const early = probingDepthClasses(4);
		assert.ok(early.includes("warning") || early.includes("amber"), "Must contain warning or amber for 4 mm");

		const mod = probingDepthClasses(5);
		assert.ok(mod.includes("warning") || mod.includes("orange"), "Must contain warning or orange for 5 mm");

		const severe = probingDepthClasses(8);
		assert.ok(severe.includes("danger") || severe.includes("rose"), "Must contain danger or rose for 8 mm");
	});

	it("probingDepthClinicalClasses provides high-contrast classes", () => {
		const norm = probingDepthClinicalClasses(2);
		assert.ok(norm.includes("teal") || norm.includes("emerald"), "Must contain teal or emerald token");

		const warning = probingDepthClinicalClasses(5);
		assert.ok(warning.includes("warning") || warning.includes("amber") || warning.includes("yellow"), "Must contain warning token");

		const deep = probingDepthClinicalClasses(8);
		assert.ok(deep.includes("danger") || deep.includes("rose") || deep.includes("red"), "Must contain critical danger token");
	});
});
