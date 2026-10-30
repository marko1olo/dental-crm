import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { PediatricTeethChart } from "../../PediatricTeethChart";

describe("Pediatric Mobile HIG Quadrants Ergonomics", () => {
	it("PediatricTeethChart renders sovereign mobile quadrant selector (Apple HIG: Anti-Desktop-Squeeze)", () => {
		const html = renderToString(createElement(PediatricTeethChart, { activeTooth: 54, mode: "primary" }));

		assert.ok(html.includes("pediatric-mobile-quadrant-view"));
		assert.ok(html.includes("pediatric-quadrants-selector"));
		assert.ok(html.includes("pediatric-quadrant-btn-q5"));
		assert.ok(html.includes("pediatric-quadrant-btn-q6"));
		assert.ok(html.includes("pediatric-quadrant-btn-q7"));
		assert.ok(html.includes("pediatric-quadrant-btn-q8"));

		assert.ok(html.includes("pediatric-mobile-teeth-grid"));
		assert.ok(html.includes("grid-cols-5"));
		assert.ok(html.includes("min-h-[44px]"));
	});

	it("PediatricTeethChart in mixed dentition mode adapts mobile quadrant to 6 teeth", () => {
		const html = renderToString(createElement(PediatricTeethChart, { activeTooth: 16, mode: "mixed" }));
		assert.ok(html.includes("grid-cols-6"));
		assert.ok(html.includes("Пост"));
	});
});
