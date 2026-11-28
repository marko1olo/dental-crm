/**
 * apps/web/src/components/radiology/__tests__/cbctDarkCockpitInquisition.test.ts
 *
 * RED TEAM INQUISITION SUITE: CBCT DARK COCKPIT & ANTI-BLINDING UI VERIFICATION
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CbctTunerPlayground } from "../tuner/CbctTunerPlayground";
import { CbctSlidersPanel } from "../tuner/studio/CbctSlidersPanel";
import { DEFAULT_TUNER_PARAMS } from "../tuner/cbctTunerTypes";
import { CbctHeaderBar } from "../mpr/CbctHeaderBar";
import { CbctContrastPopover } from "../mpr/CbctContrastPopover";
import { CbctQuickWlBar, CbctQuickColormapBar } from "../mpr/CbctQuickWlPresets";
import { CbctViewportRulerToolbar } from "../mpr/CbctViewportRulerToolbar";

describe("CBCT Dark Cockpit & Anti-Blinding UI Inquisition", () => {
	it("1. CbctTunerPlayground renders dark cockpit container and all 6 colored sliders without bg-zinc-800 blocks", () => {
		const html = renderToStaticMarkup(React.createElement(CbctTunerPlayground, { isOpen: true }));

		assert.ok(html.includes("cbct-dark-cockpit"));
		assert.ok(html.includes('data-cbct-cockpit="true"'));
		assert.ok(html.includes("color-scheme:dark") || html.includes('data-theme="dark"'));

		assert.ok(html.includes('data-testid="cbct-slider-window-width"'));
		assert.ok(html.includes('data-testid="cbct-slider-window-level"'));
		assert.ok(html.includes('data-testid="cbct-slider-gamma"'));
		assert.ok(html.includes('data-testid="cbct-checkbox-soft-knee"'));
		assert.ok(html.includes('data-testid="cbct-slider-air-cutoff"'));
		assert.ok(html.includes('data-testid="cbct-slider-thickness"'));

		assert.ok(html.includes("cbct-slider--cyan"));
		assert.ok(html.includes("cbct-slider--amber"));
		assert.ok(html.includes("cbct-slider--blue"));
		assert.ok(html.includes("cbct-slider--purple"));
		assert.equal(html.includes("h-3 sm:h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"), false);

		const softKneeHtml = renderToStaticMarkup(
			React.createElement(CbctSlidersPanel, {
				params: { ...DEFAULT_TUNER_PARAMS, useSoftKnee: true },
				onSetParams: () => {},
			}),
		);
		assert.ok(softKneeHtml.includes('data-testid="cbct-slider-soft-knee"'));
		assert.ok(softKneeHtml.includes("cbct-slider--emerald"));
	});

	it("2. CbctHeaderBar & CbctContrastPopover avoid glaring text-zinc-100 and use compact text-[11px] mode tabs", () => {
		const headerHtml = renderToStaticMarkup(
			React.createElement(CbctHeaderBar, {
				resolvedPatientName: "Тест Пациент",
				loadedSliceCount: 400,
				volume: null,
				studioMode: "implant",
				handleSelectStudioMode: () => {},
				handleExportToEmr: () => {},
				handleExportCbctToFinance: () => {},
				handleExportPdfReport: () => {},
				onCopySnapshotToClipboard: () => {},
				viewLayout: "4_up",
				setViewLayout: () => {},
				isFullscreen: false,
				handleToggleFullscreenModal: () => {},
				onClose: () => {},
				isStudioMenuOpen: false,
				setIsStudioMenuOpen: () => {},
				studioMenuRef: { current: null },
				handleResetAll: () => {},
				handleAutoDetectArch: () => {},
				showDentalArch: true,
				setShowDentalArch: () => {},
				showEdgeRulers: true,
				setShowEdgeRulers: () => {},
				windowWidth: 2500,
				windowLevel: 500,
				onChangeWindowWidth: () => {},
				onChangeWindowLevel: () => {},
			}),
		);
		const popoverHtml = renderToStaticMarkup(
			React.createElement(CbctContrastPopover, {
				windowWidth: 2500,
				windowLevel: 500,
				onChangeWindowWidth: () => {},
				onChangeWindowLevel: () => {},
				slabThicknessMm: 1.0,
			}),
		);

		assert.ok(headerHtml.includes("text-[11px] font-medium"));
		assert.equal(headerHtml.includes("text-zinc-100"), false);
		assert.equal(popoverHtml.includes("text-white"), false);
	});

	it("3. CbctQuickWlBar, CbctQuickColormapBar & CbctViewportRulerToolbar use max-md responsive sizing instead of global pointer:coarse (P2-4.1)", () => {
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
		assert.equal(/(^|[\s"])text-white([\s"])/.test(wlHtml), false);
		assert.equal(/(^|[\s"])text-white([\s"])/.test(cmapHtml), false);
		assert.equal(/(^|[\s"])text-white([\s"])/.test(rulerHtml), false);
	});
});
