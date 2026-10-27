import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	BookingConfirmationView,
	formatRussianDate,
	generateGoogleCalendarUrl,
	generateIcsCalendarContent,
	generateYandexCalendarUrl,
} from "../../BookingConfirmationView";
import { mockConfirmationData } from "./mockConfirmationData";

describe("BookingConfirmationView: Integrations & Calendar Export", () => {
	it("renders barcode, QR section, calendar and route export links", () => {
		const html = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
			}),
		);

		assert.ok(html.includes("dbw-pass-barcode-section"));
		assert.ok(html.includes("QR Ресепшен"));
		assert.ok(html.includes("Скачать .ICS файл"));
		assert.ok(html.includes("Google Календарь"));
		assert.ok(html.includes("Яндекс Календарь"));
		assert.ok(html.includes("Открыть маршрут в Яндекс.Картах"));
		assert.ok(html.includes("Написать в WhatsApp клиники"));
		assert.ok(html.includes("Распечатать талон"));
	});

	it("calendar and date helpers function accurately", () => {
		const formattedDate = formatRussianDate("2026-10-15");
		assert.ok(formattedDate.includes("октября") && formattedDate.includes("2026"));

		const ics = generateIcsCalendarContent({
			title: "Приём DENTE",
			description: "Запись на приём",
			location: "г. Москва",
			startsAt: "2026-10-15T10:00:00.000Z",
			endsAt: "2026-10-15T10:30:00.000Z",
		});
		assert.ok(ics.includes("BEGIN:VCALENDAR"));
		assert.ok(ics.includes("SUMMARY:Приём DENTE"));

		const gUrl = generateGoogleCalendarUrl({
			title: "DENTE",
			description: "Тест",
			location: "Клиника",
			startsAt: "2026-10-15T10:00:00.000Z",
			endsAt: "2026-10-15T10:30:00.000Z",
		});
		assert.ok(gUrl.includes("calendar.google.com"));

		const yUrl = generateYandexCalendarUrl({
			title: "DENTE",
			description: "Тест",
			location: "Клиника",
			startsAt: "2026-10-15T10:00:00.000Z",
			endsAt: "2026-10-15T10:30:00.000Z",
		});
		assert.ok(yUrl.includes("calendar.yandex.ru"));
	});
});
