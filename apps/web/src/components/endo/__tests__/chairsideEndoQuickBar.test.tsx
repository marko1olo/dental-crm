import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { createElement } from "react";
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
		assert.deepEqual(canals16.map((c) => c.name), ["MB", "DB", "P"], "Molar 16 has MB, DB, P");
		const html = renderToStaticMarkup(createElement(ChairsideEndoQuickBar, { activeTooth: 16 }));
		assert.ok(html.includes("MB") && html.includes("DB") && html.includes("P"), "Renders canals");
		assert.ok(html.includes("Зуб #16"), "Renders tooth 16");
	});

	it("2. Lower molar (46) has anatomical canals M, D", () => {
		const canals46 = getChairsideDefaultCanals(46);
		assert.deepEqual(canals46.map((c) => c.name), ["M", "D"], "Molar 46 has M, D");
		const html = renderToStaticMarkup(createElement(ChairsideEndoQuickBar, { activeTooth: 46 }));
		assert.ok(html.includes("Канал M") && html.includes("Канал D"), "Renders canals M, D");
	});

	it("3. Premolar (14) has B, P and incisor (21) has single main canal", () => {
		assert.deepEqual(getChairsideDefaultCanals(14).map((c) => c.name), ["B", "P"]);
		assert.equal(getChairsideDefaultCanals(21).length, 1);
	});

	it("4. Primary CTA: «✓ Зафиксировать протокол каналов» with zero disabled buttons", () => {
		const html = renderToStaticMarkup(createElement(ChairsideEndoQuickBar, { activeTooth: 16, toothState: "Пульпит" }));
		assert.ok(html.includes("btn-endo-transfer-to-diary"), "Has Primary CTA button");
		assert.ok(html.includes("Перенести в дневник"), "Has clear action title");
		assert.ok(!html.includes("disabled"), "Mandate 8e: Primary CTA is NEVER disabled");
	});

	it("5. Express 1-click presets in header: Pulpitis 1-visit, Periodontitis Bio, Ca(OH)2, Norm", () => {
		const html = renderToStaticMarkup(createElement(ChairsideEndoQuickBar, { activeTooth: 16 }));
		assert.ok(html.includes("btn-quick-pulpitis-1visit"), "Has 1-visit pulpitis preset");
		assert.ok(html.includes("btn-quick-periodontitis-bio"), "Has Bioceramic periodontitis preset");
		assert.ok(html.includes("btn-quick-caoh2"), "Has Ca(OH)2 preset");
		assert.ok(html.includes("btn-quick-norm"), "Has anatomical norm preset");
	});

	it("6. Clean Language & Zero Bureaucracy (Zero '043/у' in UI)", () => {
		const html = renderToStaticMarkup(createElement(ChairsideEndoQuickBar, { activeTooth: 16 }));
		assert.ok(!html.includes("043/у") && !html.includes("804н"), "Zero raw laws in UI");
		assert.ok(html.includes("Протокол эндодонтии"), "Uses clean clinical domain language");
	});

	it("7. Zero Cartoon Emojis (Strictly Lucide Icons)", () => {
		const html = renderToStaticMarkup(createElement(ChairsideEndoQuickBar, { activeTooth: 16 }));
		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!emojiRegex.test(html), "HTML markup must contain ZERO emojis");
	});

	it("8. Healthy File Line Count Ceilings (Mandate 8b / 8zi: <= 350 lines)", () => {
		const quickBarFile = path.resolve(__dirname, "../ChairsideEndoQuickBar.tsx");
		const lines = fs.readFileSync(quickBarFile, "utf-8").split("\n").length;
		assert.ok(lines <= 350, `ChairsideEndoQuickBar.tsx must be in healthy sweet spot <= 350 lines (current: ${lines})`);
	});
});
