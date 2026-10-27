import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	generateGoogleCalendarUrl,
	generateIcsCalendarContent,
	generateYandexCalendarUrl,
	resolveCategoryIcon,
} from "../../PublicOnlineBookingWidget";

describe("Booking Steps: Calendar & Icon Utilities", () => {
	it("generateIcsCalendarContent produces valid RFC 5545 iCalendar content", () => {
		const ics = generateIcsCalendarContent({
			title: "Приём в DENTE: Терапия",
			description: "Врач: Д-р Смирнова\\nТалон: DNT-2026-1234",
			location: "г. Москва, ул. Ленина, 42",
			startsAt: "2026-08-18T10:00:00.000Z",
			endsAt: "2026-08-18T10:45:00.000Z",
		});

		assert.ok(ics.includes("BEGIN:VCALENDAR"));
		assert.ok(ics.includes("END:VCALENDAR"));
		assert.ok(ics.includes("BEGIN:VEVENT"));
		assert.ok(ics.includes("END:VEVENT"));
		assert.ok(ics.includes("SUMMARY:Приём в DENTE: Терапия"));
		assert.ok(ics.includes("STATUS:CONFIRMED"));
	});

	it("generateGoogleCalendarUrl generates correct Google Calendar URL", () => {
		const url = generateGoogleCalendarUrl({
			title: "Приём в DENTE",
			description: "Визит к врачу",
			location: "ул. Ленина 42",
			startsAt: "2026-08-18T10:00:00.000Z",
			endsAt: "2026-08-18T10:30:00.000Z",
		});

		assert.ok(url.startsWith("https://calendar.google.com/calendar/render"));
		assert.ok(url.includes("action=TEMPLATE"));
	});

	it("generateYandexCalendarUrl generates correct Yandex Calendar URL", () => {
		const url = generateYandexCalendarUrl({
			title: "Приём в DENTE",
			description: "Визит к врачу",
			location: "ул. Ленина 42",
			startsAt: "2026-08-18T10:00:00.000Z",
			endsAt: "2026-08-18T10:30:00.000Z",
		});

		assert.ok(url.startsWith("https://calendar.yandex.ru/event/new"));
		assert.ok(url.includes("name="));
	});

	it("resolveCategoryIcon handles all 5 category icons cleanly", () => {
		assert.ok(resolveCategoryIcon("Stethoscope"));
		assert.ok(resolveCategoryIcon("Sparkles"));
		assert.ok(resolveCategoryIcon("Scissors"));
		assert.ok(resolveCategoryIcon("Smile"));
		assert.ok(resolveCategoryIcon("Activity"));
		assert.ok(resolveCategoryIcon("UnknownFallback"));
	});

	it("verifies apps/web/src/components/PublicOnlineBookingWidget.tsx facade exports match SSOT", async () => {
		const rootFacade = await import("../../../PublicOnlineBookingWidget.js");
		assert.ok(rootFacade.PublicOnlineBookingWidget);
		assert.ok(rootFacade.default);
		assert.equal(rootFacade.PublicOnlineBookingWidget, rootFacade.default);
	});
});
