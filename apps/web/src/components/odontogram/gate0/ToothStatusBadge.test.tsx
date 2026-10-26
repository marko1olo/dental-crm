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
			assert.equal(byId.code, preset.badge, `Badge code for ${preset.id} must be ${preset.badge}`);
			const expectedBg = DEPTH_BG[preset.layers.cariesDepth ?? "media"];
			assert.equal(byId.bg, expectedBg, `Badge bg for ${preset.id} must be ${expectedBg}`);
			const byLayers = resolveToothStatusBadge(undefined, preset.layers);
			assert.equal(byLayers.code, preset.badge, `Badge code by layers for ${preset.id} must be ${preset.badge}`);
			assert.equal(byLayers.bg, expectedBg, `Badge bg by layers for ${preset.id} must be ${expectedBg}`);
		}
	});

	it("verifies explicit badge codes for all 9 Black classes x 4 depths", () => {
		const expectedCodes: Record<string, string> = {
			c1_superficial: "C1s", c1_media: "C1m", c1_profunda: "C1p", c1_destructive: "C1ds",
			c2_m_superficial: "Ms", c2_m_media: "Mm", c2_m_profunda: "Mp", c2_m_destructive: "Mds",
			c2_d_superficial: "Ds", c2_d_media: "Dm", c2_d_profunda: "Dp", c2_d_destructive: "Dds",
			c2_mo_superficial: "MOs", c2_mo_media: "MOm", c2_mo_profunda: "MOp", c2_mo_destructive: "MOds",
			c2_do_superficial: "DOs", c2_do_media: "DOm", c2_do_profunda: "DOp", c2_do_destructive: "DOds",
			c2_mod_superficial: "MODs", c2_mod_media: "MODm", c2_mod_profunda: "MODp", c2_mod_destructive: "MODds",
			c3_superficial: "C3s", c3_media: "C3m", c3_profunda: "C3p", c3_destructive: "C3ds",
			c4_superficial: "C4s", c4_media: "C4m", c4_profunda: "C4p", c4_destructive: "C4ds",
			c5_superficial: "C5s", c5_media: "C5m", c5_profunda: "C5p", c5_destructive: "C5ds",
		};
		for (const [id, code] of Object.entries(expectedCodes)) {
			assert.equal(resolveToothStatusBadge(id).code, code, `Preset ${id} must have code ${code}`);
		}
	});

	it("verifies all 20 Class II aliases with caries_class2_ prefix", () => {
		const class2Aliases: Record<string, string> = {
			caries_class2_m_superficial: "Ms", caries_class2_m_media: "Mm",
			caries_class2_m_profunda: "Mp", caries_class2_m_destructive: "Mds",
			caries_class2_d_superficial: "Ds", caries_class2_d_media: "Dm",
			caries_class2_d_profunda: "Dp", caries_class2_d_destructive: "Dds",
			caries_class2_mo_superficial: "MOs", caries_class2_mo_media: "MOm",
			caries_class2_mo_profunda: "MOp", caries_class2_mo_destructive: "MOds",
			caries_class2_do_superficial: "DOs", caries_class2_do_media: "DOm",
			caries_class2_do_profunda: "DOp", caries_class2_do_destructive: "DOds",
			caries_class2_mod_superficial: "MODs", caries_class2_mod_media: "MODm",
			caries_class2_mod_profunda: "MODp", caries_class2_mod_destructive: "MODds",
		};
		for (const [id, code] of Object.entries(class2Aliases)) {
			assert.equal(resolveToothStatusBadge(id).code, code, `Alias ${id} must resolve to ${code}`);
		}
	});

	it("renders geometricPrecision and letter-spacing for dense 4-5 letter codes", () => {
		const modHtml = renderToString(React.createElement(ToothStatusBadge, { presetId: "c2_mod_destructive" }));
		assert.ok(modHtml.includes("MODds"));
		assert.ok(modHtml.includes('shape-rendering="geometricPrecision"'));
		assert.ok(modHtml.includes("letter-spacing"));
	});

	it("resolves baseline non-caries statuses correctly", () => {
		assert.equal(resolveToothStatusBadge("intact").code, "✓");
		assert.equal(resolveToothStatusBadge("missing").code, "О");
		assert.equal(resolveToothStatusBadge("implant").code, "И");
		assert.equal(resolveToothStatusBadge("composite").code, "П");
		assert.equal(resolveToothStatusBadge("crown").code, "К");
		assert.equal(resolveToothStatusBadge(undefined, { intact: true } as any).code, "✓");
	});

	it("resolves baseline 'caries' defaults on 1 click: C1m for posterior, C3m for anterior", () => {
		assert.equal(resolveToothStatusBadge("caries").code, "C1m");
		assert.equal(resolveToothStatusBadge("caries", undefined, 46).code, "C1m");
		assert.equal(resolveToothStatusBadge("caries", undefined, 44).code, "C1m");
		assert.equal(resolveToothStatusBadge("caries", undefined, 41).code, "C3m");
		assert.equal(resolveToothStatusBadge("caries", undefined, 43).code, "C3m");
		assert.equal(resolveToothStatusBadge(undefined, { caries: true } as any, 46).code, "C1m");
		assert.equal(resolveToothStatusBadge(undefined, { caries: true } as any, 41).code, "C3m");
	});
});
