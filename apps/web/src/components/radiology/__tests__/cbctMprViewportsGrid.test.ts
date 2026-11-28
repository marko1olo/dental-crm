/**
 * apps/web/src/components/radiology/__tests__/cbctMprViewportsGrid.test.ts
 *
 * RED TEAM INQUISITION: CBCT MPR VIEWPORTS GRID & CLEAN SLICE CANVAS VERIFICATION
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	CbctViewportsRulerOverlay,
	CBCT_QUICK_WL_PRESETS,
	CBCT_QUICK_COLORMAP_PRESETS,
} from "../mpr/CbctViewportsRuler";
import { CbctQuickWlBar, CbctQuickColormapBar } from "../mpr/CbctQuickWlPresets";
import { CbctViewportRulerToolbar } from "../mpr/CbctViewportRulerToolbar";

describe("CBCT MPR Viewports Grid Clean Slice & Presets Inquisition", () => {
	it("1. CbctViewportsRulerOverlay renders clean slice canvas across viewports with ZERO floating preset bars", () => {
		const viewports = ["axial", "coronal", "sagittal", "panoramic", "cross_section"] as const;
		for (const viewportType of viewports) {
			const html = renderToStaticMarkup(
				React.createElement(CbctViewportsRulerOverlay, {
					viewportType,
					windowWidth: 4400,
					windowLevel: 1300,
					onSelectQuickWlPreset: () => {},
					onSelectColorMap: () => {},
					showQuickColormapBar: true,
					showSharpenControl: true,
				}),
			);

			assert.ok(html.includes(`data-testid="cbct-ruler-toolbar-${viewportType}"`));
			assert.equal(html.includes('data-testid="cbct-quick-wl-bar"'), false);
			assert.equal(html.includes('data-testid="cbct-quick-colormap-bar"'), false);
			assert.equal(html.includes("Кость (W2500/L500)"), false);
			assert.equal(html.includes("Эмаль/Дентин (W4000/L1200)"), false);
			assert.equal(html.includes("pointer:coarse"), false, "P2-4.1: must use max-md instead of pointer:coarse");
		}
	});

	it("2. CbctQuickWlBar, CbctQuickColormapBar & CbctViewportRulerToolbar avoid global pointer:coarse (P2-4.1)", () => {
		const wlHtml = renderToStaticMarkup(
			React.createElement(CbctQuickWlBar, {
				windowWidth: 2500,
				windowLevel: 500,
				onSelectPreset: () => {},
			}),
		);
		const cmapHtml = renderToStaticMarkup(
			React.createElement(CbctQuickColormapBar, {
				colorMap: "grayscale",
				onSelectColorMap: () => {},
			}),
		);
		const rulerHtml = renderToStaticMarkup(
			React.createElement(CbctViewportRulerToolbar, {
				viewportType: "axial",
			}),
		);
		assert.equal(wlHtml.includes("pointer:coarse"), false);
		assert.equal(cmapHtml.includes("pointer:coarse"), false);
		assert.equal(rulerHtml.includes("pointer:coarse"), false);
	});

	it("3. Quick W/L & Colormap presets definitions are intact for menus and hotkeys", () => {
		assert.ok(CBCT_QUICK_WL_PRESETS.length >= 3);
		assert.ok(CBCT_QUICK_COLORMAP_PRESETS.length >= 4);

		const bone = CBCT_QUICK_WL_PRESETS.find((p) => p.id === "bone");
		assert.ok(bone);
		assert.equal(bone.windowWidth, 2500);
		assert.equal(bone.windowLevel, 500);

		const enamel = CBCT_QUICK_WL_PRESETS.find((p) => p.id === "enamel_dentin");
		assert.ok(enamel);
		assert.equal(enamel.windowWidth, 4000);
		assert.equal(enamel.windowLevel, 1200);
	});
});
