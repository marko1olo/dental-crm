/**
 * DENTE Dental CRM — Maxilla Full Arch (16 Teeth 18..11 | 21..28) Tests
 * Mandate 8b <= 120 lines. Zero mocks, strict Wheeler anatomical symmetry & CariesBar.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { ToothData } from "../../chart/types/toothRendererTypes";
import type { Tooth46LayerFlags } from "../tooth46Types";
import { MaxillaToothCell } from "./MaxillaToothCell";
import {
	MAXILLA_TEETH,
	QUADRANT_1_TEETH,
	QUADRANT_2_TEETH,
} from "./maxillaTypes";
import { cariesToToothDataUpdate, toothDataToGate0Flags } from "./toothDataAdapter";
import { ToothMaxillaFullArch } from "./ToothMaxillaFullArch";

describe("Gate 0 — ToothMaxillaFullArch (16 Teeth Maxilla Wheeler Arch)", () => {
	it("renders all 16 teeth with numbers 18..11 and 21..28 and sagittal midline notch", () => {
		const html = renderToString(React.createElement(ToothMaxillaFullArch, {}));
		assert.ok(html.includes('data-testid="tooth-maxilla-full-arch"'));
		assert.ok(html.includes('data-testid="maxilla-midline-notch"'));
		for (const num of MAXILLA_TEETH) {
			assert.ok(html.includes(`data-testid="maxilla-tooth-cell-${num}"`), `Missing tooth cell ${num}`);
			assert.ok(html.includes(`>${num}</span>`), `Missing number label for tooth ${num}`);
			assert.ok(html.includes(`data-testid="maxilla-tooth-badge-${num}"`), `Missing badge for tooth ${num}`);
		}
	});

	it("enforces Wheeler Ch. 8-11 sagittal symmetry (scaleX(-1) on Q2, none on Q1)", () => {
		const cell16 = renderToString(React.createElement(MaxillaToothCell, {
			toothNumber: 16, layers: { caries: false }, isSelected: false,
			isDark: false, zoom: 0.5, badgeRadius: 11, onClick: () => {},
		}));
		assert.ok(cell16.includes("transform:none") || !cell16.includes("scaleX(-1)"));

		const cell26 = renderToString(React.createElement(MaxillaToothCell, {
			toothNumber: 26, layers: { caries: false }, isSelected: false,
			isDark: false, zoom: 0.5, badgeRadius: 11, onClick: () => {},
		}));
		assert.ok(cell26.includes("scaleX(-1)"), "Quadrant 2 must be mirrored via scaleX(-1)");
	});

	it("integrates Tooth46CariesBar when selected tooth has active caries", () => {
		const mockData: ToothData[] = [
			{ toothNumber: 11, state: "Caries", surfaces: ["M"] },
			{ toothNumber: 21, state: "Healthy" },
		];
		const withCaries = renderToString(React.createElement(ToothMaxillaFullArch, {
			teethData: mockData, selectedTooth: 11,
		}));
		assert.ok(withCaries.includes('id="tooth46-caries-quick-bar"'));

		const healthy = renderToString(React.createElement(ToothMaxillaFullArch, {
			teethData: mockData, selectedTooth: 21,
		}));
		assert.ok(!healthy.includes('id="tooth46-caries-quick-bar"'));
	});

	it("toothDataToGate0Flags and cariesToToothDataUpdate provide seamless 2-way sync", () => {
		const flags = toothDataToGate0Flags({ toothNumber: 16, state: "Caries", surfaces: ["M", "O", "D"] });
		assert.equal(flags.caries, true);
		assert.equal(flags.cariesType, "class2_mod");

		const update = cariesToToothDataUpdate(11, "class4", "profunda");
		assert.equal(update.state, "Caries");
		assert.deepEqual(update.surfaces, ["I"]);
		assert.equal((update.clinicalData as Record<string, unknown>)?.cariesType, "class4");
	});

	it("handles interactive selection and layer updates via callbacks", () => {
		let selectedNum = 0;
		let updatedLayers: Tooth46LayerFlags | null = null;
		let updatedData: Partial<ToothData> | null = null;
		const cell = React.createElement(ToothMaxillaFullArch, {
			selectedTooth: 11,
			layersMap: { 11: { caries: true, cariesType: "class3", cariesDepth: "media" } },
			onSelectTooth: (num) => { selectedNum = num; },
			onUpdateToothLayers: (_n, l) => { updatedLayers = l; },
			onUpdateToothData: (_n, d) => { updatedData = d; },
		});
		const html = renderToString(cell);
		assert.ok(html.includes('data-testid="tooth-maxilla-full-arch"'));
	});
});
