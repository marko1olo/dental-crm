import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicOnlineBookingWidget } from "../../PublicOnlineBookingWidget";

describe("Booking Steps: Theme Overrides & Embed Modes", () => {
	it("supports custom theme, title, and subtitle overrides", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				title: "Запись в стоматологию доктора Кузнецова",
				subtitle: "Приём без очередей в центре города",
				theme: "calm_teal",
			}),
		);

		assert.ok(html.includes('data-theme="calm_teal"'));
		assert.ok(html.includes("Запись в стоматологию доктора Кузнецова"));
		assert.ok(html.includes("Приём без очередей в центре города"));
	});

	it("supports embedMode telegram, iframe, and modal attributes", () => {
		const tgHtml = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, { embedMode: "telegram" }),
		);
		assert.ok(tgHtml.includes('data-embed="telegram"'));
		assert.ok(tgHtml.includes("Telegram Mini App"));

		const iframeHtml = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, { embedMode: "iframe" }),
		);
		assert.ok(iframeHtml.includes('data-embed="iframe"'));
	});
});
