import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitPediatricProtocolWidget } from "../../VisitPediatricProtocolWidget";

const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("VisitPediatricProtocolWidget Chairside Rendering", () => {
	it("renders pediatric protocol widget for primary upper molar 54 with Caries preset", () => {
		const html = renderToStaticMarkup(createElement(VisitPediatricProtocolWidget, {
			activeTooth: 54, initialFranklRating: 3,
		}));

		assert.ok(html.includes("Зуб 54"), "Header indicates active primary tooth 54");
		assert.ok(html.includes("Верхний правый первый моляр"), "Displays anatomical name for tooth 54");
		assert.ok(html.includes("Детский приём у кресла"), "Header indicates pediatric chairside title");

		assert.ok(html.includes("Шкала поведения Франкла"), "Contains Frankl scale title");
		assert.ok(html.includes("Рейтинг --") && html.includes("Рейтинг -") && html.includes("Рейтинг +") && html.includes("Рейтинг ++"));
		assert.ok(html.includes("Франкл +"), "Displays active Frankl 3 (+) indicator");

		assert.ok(html.includes("Кариес (СИЦ / SDR)") && html.includes("K02.1") && html.includes("A16.07.002.001"));
		assert.ok(html.includes("Пульпотомия (Pulpotec)"));
		assert.ok(html.includes("Серебрение / Фтор"));
		assert.ok(html.includes("Герметизация (Fissurit)"));
		assert.ok(html.includes("Удаление (смена корней)"));
		assert.ok(html.includes("Коронка (Hall / SSC)") && html.includes("A16.07.004.001"));

		assert.ok(html.includes("Уздечки губ и языка"));
		assert.ok(html.includes("Носовое дыхание"));
		assert.ok(html.includes("Вредные привычки"));

		assert.ok(html.includes("[MOD]") && html.includes("[MO]") && html.includes("[OD]") && html.includes("[O]") && html.includes("[V]") && html.includes("[L/P]"));
		assert.ok(html.includes("СИЦ Fuji IX") && html.includes("Twinky Star") && html.includes("SDR Flow"));

		assert.ok(html.includes("Внести в карту") || html.includes("Внести в дневник"));
		assert.ok(html.includes("В смету"));
		assert.ok(html.includes("Памятка родителям"));

		assert.ok(html.includes("min-h-[48px]") || html.includes("min-h-[52px]"));
		assert.ok(!EMOJI_REGEX.test(html), "HTML markup must contain ZERO emojis");
	});

	it("renders correctly with Frankl 1 (--) Definitely Negative rating", () => {
		const html = renderToStaticMarkup(createElement(VisitPediatricProtocolWidget, {
			activeTooth: 51, initialFranklRating: 1,
		}));
		assert.ok(html.includes("Зуб 51"));
		assert.ok(html.includes("Верхний правый центральный резец"));
		assert.ok(html.includes("Франкл --"));
		assert.ok(html.includes("Tell-Show-Do"));
	});

	it("renders correctly for permanent molar 16 (fissure sealing candidate)", () => {
		const html = renderToStaticMarkup(createElement(VisitPediatricProtocolWidget, {
			activeTooth: 16, initialFranklRating: 4,
		}));
		assert.ok(html.includes("Зуб 16"));
		assert.ok(html.includes("Верхний правый первый постоянный моляр"));
		assert.ok(html.includes("Франкл ++"));
	});
});
