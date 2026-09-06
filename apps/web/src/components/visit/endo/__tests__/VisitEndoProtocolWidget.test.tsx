import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitEndoProtocolWidget } from "../VisitEndoProtocolWidget";

describe("VisitEndoProtocolWidget (Chairside 30-second Endo)", () => {
	it("renders endodontic protocol widget for upper molar 16 with anatomical canals (MB1, MB2, DB, P)", () => {
		const html = renderToStaticMarkup(
			createElement(VisitEndoProtocolWidget, {
				activeTooth: 16,
			}),
		);

		// Заголовок и каналы
		assert.ok(html.includes("Зуб 16"), "Header indicates active tooth 16");
		assert.ok(html.includes("MB1"), "Renders MB1 canal");
		assert.ok(html.includes("MB2"), "Renders MB2 canal");
		assert.ok(html.includes("DB"), "Renders DB canal");
		assert.ok(html.includes("P"), "Renders P canal");
		assert.ok(html.includes("4 канала"), "Indicates 4 canals for tooth 16");

		// 1-клик пресеты
		assert.ok(html.includes("Первичное эндо"), "Has 1-click primary endo preset");
		assert.ok(html.includes("Перелечивание"), "Has 1-click retreatment preset");
		assert.ok(html.includes("Обтурация каналов"), "Has 1-click obturation preset");
		assert.ok(html.includes("Экспресс до апекса"), "Has 1-click express apical preset");

		// Кнопка сохранения в 043/у
		assert.ok(
			html.includes("Вставить протокол эндодонтии в 043/у"),
			"Has primary action button for Form 043/y",
		);

		// Тач-таргеты >= 44px
		assert.ok(
			html.includes("min-h-[48px]") || html.includes("min-h-[44px]") || html.includes("h-11"),
			"Controls meet Mandate 8d touch target requirements (>= 44px)",
		);

		// Проверка на отсутствие мультяшных эмодзи (Мандат 8d)
		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!emojiRegex.test(html), "HTML markup must contain ZERO emojis (strictly Lucide icons)");
	});

	it("renders single canal for anterior incisor (tooth 21)", () => {
		const html = renderToStaticMarkup(
			createElement(VisitEndoProtocolWidget, {
				activeTooth: 21,
			}),
		);

		assert.ok(html.includes("Зуб 21"), "Header indicates tooth 21");
		assert.ok(html.includes("1 канал"), "Indicates 1 canal for anterior incisor");
		assert.ok(html.includes("Main"), "Main canal rendered");
	});
});
