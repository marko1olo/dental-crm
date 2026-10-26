import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Tooth46Container } from "./index";
import { TOOTH46_CARIES_DEPTH_PRESETS } from "./Tooth46CariesDepthPresets";

const DEPTH_COLORS: Record<string, string> = {
	superficial: "#f87171",
	media: "#ef4444",
	profunda: "#dc2626",
	destructive: "#991b1b",
};

describe("Gate 0 Caries Spectrum & Bonded Restorations — Tooth 46", () => {
	it("renders full caries spectrum: Class II MO/DO/MOD, Class V, White Spot, Acute/Chronic and Onlay/Inlay", () => {
		const wsHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { caries: true, cariesType: "white_spot" },
			}),
		);
		assert.ok(wsHtml.includes("tooth46-caries-white-spot"));

		const c2MoHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { caries: true, cariesType: "class2_mo" },
			}),
		);
		assert.ok(c2MoHtml.includes("tooth46-caries-class2-mo"));

		const c2DoHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { caries: true, cariesType: "class2_do" },
			}),
		);
		assert.ok(c2DoHtml.includes("tooth46-caries-class2-do"));

		const c2ModHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { caries: true, cariesType: "class2_mod" },
			}),
		);
		assert.ok(c2ModHtml.includes("tooth46-caries-class2-mo"));
		assert.ok(c2ModHtml.includes("tooth46-caries-class2-do"));
		assert.ok(c2ModHtml.includes("tooth46-caries-class2-mod-isthmus"));

		const c5Html = renderToString(
			React.createElement(Tooth46Container, {
				layers: { caries: true, cariesType: "class5" },
			}),
		);
		assert.ok(c5Html.includes("tooth46-caries-class5"));

		const chronicHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { caries: true, cariesChronicity: "chronic" },
			}),
		);
		assert.ok(chronicHtml.includes("dente-caries-chronic"));

		const inlayHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { inlayOnlay: "inlay" },
			}),
		);
		assert.ok(inlayHtml.includes("tooth46-ceramic-inlay"));

		const onlayHtml = renderToString(
			React.createElement(Tooth46Container, {
				layers: { inlayOnlay: "onlay" },
			}),
		);
		assert.ok(onlayHtml.includes("tooth46-ceramic-onlay"));
	});

	it("renders all 36 Black x Depth caries spectrum presets with correct data attributes, badge code and color", () => {
		assert.equal(TOOTH46_CARIES_DEPTH_PRESETS.length, 36, "Must have all 36 Black x Depth presets");
		for (const preset of TOOTH46_CARIES_DEPTH_PRESETS) {
			const html = renderToString(
				React.createElement(Tooth46Container, {
					presetId: preset.id,
					layers: preset.layers,
				}),
			);
			assert.ok(
				html.includes(`data-caries-type="${preset.layers.cariesType}"`),
				`Preset ${preset.id} must include data-caries-type="${preset.layers.cariesType}"`,
			);
			assert.ok(
				html.includes(`data-caries-depth="${preset.layers.cariesDepth}"`),
				`Preset ${preset.id} must include data-caries-depth="${preset.layers.cariesDepth}"`,
			);
			assert.ok(
				html.includes(`>${preset.badge}<`),
				`Preset ${preset.id} must render badge text "${preset.badge}"`,
			);
			const expectedBg = DEPTH_COLORS[preset.layers.cariesDepth ?? "media"];
			assert.ok(
				html.includes(`fill="${expectedBg}"`),
				`Preset ${preset.id} badge must have depth color ${expectedBg}`,
			);
		}
	});
});
