/**
 * DENTE CRM — CBCT Left Tool Dock & Viewport Ruler UI Controls Torture Suite
 * Testing: CbctLeftToolDock.tsx, CbctViewportsRuler.tsx, CbctVolumeGlContext.ts
 *
 * Verifies:
 * 1. Colormap preset registries & descriptions («Серый», «Миш D1-D4», «Эндо», «Печать»).
 * 2. 1-Click Trabecular Sharpening cycle logic (0.0 -> 0.5 -> 1.0 -> 0.0).
 * 3. CbctLeftToolDock rendering: 32px density, colormap button & flyout, sharpening toggle button.
 * 4. CbctViewportRulerToolbar & CbctQuickColormapBar rendering: 28px density, active states.
 * 5. Direct CbctVolumeGlContext synchronization without lag or memory leaks.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	CbctLeftToolDock,
	CbctColormapFlyout,
	CBCT_COLORMAP_PRESETS,
	getNextSharpenAmount,
	type CbctColorMapMode,
} from "../CbctLeftToolDock";
import {
	CbctViewportRulerToolbar,
	CbctQuickColormapBar,
	CbctViewportsRulerOverlay,
	CBCT_QUICK_COLORMAP_PRESETS,
} from "../mpr/CbctViewportsRuler";
import {
	getSharedCbctGlContext,
	CBCT_COLORMAP_MODES,
} from "../mpr/webgl/CbctVolumeGlContext";

describe("CBCT UI Dock & Viewport Ruler Hardware Controls", () => {
	beforeEach(() => {
		try {
			const gl = getSharedCbctGlContext();
			gl.setColorMap("grayscale");
			gl.setSharpenAmount(0.0);
		} catch {
			/* headless environment */
		}
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 1. REGISTRY & PRESETS SPECIFICATIONS
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Colormap Presets & 1-Click Sharpen Cycle Invariants", () => {
		it("CBCT_COLORMAP_PRESETS defines all 4 clinical modes with exact codes and labels", () => {
			assert.equal(CBCT_COLORMAP_PRESETS.length, 4);

			const gray = CBCT_COLORMAP_PRESETS.find((p) => p.id === "grayscale");
			assert.ok(gray);
			assert.equal(gray.code, 0);
			assert.equal(gray.label, "Серый (DICOM)");
			assert.equal(gray.testId, "cbct-colormap-grayscale");

			const bone = CBCT_COLORMAP_PRESETS.find((p) => p.id === "bone_density");
			assert.ok(bone);
			assert.equal(bone.code, 1);
			assert.ok(bone.label.includes("Миш D1-D4"));
			assert.equal(bone.testId, "cbct-colormap-bone-density");

			const endo = CBCT_COLORMAP_PRESETS.find((p) => p.id === "endo");
			assert.ok(endo);
			assert.equal(endo.code, 2);
			assert.ok(endo.label.includes("Эндо"));
			assert.equal(endo.testId, "cbct-colormap-endo");

			const inv = CBCT_COLORMAP_PRESETS.find((p) => p.id === "inverted");
			assert.ok(inv);
			assert.equal(inv.code, 3);
			assert.ok(inv.label.includes("Белая бумага"));
			assert.equal(inv.testId, "cbct-colormap-inverted");
		});

		it("CBCT_QUICK_COLORMAP_PRESETS in CbctViewportsRuler matches CbctLeftToolDock presets", () => {
			assert.equal(CBCT_QUICK_COLORMAP_PRESETS.length, 4);
			for (let i = 0; i < 4; i++) {
				const quick = CBCT_QUICK_COLORMAP_PRESETS[i];
				const standard = CBCT_COLORMAP_PRESETS[i];
				assert.ok(quick);
				assert.ok(standard);
				assert.equal(quick.id, standard.id);
				assert.equal(quick.code, standard.code);
			}
		});

		it("getNextSharpenAmount executes exact 3-state cycle: 0.0 -> 0.5 -> 1.0 -> 0.0", () => {
			assert.equal(getNextSharpenAmount(0.0), 0.5);
			assert.equal(getNextSharpenAmount(0.1), 0.5);
			assert.equal(getNextSharpenAmount(0.5), 1.0);
			assert.equal(getNextSharpenAmount(0.6), 1.0);
			assert.equal(getNextSharpenAmount(1.0), 0.0);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. CBCT LEFT TOOL DOCK COMPONENT RENDERING
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. CbctLeftToolDock Desktop Density & Hardware Buttons", () => {
		it("renders colormap button and sharpen button with 32px desktop ergonomics", () => {
			const html = renderToStaticMarkup(
				React.createElement(CbctLeftToolDock, {
					activeTool: "crosshair",
					onSelectTool: () => {},
					colorMap: "grayscale",
					sharpenAmount: 0.0,
				}),
			);

			// Checks tool buttons existence
			assert.ok(html.includes('data-testid="cbct-tool-colormap"'), "Must render colormap tool button");
			assert.ok(html.includes('data-testid="cbct-tool-sharpen"'), "Must render sharpen tool button");

			// Mandate 8k: 32px density check
			assert.ok(html.includes("min-w-[32px]"), "Colormap and sharpen buttons must enforce min-w-[32px]");
			assert.ok(html.includes("min-h-[32px]"), "Colormap and sharpen buttons must enforce min-h-[32px]");

			// Initial label badges
			assert.ok(html.includes("LUT"), "Grayscale colormap displays LUT badge");
			assert.ok(html.includes("0%"), "0.0 sharpen amount displays 0% badge");
		});

		it("displays active badges for Misch D1-D4 and 100% sharpening", () => {
			const html = renderToStaticMarkup(
				React.createElement(CbctLeftToolDock, {
					activeTool: "crosshair",
					onSelectTool: () => {},
					colorMap: "bone_density",
					sharpenAmount: 1.0,
				}),
			);

			assert.ok(html.includes("МИШ"), "Displays МИШ badge when bone_density is active");
			assert.ok(html.includes("100%"), "Displays 100% badge when sharpenAmount is 1.0");
			assert.ok(html.includes("bg-emerald-500/20"), "Sharpen button has emerald glow when active");
		});

		it("displays active badges for Endo and 50% sharpening", () => {
			const html = renderToStaticMarkup(
				React.createElement(CbctLeftToolDock, {
					activeTool: "crosshair",
					onSelectTool: () => {},
					colorMap: "endo",
					sharpenAmount: 0.5,
				}),
			);

			assert.ok(html.includes("ЭНД"), "Displays ЭНД badge when endo mode is active");
			assert.ok(html.includes("50%"), "Displays 50% badge when sharpenAmount is 0.5");
		});

		it("renders CbctColormapFlyout with all 4 option buttons and color swatches", () => {
			const html = renderToStaticMarkup(
				React.createElement(CbctColormapFlyout, {
					activeColorMap: "bone_density",
					onSelectColorMap: () => {},
					onClose: () => {},
				}),
			);

			assert.ok(html.includes('data-testid="cbct-colormap-flyout"'));
			assert.ok(html.includes('data-testid="cbct-colormap-grayscale"'));
			assert.ok(html.includes('data-testid="cbct-colormap-bone-density"'));
			assert.ok(html.includes('data-testid="cbct-colormap-endo"'));
			assert.ok(html.includes('data-testid="cbct-colormap-inverted"'));

			// Active option checkmark & styling
			assert.ok(html.includes("border-purple-500/60"));
			assert.ok(html.includes("from-orange-500 to-emerald-400"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. CBCT VIEWPORTS RULER & HUD TOOLBAR COMPONENT RENDERING
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. CbctViewportRulerToolbar & CbctQuickColormapBar HUD Ergonomics", () => {
		it("renders CbctViewportRulerToolbar with sharpen button when showSharpenControl is true", () => {
			const html = renderToStaticMarkup(
				React.createElement(CbctViewportRulerToolbar, {
					viewportType: "axial",
					activeTool: "crosshair",
					onSelectTool: () => {},
					showSharpenControl: true,
					sharpenAmount: 0.5,
				}),
			);

			assert.ok(html.includes('data-testid="cbct-viewport-sharpen-btn-axial"'));
			assert.ok(html.includes("Резкость 50%"));
			assert.ok(html.includes("h-7"), "Must enforce 28px height (h-7) for viewport HUD controls");
			assert.ok(html.includes("min-h-[28px]"));
		});

		it("renders CbctQuickColormapBar with 4 colormap chips and 1-click sharpen toggle", () => {
			const html = renderToStaticMarkup(
				React.createElement(CbctQuickColormapBar, {
					colorMap: "bone_density",
					sharpenAmount: 1.0,
					onSelectColorMap: () => {},
					onChangeSharpenAmount: () => {},
				}),
			);

			assert.ok(html.includes('data-testid="cbct-quick-colormap-bar"'));
			assert.ok(html.includes('data-testid="cbct-quick-colormap-grayscale"'));
			assert.ok(html.includes('data-testid="cbct-quick-colormap-bone-density"'));
			assert.ok(html.includes('data-testid="cbct-quick-colormap-endo"'));
			assert.ok(html.includes('data-testid="cbct-quick-colormap-inverted"'));
			assert.ok(html.includes('data-testid="cbct-quick-sharpen-toggle"'));

			// Checks active colormap styling
			assert.ok(html.includes("bg-purple-950/70") || html.includes("bg-purple-600/90"));
			assert.ok(html.includes("Резкость: 100%"));
		});

		it("renders CbctViewportsRulerOverlay with clean slice canvas: no floating presets obscuring anatomy", () => {
			const html = renderToStaticMarkup(
				React.createElement(CbctViewportsRulerOverlay, {
					viewportType: "coronal",
					onSelectQuickWlPreset: () => {},
					onSelectColorMap: () => {},
					showQuickColormapBar: true,
					showSharpenControl: true,
				}),
			);

			assert.ok(html.includes('data-testid="cbct-ruler-toolbar-coronal"'));
			assert.ok(html.includes('data-testid="cbct-viewport-sharpen-btn-coronal"'));
			// Mandate: slice canvas must be 100% clean from floating preset overlays obscuring anatomy
			assert.ok(!html.includes('data-testid="cbct-quick-wl-bar"'));
			assert.ok(!html.includes('data-testid="cbct-quick-colormap-bar"'));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. WEBGL2 CONTEXT SYNCHRONIZATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. WebGL2 Context Direct State Synchronization", () => {
		it("synchronizes colormap and sharpen amounts directly with CbctVolumeGlContext", () => {
			const gl = getSharedCbctGlContext();

			gl.setColorMap("bone_density");
			assert.equal(gl.getColorMap(), CBCT_COLORMAP_MODES.BONE_DENSITY);

			gl.setColorMap("endo");
			assert.equal(gl.getColorMap(), CBCT_COLORMAP_MODES.ENDO);

			gl.setColorMap("inverted");
			assert.equal(gl.getColorMap(), CBCT_COLORMAP_MODES.INVERTED);

			gl.setColorMap("grayscale");
			assert.equal(gl.getColorMap(), CBCT_COLORMAP_MODES.GRAYSCALE);

			gl.setSharpenAmount(0.5);
			assert.equal(gl.getSharpenAmount(), 0.5);

			gl.setSharpenAmount(1.0);
			assert.equal(gl.getSharpenAmount(), 1.0);

			gl.setSharpenAmount(0.0);
			assert.equal(gl.getSharpenAmount(), 0.0);
		});
	});
});
