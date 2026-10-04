import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { VisitPediatricProtocolWidget } from "../VisitPediatricProtocolWidget";
import { PediatricTeethChart } from "../PediatricTeethChart";
import { PediatricSomaticAndLegalRep } from "../PediatricSomaticAndLegalRep";

describe("Red Team Inquisition: Pediatric Mobile HIG Ergonomics & Zero Bird Language", () => {
	it("1. PediatricTeethChart renders sovereign mobile quadrant selector (Apple HIG: Anti-Desktop-Squeeze)", () => {
		const html = renderToString(
			createElement(PediatricTeethChart, {
				activeTooth: 54,
				mode: "primary",
			}),
		);

		// Мобильный контейнер и селектор квадрантов
		assert.ok(
			html.includes("pediatric-mobile-quadrant-view"),
			"Contains sovereign mobile quadrant view container",
		);
		assert.ok(
			html.includes("pediatric-quadrants-selector"),
			"Contains 4-quadrant mobile selector",
		);
		assert.ok(
			html.includes("pediatric-quadrant-btn-q5"),
			"Contains Q5 quadrant button (Upper Right 51..55)",
		);
		assert.ok(
			html.includes("pediatric-quadrant-btn-q6"),
			"Contains Q6 quadrant button (Upper Left 61..65)",
		);
		assert.ok(
			html.includes("pediatric-quadrant-btn-q7"),
			"Contains Q7 quadrant button (Lower Left 71..75)",
		);
		assert.ok(
			html.includes("pediatric-quadrant-btn-q8"),
			"Contains Q8 quadrant button (Lower Right 81..85)",
		);

		// Сетка мобильных зубов без горизонтального скролла
		assert.ok(
			html.includes("pediatric-mobile-teeth-grid"),
			"Contains 5-in-a-row mobile teeth grid for selected quadrant",
		);
		assert.ok(
			html.includes("grid-cols-5"),
			"Uses 5 columns layout for deciduous quadrant",
		);

		// Touch targets >= 44x44px в тулбаре активного зуба
		assert.ok(
			html.includes("min-h-[44px]"),
			"Tooth findings and resorption buttons meet Apple HIG touch minimum (>= 44px)",
		);
	});

	it("2. PediatricTeethChart in mixed dentition mode adapts mobile quadrant to 6 teeth", () => {
		const html = renderToString(
			createElement(PediatricTeethChart, {
				activeTooth: 16,
				mode: "mixed",
			}),
		);

		// При сменном прикусе в квадранте Q5 отображается 6 зубов (16 + 55..51)
		assert.ok(
			html.includes("grid-cols-6"),
			"Uses 6 columns layout in mobile quadrant when permanent molar 16 is included",
		);
		assert.ok(
			html.includes("Пост"),
			"Renders permanent molar badge for tooth 16",
		);
	});

	it("3. VisitPediatricProtocolWidget renders Floating Bottom Bar in thumb zone for mobile", () => {
		const html = renderToString(
			createElement(VisitPediatricProtocolWidget, {
				activeTooth: 54,
				initialFranklRating: 3,
			}),
		);

		// Мобильный Floating Bottom Bar
		assert.ok(
			html.includes("pediatric-mobile-bottom-bar"),
			"Contains mobile Floating Bottom Bar container with sticky positioning",
		);

		// Главная кнопка действия (Primary CTA) >= 52px
		assert.ok(
			html.includes("pediatric-mobile-btn-apply"),
			"Contains dominant Primary CTA button for mobile",
		);
		assert.ok(
			html.includes("min-h-[52px]") && html.includes("Внести протокол в карту"),
			"Primary CTA button has height >= 52px and clear title",
		);

		// Вторичные быстрые действия (плитки >= 44x44px)
		assert.ok(
			html.includes("pediatric-mobile-btn-invoice"),
			"Contains secondary 'В смету' mobile button",
		);
		assert.ok(
			html.includes("pediatric-mobile-btn-memo"),
			"Contains secondary 'Памятка' mobile button",
		);
		assert.ok(
			html.includes("pediatric-mobile-btn-diploma"),
			"Contains secondary 'Диплом' mobile button",
		);
	});

	it("4. Zero Bird Language & Clean Clinical Russian in pediatric workspace", () => {
		const html = renderToString(
			createElement(VisitPediatricProtocolWidget, {
				activeTooth: 54,
				initialFranklRating: 4,
				initialShowDetails: true,
			}),
		);

		// Проверяем человеческий медицинский язык протокола
		assert.ok(
			html.includes("ДНЕВНИК ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ПРИЁМА (МЕДИЦИНСКАЯ КАРТА)"),
			"Protocol header uses clean clinical Russian instead of bureaucratic 'Форма 043/у'",
		);
		assert.ok(
			html.includes("Услуги и манипуляции"),
			"Services section uses clean clinical Russian instead of bureaucratic 'Номенклатура 804н'",
		);
		assert.ok(
			html.includes("Превью записи в медицинскую карту пациента"),
			"Preview header purged of Soviet bureaucratic code",
		);

		// Проверяем PediatricSomaticAndLegalRep на отсутствие советского шифра
		const somaticHtml = renderToString(createElement(PediatricSomaticAndLegalRep, {}));
		assert.ok(
			!somaticHtml.includes("Форма 043/у"),
			"PediatricSomaticAndLegalRep UI must NOT display 'Форма 043/у' anywhere",
		);
		assert.ok(
			somaticHtml.includes("Родитель / Законный представитель:"),
			"Displays clear Russian legal representative section",
		);
	});
});
