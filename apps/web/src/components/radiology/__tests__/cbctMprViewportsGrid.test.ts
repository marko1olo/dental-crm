/**
 * apps/web/src/components/radiology/__tests__/cbctMprViewportsGrid.test.ts
 *
 * RED TEAM INQUISITION: CBCT MPR VIEWPORTS GRID & CLEAN SLICE CANVAS VERIFICATION
 *
 * Direct verification of Creator Mandate:
 * 1. Slice canvases (Axial, Coronal, Sagittal, Panoramic, Cross-Sections) are 100% clean
 *    from floating preset bars ("Кость Эмаль/Дентин Мягкие ткани DENTE") obscuring bone anatomy;
 * 2. CbctViewportsRulerOverlay renders only valid surgical tools (Ruler/Angle/Endo toolbar & HUD);
 * 3. Quick W/L & Colormap presets logic remains preserved for menus/hotkeys without polluting slices;
 * 4. Mandate 8b: all touched files strictly under 800 lines.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	CbctViewportsRulerOverlay,
	CBCT_QUICK_WL_PRESETS,
	CBCT_QUICK_COLORMAP_PRESETS,
} from "../mpr/CbctViewportsRuler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("CBCT MPR Viewports Grid Clean Slice & Presets Inquisition", () => {
	const rulerPath = path.resolve(__dirname, "../mpr/CbctViewportsRuler.tsx");
	const presetsPath = path.resolve(__dirname, "../mpr/CbctQuickWlPresets.tsx");
	const gridPath = path.resolve(__dirname, "../mpr/CbctMprViewportsGrid.tsx");

	it("1. Mandate 8b: CbctViewportsRuler, CbctQuickWlPresets, and CbctMprViewportsGrid are strictly <= 800 lines", () => {
		const files = [
			{ path: rulerPath, name: "CbctViewportsRuler.tsx" },
			{ path: presetsPath, name: "CbctQuickWlPresets.tsx" },
			{ path: gridPath, name: "CbctMprViewportsGrid.tsx" },
		];

		for (const file of files) {
			assert.ok(fs.existsSync(file.path), `File ${file.name} must exist at ${file.path}`);
			const content = fs.readFileSync(file.path, "utf-8");
			const lineCount = content.split(/\r?\n/).length;
			assert.ok(
				lineCount <= 800,
				`File ${file.name} must be <= 800 lines (Mandate 8b), got ${lineCount}`,
			);
		}
	});

	it("2. CbctViewportsRulerOverlay renders clean slice canvas: ZERO floating quick W/L and Colormap bars", () => {
		const html = renderToStaticMarkup(
			React.createElement(CbctViewportsRulerOverlay, {
				viewportType: "axial",
				windowWidth: 4400,
				windowLevel: 1300,
				onSelectQuickWlPreset: () => {},
				onSelectColorMap: () => {},
				showQuickColormapBar: true,
				showSharpenControl: true,
			}),
		);

		// Ruler toolbar in top-right remains intact
		assert.ok(
			html.includes('data-testid="cbct-ruler-toolbar-axial"'),
			"Must retain surgical ruler toolbar in top-right",
		);

		// Absolute ban on floating preset bar directly on slice
		assert.ok(
			!html.includes('data-testid="cbct-quick-wl-bar"'),
			"Must NOT render cbct-quick-wl-bar overlay on slice canvas",
		);
		assert.ok(
			!html.includes('data-testid="cbct-quick-colormap-bar"'),
			"Must NOT render cbct-quick-colormap-bar overlay on slice canvas",
		);
		assert.ok(
			!html.includes("Кость (W2500/L500)"),
			"Must NOT render bone preset label on slice canvas",
		);
		assert.ok(
			!html.includes("Эмаль/Дентин (W4000/L1200)"),
			"Must NOT render enamel/dentin preset label on slice canvas",
		);
	});

	it("3. CbctViewportsRuler source code has eliminated the bottom-left floating presets overlay block", () => {
		const rulerSource = fs.readFileSync(rulerPath, "utf-8");

		assert.ok(
			!rulerSource.includes('className="absolute bottom-1.5 left-28 pointer-events-auto flex items-center gap-2 z-20 flex-wrap"'),
			"Must completely eliminate the bottom-left floating presets container from CbctViewportsRulerOverlay",
		);
		assert.ok(
			!rulerSource.includes("<CbctQuickWlBar"),
			"Must not mount <CbctQuickWlBar in CbctViewportsRulerOverlay",
		);
		assert.ok(
			!rulerSource.includes("<CbctQuickColormapBar"),
			"Must not mount <CbctQuickColormapBar in CbctViewportsRulerOverlay",
		);
	});

	it("4. Quick W/L & Colormap presets logic remains preserved in CbctQuickWlPresets for menus and hotkeys", () => {
		assert.ok(CBCT_QUICK_WL_PRESETS.length >= 3, "Must preserve W/L presets definitions");
		assert.ok(CBCT_QUICK_COLORMAP_PRESETS.length >= 4, "Must preserve Colormap presets definitions");

		const bone = CBCT_QUICK_WL_PRESETS.find((p) => p.id === "bone");
		assert.ok(bone, "Bone preset must exist");
		assert.equal(bone.windowWidth, 2500);
		assert.equal(bone.windowLevel, 500);

		const enamel = CBCT_QUICK_WL_PRESETS.find((p) => p.id === "enamel_dentin");
		assert.ok(enamel, "Enamel preset must exist");
		assert.equal(enamel.windowWidth, 4000);
		assert.equal(enamel.windowLevel, 1200);
	});
});
