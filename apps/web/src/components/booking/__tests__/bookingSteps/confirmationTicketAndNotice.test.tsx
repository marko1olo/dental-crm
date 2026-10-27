import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicOnlineBookingWidget } from "../../PublicOnlineBookingWidget";

describe("Booking Steps: Confirmation Ticket & Respectful Callback Notice (Mandate 8p)", () => {
	it("renders Step 5: Booking Confirmation Ticket without dev embed code leaks", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, { initialStep: 5 }),
		);

		assert.ok(html.includes("Запись успешно оформлена!"));
		assert.ok(html.includes("dbw-ticket-pill"));
		assert.ok(html.includes("Скачать .ICS файл"));
		assert.ok(html.includes("Google Календарь"));
		assert.ok(html.includes("Яндекс Календарь"));

		assert.equal(html.includes("Получить HTML-код для вставки на сайт"), false);
		assert.equal(html.includes("dbw-embed-snippet-box"), false);
		assert.equal(html.includes("dente-booking-container"), false);
	});

	it("renders respectful callback notice without fake SMS blocking", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, { initialStep: 1 }),
		);

		assert.ok(html.includes("dbw-callback-notice"));
		assert.ok(html.includes("Администратор клиники перезвонит вам по номеру"));
		assert.equal(html.includes("Демо-СМС"), false);
		assert.equal(html.includes("DEV / Отладка"), false);
	});
});
