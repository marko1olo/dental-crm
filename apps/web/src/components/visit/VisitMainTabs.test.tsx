import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitMainTabs } from "./VisitMainTabs";

describe("VisitMainTabs Component", () => {
	it("renders main visit tabs with whitespace-nowrap and horizontal scroll container to prevent 3-line text wrapping", () => {
		const html = renderToStaticMarkup(
			createElement(VisitMainTabs, {
				visitSubViewTab: "emk",
				setVisitSubViewTab: () => {},
			}),
		);

		assert.ok(
			html.includes("overflow-x-auto"),
			"Contains overflow-x-auto container",
		);
		assert.ok(
			html.includes("whitespace-nowrap"),
			"Contains whitespace-nowrap utility class",
		);
		assert.ok(
			html.includes("shrink-0"),
			"Buttons have flex shrink-0 to prevent narrow collapsing",
		);
		assert.ok(html.includes("📝 ЭМК и Диктовка"), "Renders ЭМК tab");
		assert.ok(
			html.includes("🦷 Зубная формула и Дневник"),
			"Renders Зубная формула tab",
		);
		assert.ok(
			html.includes("🖼️ Рентгены и Диагностика"),
			"Renders Рентгены tab",
		);
	});
});
