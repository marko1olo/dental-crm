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
		const checks = [
			[{ caries: true, cariesType: "white_spot" }, "tooth46-caries-white-spot"],
			[{ caries: true, cariesType: "class2_mo" }, "tooth46-caries-class2-mo"],
			[{ caries: true, cariesType: "class2_do" }, "tooth46-caries-class2-do"],
			[{ caries: true, cariesType: "class2_mod" }, "tooth46-caries-class2-mod-isthmus"],
			[{ caries: true, cariesType: "class5" }, "tooth46-caries-class5"],
			[{ caries: true, cariesChronicity: "chronic" }, "dente-caries-chronic"],
			[{ inlayOnlay: "inlay" }, "tooth46-ceramic-inlay"],
			[{ inlayOnlay: "onlay" }, "tooth46-ceramic-onlay"],
		] as const;
		for (const [layers, expected] of checks) {
			const html = renderToString(React.createElement(Tooth46Container, { layers }));
			assert.ok(html.includes(expected), `Missing ${expected}`);
		}
	});

	it("renders default Class 1 Media upon bare caries:true (1-click preset) with C1m badge", () => {
		const html = renderToString(React.createElement(Tooth46Container, { layers: { caries: true } }));
		assert.ok(html.includes("tooth46-caries-class1"));
		assert.ok(html.includes("dente-caries-lesion"));
		assert.ok(html.includes(">C1m<"));
		assert.ok(html.includes('data-caries-type="class1"'));
		assert.ok(html.includes('data-caries-depth="media"'));
	});

	it("renders all 20 Class II combinations (M, D, MO, DO, MOD x 4 depths) with badges and masks", () => {
		const subClasses = [
			{ type: "class2_m", prefix: "M" },
			{ type: "class2_d", prefix: "D" },
			{ type: "class2_mo", prefix: "MO" },
			{ type: "class2_do", prefix: "DO" },
			{ type: "class2_mod", prefix: "MOD" },
		] as const;
		const depths = [
			{ depth: "superficial", sfx: "s" },
			{ depth: "media", sfx: "m" },
			{ depth: "profunda", sfx: "p" },
			{ depth: "destructive", sfx: "ds" },
		] as const;

		for (const { type, prefix } of subClasses) {
			for (const { depth, sfx } of depths) {
				const expectedBadge = `${prefix}${sfx}`;
				const html = renderToString(
					React.createElement(Tooth46Container, {
						layers: { caries: true, cariesType: type as any, cariesDepth: depth as any },
					}),
				);
				assert.ok(html.includes(`>${expectedBadge}<`), `Class II ${type} ${depth} missing badge ${expectedBadge}`);
				assert.ok(html.includes(`data-caries-depth="${depth}"`), `Class II ${type} ${depth} missing depth attr`);
				if (depth === "destructive") {
					assert.ok(html.includes("tooth46-crown-destruct-mask"), `Class II ${type} destructive missing mask`);
					assert.ok(html.includes("tooth46-caries-destructive"), `Class II ${type} destructive missing fracture`);
				}
			}
		}
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
