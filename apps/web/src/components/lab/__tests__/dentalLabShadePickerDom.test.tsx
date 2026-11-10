import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getBridgeSpanTeeth } from "../dentalLabCatalogData";
import { DentalLabShadePicker } from "../DentalLabShadePicker";

describe("dentalLabShadePickerDom — Shade & Odontogram Controls", () => {
	it("рендерит шкалу VITA Classical и выбранный коронковый оттенок", () => {
		const html = renderToString(
			<DentalLabShadePicker
				selectedShade="A2"
				onSelectShade={() => {}}
			/>,
		);
		assert.ok(html.includes("VITA Classical"));
		assert.ok(html.includes("A2"));
		assert.ok(html.includes("vita-shade-A2"));
	});

	it("отображает бейдж выбранной культи в верхней панели", () => {
		const html = renderToString(
			<DentalLabShadePicker
				selectedShade="A2"
				onSelectShade={() => {}}
				selectedStumpShade="ND3"
				onSelectStumpShade={() => {}}
				showStumpSelector={true}
			/>,
		);
		assert.ok(html.includes('data-testid="selected-stump-shade-header-chip"'));
		assert.ok(html.includes("ND3"));
		assert.ok(html.includes("Культя:"));
	});

	it("не отображает бейдж культи без выбора, и рендерит сетку ND1–ND9", () => {
		const htmlWithout = renderToString(
			<DentalLabShadePicker
				selectedShade="A2"
				onSelectShade={() => {}}
				selectedStumpShade={null}
			/>,
		);
		assert.strictEqual(htmlWithout.includes('data-testid="selected-stump-shade-header-chip"'), false);

		const htmlWith = renderToString(
			<DentalLabShadePicker
				selectedShade="B1"
				onSelectShade={() => {}}
				showStumpSelector={true}
			/>,
		);
		assert.ok(htmlWith.includes('data-testid="stump-shade-container"'));
		assert.ok(htmlWith.includes('data-testid="stump-shade-ND1"'));
	});

	it("алгоритм getBridgeSpanTeeth расширяет мостовидный пролет для >= 2 зубов", () => {
		assert.deepStrictEqual(getBridgeSpanTeeth([14, 16]), [14, 15, 16]);
		assert.deepStrictEqual(getBridgeSpanTeeth([16]), [16]);
	});

	it("компоненты свободны от эмодзи", () => {
		const shadeHtml = renderToString(
			<DentalLabShadePicker
				selectedShade="A3"
				onSelectShade={() => {}}
				selectedStumpShade="ND4"
				showStumpSelector={true}
			/>,
		);
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.strictEqual(emojiRegex.test(shadeHtml), false);
	});
});
