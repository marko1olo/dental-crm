import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	ChairsideEndoQuickBar,
	getChairsideDefaultCanals,
} from "../ChairsideEndoQuickBar";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("ChairsideEndoQuickBar — First Principles Chairside Protocol (Mandates 8e, 8n, 8l)", () => {
	it("1. Upper molar (16) has anatomical canals MB, DB, P", () => {
		const canals16 = getChairsideDefaultCanals(16);
		const names = canals16.map((c) => c.name);
		assert.deepEqual(names, ["MB", "DB", "P"], "Upper molar 16 must have MB, DB, P canals");

		const html = renderToStaticMarkup(
			createElement(ChairsideEndoQuickBar, {
				activeTooth: 16,
			}),
		);
		assert.ok(html.includes("MB"), "QuickBar renders MB canal");
		assert.ok(html.includes("DB"), "QuickBar renders DB canal");
		assert.ok(html.includes("P"), "QuickBar renders P canal");
		assert.ok(html.includes("Зуб #16"), "QuickBar renders tooth number 16");
	});

	it("2. Lower molar (46) has anatomical canals M, D", () => {
		const canals46 = getChairsideDefaultCanals(46);
		const names = canals46.map((c) => c.name);
		assert.deepEqual(names, ["M", "D"], "Lower molar 46 must have M, D canals");

		const html = renderToStaticMarkup(
			createElement(ChairsideEndoQuickBar, {
				activeTooth: 46,
			}),
		);
		assert.ok(html.includes("Канал M"), "QuickBar renders M canal");
		assert.ok(html.includes("Канал D"), "QuickBar renders D canal");
		assert.ok(html.includes("Зуб #46"), "QuickBar renders tooth number 46");
	});

	it("3. Upper premolar (14) has anatomical canals B, P and incisor (21) has single main canal", () => {
		const canals14 = getChairsideDefaultCanals(14);
		assert.deepEqual(canals14.map((c) => c.name), ["B", "P"], "Premolar 14 has B, P");

		const canals21 = getChairsideDefaultCanals(21);
		assert.equal(canals21.length, 1, "Incisor 21 has single canal");
	});

	it("4. 1-Click Quick-Pick Chips: Working Length (19, 20, 21, 21.5, 22 mm)", () => {
		const html = renderToStaticMarkup(
			createElement(ChairsideEndoQuickBar, {
				activeTooth: 16,
			}),
		);

		// Assert length chips exist for MB canal
		assert.ok(html.includes("chip-length-MB-19"), "Has 19 mm chip");
		assert.ok(html.includes("chip-length-MB-20"), "Has 20 mm chip");
		assert.ok(html.includes("chip-length-MB-21"), "Has 21 mm chip");
		assert.ok(html.includes("chip-length-MB-21.5"), "Has 21.5 mm chip");
		assert.ok(html.includes("chip-length-MB-22"), "Has 22 mm chip");
		assert.ok(html.includes("Apex 0.0"), "Shows Apex 0.0 indicator");
	});

	it("5. 1-Click Quick-Pick Chips: Master Apical File (25/.04, 30/.04, 25/.06, 20/.04)", () => {
		const html = renderToStaticMarkup(
			createElement(ChairsideEndoQuickBar, {
				activeTooth: 16,
			}),
		);

		assert.ok(html.includes("chip-maf-MB-2504"), "Has 25/.04 chip");
		assert.ok(html.includes("chip-maf-MB-3004"), "Has 30/.04 chip");
		assert.ok(html.includes("chip-maf-MB-2506"), "Has 25/.06 chip");
		assert.ok(html.includes("chip-maf-MB-2004"), "Has 20/.04 chip");
	});

	it("6. 1-Click Obturation Type: Gutta-percha + AH Plus vs Bioceramic vs Ca(OH)2", () => {
		const html = renderToStaticMarkup(
			createElement(ChairsideEndoQuickBar, {
				activeTooth: 16,
			}),
		);

		assert.ok(html.includes("chip-obturation-gutta-MB"), "Has Gutta-percha chip");
		assert.ok(html.includes("chip-obturation-bio-MB"), "Has Bioceramic chip");
		assert.ok(html.includes("chip-obturation-caoh2-MB"), "Has Ca(OH)2 chip");
	});

	it("7. Primary CTA: «✓ Зафиксировать протокол каналов» with zero disabled buttons (Mandate 8e, 8am)", () => {
		const html = renderToStaticMarkup(
			createElement(ChairsideEndoQuickBar, {
				activeTooth: 16,
				toothState: "Пульпит",
			}),
		);

		assert.ok(html.includes("btn-endo-transfer-to-diary"), "Has Primary CTA button");
		assert.ok(html.includes("Зафиксировать протокол каналов"), "Has clear action title");
		assert.ok(!html.includes("disabled"), "Mandate 8e: Primary CTA is NEVER disabled");
	});

	it("8. Express 1-click presets in header: Pulpitis 1-visit, Periodontitis Bioceramic, Ca(OH)2, Norm", () => {
		const html = renderToStaticMarkup(
			createElement(ChairsideEndoQuickBar, {
				activeTooth: 16,
			}),
		);

		assert.ok(html.includes("btn-quick-pulpitis-1visit"), "Has 1-visit pulpitis preset");
		assert.ok(html.includes("btn-quick-periodontitis-bio"), "Has Bioceramic periodontitis preset");
		assert.ok(html.includes("btn-quick-caoh2"), "Has Ca(OH)2 preset");
		assert.ok(html.includes("btn-quick-norm"), "Has anatomical norm preset");
	});

	it("9. Clean Language & Zero Bureaucracy (Zero '043/у' in UI)", () => {
		const html = renderToStaticMarkup(
			createElement(ChairsideEndoQuickBar, {
				activeTooth: 16,
			}),
		);

		assert.ok(!html.includes("043/у"), "Zero raw 043/у in UI");
		assert.ok(!html.includes("804н"), "Zero raw 804н in UI");
		assert.ok(html.includes("Протокол эндодонтии"), "Uses clean clinical domain language");
	});

	it("10. Zero Cartoon Emojis (Strictly Lucide Icons)", () => {
		const html = renderToStaticMarkup(
			createElement(ChairsideEndoQuickBar, {
				activeTooth: 16,
			}),
		);

		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!emojiRegex.test(html), "HTML markup must contain ZERO emojis");
	});

	it("11. Strict File Line Count Ceilings (Mandate 8b: <= 120 lines)", () => {
		const quickBarFile = path.resolve(__dirname, "../ChairsideEndoQuickBar.tsx");
		const lines = fs.readFileSync(quickBarFile, "utf-8").split("\n").length;
		assert.ok(lines <= 120, `ChairsideEndoQuickBar.tsx must be <= 120 lines (current: ${lines})`);
	});
});
