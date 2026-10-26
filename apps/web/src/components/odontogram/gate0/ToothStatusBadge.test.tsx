import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TOOTH46_CARIES_DEPTH_PRESETS } from "./Tooth46CariesDepthPresets";
import { resolveToothStatusBadge, ToothStatusBadge } from "./ToothStatusBadge";

const DEPTH_BG: Record<string, string> = {
	superficial: "#f87171",
	media: "#ef4444",
	profunda: "#dc2626",
	destructive: "#991b1b",
};

describe("Gate 0 ToothStatusBadge — 36 Black x Depth Clinical Matrix", () => {
	it("resolves all 36 Black x Depth presets by presetId and by layers with exact codes and colors", () => {
		assert.equal(TOOTH46_CARIES_DEPTH_PRESETS.length, 36);

		for (const preset of TOOTH46_CARIES_DEPTH_PRESETS) {
			const byId = resolveToothStatusBadge(preset.id);
			assert.equal(byId.code, preset.badge, `Badge code for preset ${preset.id} must be ${preset.badge}`);
			const expectedBg = DEPTH_BG[preset.layers.cariesDepth ?? "media"];
			assert.equal(byId.bg, expectedBg, `Badge bg for preset ${preset.id} must be ${expectedBg}`);

			const byLayers = resolveToothStatusBadge(undefined, preset.layers);
			assert.equal(byLayers.code, preset.badge, `Badge code by layers for ${preset.id} must be ${preset.badge}`);
			assert.equal(byLayers.bg, expectedBg, `Badge bg by layers for ${preset.id} must be ${expectedBg}`);
		}
	});

	it("renders SVG status badge element with role, title, circle fill and text code", () => {
		for (const preset of TOOTH46_CARIES_DEPTH_PRESETS) {
			const html = renderToString(
				React.createElement(ToothStatusBadge, {
					presetId: preset.id,
					layers: preset.layers,
				}),
			);
			assert.ok(html.includes('role="status"'), "Must include role='status'");
			assert.ok(html.includes(`>${preset.badge}<`), `Must render badge code ${preset.badge}`);
			const expectedBg = DEPTH_BG[preset.layers.cariesDepth ?? "media"];
			assert.ok(html.includes(`fill="${expectedBg}"`), `Must render circle fill ${expectedBg}`);
		}
	});

	it("resolves baseline non-caries statuses correctly", () => {
		assert.equal(resolveToothStatusBadge("intact").code, "✓");
		assert.equal(resolveToothStatusBadge("missing").code, "О");
		assert.equal(resolveToothStatusBadge("implant").code, "И");
		assert.equal(resolveToothStatusBadge("composite").code, "П");
		assert.equal(resolveToothStatusBadge("crown").code, "К");
		assert.equal(resolveToothStatusBadge(undefined, { intact: true } as any).code, "✓");
	});
});
