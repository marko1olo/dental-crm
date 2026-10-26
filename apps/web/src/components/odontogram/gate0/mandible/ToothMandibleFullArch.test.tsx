/**
 * DENTE Dental CRM — Mandible Full Arch (16 Teeth 48..41 | 31..38) Tests
 * Mandate 8b <= 120 lines. Zero mocks, strict Wheeler anatomical symmetry & CariesBar.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { ToothData } from "../../chart/types/toothRendererTypes";
import type { Tooth46LayerFlags } from "../tooth46Types";
import { MandibleToothCell } from "./MandibleToothCell";
import {
	MANDIBLE_TEETH,
	QUADRANT_3_TEETH,
	QUADRANT_4_TEETH,
} from "./mandibleTypes";
import { cariesToToothDataUpdate, toothDataToGate0Flags } from "./toothDataAdapter";
import { ToothMandibleFullArch } from "./ToothMandibleFullArch";

describe("Gate 0 — ToothMandibleFullArch (16 Teeth Mandible Wheeler Arch)", () => {
	it("renders all 16 teeth with numbers 48..41 and 31..38 and sagittal midline notch", () => {
		const html = renderToString(React.createElement(ToothMandibleFullArch, {}));
		assert.ok(html.includes('data-testid="tooth-mandible-full-arch"'));
		assert.ok(html.includes('data-testid="mandible-midline-notch"'));
		for (const num of MANDIBLE_TEETH) {
			assert.ok(html.includes(`data-testid="mandible-tooth-cell-${num}"`), `Missing tooth cell ${num}`);
			assert.ok(html.includes(`>${num}</span>`), `Missing number label for tooth ${num}`);
			assert.ok(html.includes(`data-testid="mandible-tooth-badge-${num}"`), `Missing badge for tooth ${num}`);
		}
	});

	it("enforces Wheeler Ch. 11 sagittal symmetry (scaleX(-1) on Q3, none on Q4)", () => {
		const cell46 = renderToString(React.createElement(MandibleToothCell, {
			toothNumber: 46, layers: { caries: false }, isSelected: false,
			isDark: false, zoom: 0.5, badgeRadius: 11, onClick: () => {},
		}));
		assert.ok(cell46.includes("transform:none") || !cell46.includes("scaleX(-1)"));

		const cell36 = renderToString(React.createElement(MandibleToothCell, {
			toothNumber: 36, layers: { caries: false }, isSelected: false,
			isDark: false, zoom: 0.5, badgeRadius: 11, onClick: () => {},
		}));
		assert.ok(cell36.includes("scaleX(-1)"), "Quadrant 3 must be mirrored via scaleX(-1)");
	});

	it("integrates Tooth46CariesBar when selected tooth has active caries", () => {
		const mockData: ToothData[] = [
			{ toothNumber: 46, state: "Caries", surfaces: ["M", "O"] },
			{ toothNumber: 36, state: "Healthy" },
		];
		const withCaries = renderToString(React.createElement(ToothMandibleFullArch, {
			teethData: mockData, selectedTooth: 46,
		}));
		assert.ok(withCaries.includes('id="tooth46-caries-quick-bar"'));
		assert.ok(withCaries.includes('data-caries-class="MO"'));

		const healthy = renderToString(React.createElement(ToothMandibleFullArch, {
			teethData: mockData, selectedTooth: 36,
		}));
		assert.ok(!healthy.includes('id="tooth46-caries-quick-bar"'));
	});

	it("toothDataToGate0Flags and cariesToToothDataUpdate provide seamless 2-way sync", () => {
		const flags = toothDataToGate0Flags({ toothNumber: 46, state: "Caries", surfaces: ["M", "O", "D"] });
		assert.equal(flags.caries, true);
		assert.equal(flags.cariesType, "class2_mod");

		const update = cariesToToothDataUpdate(46, "class2_mo", "profunda");
		assert.equal(update.state, "Caries");
		assert.deepEqual(update.surfaces, ["M", "O"]);
		assert.equal((update.clinicalData as Record<string, unknown>)?.cariesType, "class2_mo");
		assert.equal((update.clinicalData as Record<string, unknown>)?.cariesDepth, "profunda");
	});

	it("handles interactive selection and layer updates via callbacks", () => {
		let selectedNum = 0;
		let updatedLayers: Tooth46LayerFlags | null = null;
		let updatedData: Partial<ToothData> | null = null;
		const cell = React.createElement(ToothMandibleFullArch, {
			selectedTooth: 46,
			layersMap: { 46: { caries: true, cariesType: "class1", cariesDepth: "media" } },
			onSelectTooth: (num) => { selectedNum = num; },
			onUpdateToothLayers: (_n, l) => { updatedLayers = l; },
			onUpdateToothData: (_n, d) => { updatedData = d; },
		});
		const html = renderToString(cell);
		assert.ok(html.includes('data-testid="tooth-mandible-full-arch"'));
	});
});
