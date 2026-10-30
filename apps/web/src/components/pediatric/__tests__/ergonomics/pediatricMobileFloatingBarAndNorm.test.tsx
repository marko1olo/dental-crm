import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { VisitPediatricProtocolWidget } from "../../VisitPediatricProtocolWidget";
import { PediatricTeethChart } from "../../PediatricTeethChart";
import { PediatricSomaticAndLegalRep } from "../../PediatricSomaticAndLegalRep";

describe("Pediatric Mobile Floating Bottom Bar & Zero Bird Language", () => {
	it("VisitPediatricProtocolWidget renders Floating Bottom Bar in thumb zone for mobile", () => {
		const html = renderToString(createElement(VisitPediatricProtocolWidget, {
			activeTooth: 54, initialFranklRating: 3,
		}));

		assert.ok(html.includes("pediatric-mobile-bottom-bar"));
		assert.ok(html.includes("pediatric-mobile-btn-apply"));
		assert.ok(html.includes("min-h-[52px]") && html.includes("Внести протокол в карту"));
		assert.ok(html.includes("pediatric-mobile-btn-invoice"));
		assert.ok(html.includes("pediatric-mobile-btn-memo"));
		assert.ok(html.includes("pediatric-mobile-btn-diploma"));
	});

	it("Zero Bird Language & Clean Clinical Russian in pediatric workspace", () => {
		const html = renderToString(createElement(VisitPediatricProtocolWidget, {
			activeTooth: 54, initialFranklRating: 4, initialShowDetails: true,
		}));

		assert.ok(html.includes("ДНЕВНИК ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ПРИЁМА (МЕДИЦИНСКАЯ КАРТА)"));
		assert.ok(html.includes("Услуги и манипуляции"));
		assert.ok(html.includes("Превью записи в медицинскую карту пациента"));

		const somaticHtml = renderToString(createElement(PediatricSomaticAndLegalRep, {}));
		assert.ok(!somaticHtml.includes("Форма 043/у"));
		assert.ok(somaticHtml.includes("Родитель / Законный представитель:"));
	});

	it("Mandate 8e: Dominant 1-click physiological root resorption norm (K08.8) with touch target >= 44px", () => {
		const html = renderToString(createElement(PediatricTeethChart, {
			activeTooth: 54, mode: "primary", onApplyPhysiologicalResorption: () => {},
		}));

		assert.ok(html.includes("pediatric-resorption-norm-btn"));
		assert.ok(html.includes("Смена корней (K08.8)"));
		assert.ok(html.includes("min-h-[44px]"));
	});
});
