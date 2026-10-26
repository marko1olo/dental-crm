import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Tooth46CariesBar } from "./Tooth46CariesBar";
import { Tooth46StandToggles } from "./Tooth46StandToggles";
import { DEFAULT_TOOTH46_LAYERS } from "./tooth46Types";

describe("Gate 0 — Tooth46CariesBar (Caries Class & WHO Depth Quick Picker)", () => {
	it("renders nothing when caries is false", () => {
		const html = renderToString(React.createElement(Tooth46CariesBar, {
			layers: { ...DEFAULT_TOOTH46_LAYERS, caries: false },
		}));
		assert.equal(html, "");
	});

	it("renders 2-level segmented bar with 7 classes and 4 depths when caries is active", () => {
		const html = renderToString(React.createElement(Tooth46CariesBar, {
			layers: { ...DEFAULT_TOOTH46_LAYERS, caries: true, cariesType: "class1", cariesDepth: "media" },
		}));
		assert.ok(html.includes('id="tooth46-caries-quick-bar"'));
		for (const cls of ["O", "M", "D", "MO", "DO", "MOD", "V"]) {
			assert.ok(html.includes(`data-caries-class="${cls}"`), `Missing class button ${cls}`);
		}
		for (const depth of ["superficial", "media", "profunda", "destructive"]) {
			assert.ok(html.includes(`data-caries-depth="${depth}"`), `Missing depth button ${depth}`);
		}
		for (const label of ["Пятно", "Средний", "Глубокий", "Скол"]) {
			assert.ok(html.includes(label), `Missing depth label ${label}`);
		}
	});

	it("verifies Apple HIG touch targets >= 44x44px and zero raster filters", () => {
		const html = renderToString(React.createElement(Tooth46CariesBar, {
			layers: { ...DEFAULT_TOOTH46_LAYERS, caries: true },
		}));
		// Apple HIG touch ergonomics check
		assert.ok(html.includes("min-h-[44px]"), "All buttons must enforce min-h-[44px] on mobile");
		assert.ok(html.includes("min-w-[44px]"), "Class buttons must enforce min-w-[44px] on mobile");
		// Zero raster filters invariant
		assert.ok(!html.includes("<filter"), "Must contain zero SVG filters");
		assert.ok(!html.includes("feGaussianBlur"), "Must contain zero feGaussianBlur");
	});

	it("integrates seamlessly into Tooth46StandToggles when caries layer is toggled", () => {
		const withCaries = renderToString(React.createElement(Tooth46StandToggles, {
			layers: { ...DEFAULT_TOOTH46_LAYERS, caries: true },
			onSelectPreset: () => {},
			onToggle: () => {},
		}));
		assert.ok(withCaries.includes('id="tooth46-caries-quick-bar"'));

		const withoutCaries = renderToString(React.createElement(Tooth46StandToggles, {
			layers: { ...DEFAULT_TOOTH46_LAYERS, caries: false },
			onSelectPreset: () => {},
			onToggle: () => {},
		}));
		assert.ok(!withoutCaries.includes('id="tooth46-caries-quick-bar"'));
	});
});
