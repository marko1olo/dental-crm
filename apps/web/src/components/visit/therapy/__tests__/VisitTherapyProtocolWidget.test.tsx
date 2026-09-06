import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitTherapyProtocolWidget } from "../VisitTherapyProtocolWidget";

describe("VisitTherapyProtocolWidget (Chairside 30-second Therapy & Restoration)", () => {
	it("renders therapeutic protocol widget for upper molar 16 with Caries preset", () => {
		const html = renderToStaticMarkup(
			createElement(VisitTherapyProtocolWidget, {
				activeTooth: 16,
			}),
		);

		// Заголовок и номер зуба
		assert.ok(html.includes("Зуб 16"), "Header indicates active tooth 16");
		assert.ok(html.includes("Терапевтический протокол"), "Header has therapeutic title");

		// 1-клик пресеты
		assert.ok(html.includes("Кариес"), "Has 1-click caries preset");
		assert.ok(html.includes("Замена пломбы"), "Has 1-click failed filling replacement preset");
		assert.ok(html.includes("Клин. дефект"), "Has 1-click wedge defect preset");
		assert.ok(html.includes("Эстетика / Виниринг"), "Has 1-click frontal aesthetic preset");

		// Поверхности в 1 клик
		assert.ok(html.includes("[MOD]"), "Has [MOD] combo chip");
		assert.ok(html.includes("[MO]"), "Has [MO] combo chip");
		assert.ok(html.includes("[OD]"), "Has [OD] combo chip");
		assert.ok(html.includes("[O]"), "Has [O] combo chip");

		// Гарантия СтАР
		assert.ok(html.includes("Гарантия"), "Has StAR warranty indicator");

		// Кнопки действий
		assert.ok(html.includes("Внести в 043/у"), "Has primary 1-click Form 043/u action button");
		assert.ok(html.includes("В смету"), "Has 1-click invoice / estimate service button");

		// Тач-таргеты >= 44px (Мандат 8d)
		assert.ok(
			html.includes("min-h-[48px]") || html.includes("min-h-[44px]") || html.includes("min-h-[52px]"),
			"Controls meet Mandate 8d touch target requirements (>= 44px)",
		);

		// Ноль эмодзи (Мандат 8d)
		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!emojiRegex.test(html), "HTML markup must contain ZERO emojis (strictly Lucide icons)");
	});

	it("renders aesthetic restoration defaults for anterior tooth 11", () => {
		const html = renderToStaticMarkup(
			createElement(VisitTherapyProtocolWidget, {
				activeTooth: 11,
			}),
		);

		assert.ok(html.includes("Зуб 11"), "Header indicates tooth 11");
		assert.ok(html.includes("MID") || html.includes("M, I, D"), "Defaults to anterior surfaces");
	});
});
