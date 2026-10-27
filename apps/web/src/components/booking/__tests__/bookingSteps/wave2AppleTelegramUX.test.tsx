import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingDoctorCard, type BookingDoctorData } from "../../BookingDoctorCard";
import { BookingSlotPicker } from "../../BookingSlotPicker";
import { PublicOnlineBookingWidget } from "../../PublicOnlineBookingWidget";

describe("Booking Steps: Apple & Telegram Mini-App UX (Mandates 8c, 8e, 8n)", () => {
	it("renders compact days ribbon with Сегодня, Завтра, and time slot periods", () => {
		const html = renderToStaticMarkup(createElement(PublicOnlineBookingWidget, { initialStep: 1 }));
		assert.ok(html.includes("dbw-days-ribbon"));
		assert.ok(html.includes("Сегодня"));
		assert.ok(html.includes("Завтра"));
		assert.ok(html.includes("Ближайшие дни:"));
		assert.ok(html.includes("Утро ("));
		assert.ok(html.includes("День ("));
		assert.ok(html.includes("Вечер ("));

		const slotPickerHtml = renderToStaticMarkup(
			createElement(BookingSlotPicker, {
				selectedDate: "2026-08-20",
				onSelectDate: () => {},
				calendarMonth: new Date(2026, 7, 1),
				onPrevMonth: () => {},
				onNextMonth: () => {},
				calendarDays: [],
				monthLabel: "Август 2026",
				slots: [
					{ time: "09:30", startsAt: "2026-08-20T09:30:00Z", endsAt: "2026-08-20T10:00:00Z", period: "morning" },
					{ time: "14:00", startsAt: "2026-08-20T14:00:00Z", endsAt: "2026-08-20T14:30:00Z", period: "afternoon" },
					{ time: "18:00", startsAt: "2026-08-20T18:00:00Z", endsAt: "2026-08-20T18:30:00Z", period: "evening" },
				],
				selectedSlot: null,
				onSelectSlot: () => {},
				slotsLoading: false,
			}),
		);
		assert.ok(slotPickerHtml.includes("Утро (09:00–12:00)"));
		assert.ok(slotPickerHtml.includes("День (12:00–16:00)"));
		assert.ok(slotPickerHtml.includes("Вечер (16:00–21:00)"));
	});

	it("renders solo-doctor 40px avatar and mini-badge per Mandate 8n", () => {
		const soloDoc: BookingDoctorData = {
			id: "doc-solo-smirnova",
			fullName: "Смирнова Е. В.",
			specialties: ["Врач-стоматолог-терапевт"],
			experienceYears: 12,
			rating: 4.9,
			reviewsCount: 156,
			categoryIds: ["all"],
			avatarUrl: "https://dente.clinic/avatars/smirnova.jpg",
		};
		const html = renderToStaticMarkup(createElement(PublicOnlineBookingWidget, { customDoctors: [soloDoc] }));
		assert.ok(html.includes("dbw-solo-doctor-banner"));
		assert.ok(html.includes("Ваш доктор:"));
		assert.ok(html.includes("Смирнова Е. В."));
		assert.ok(html.includes("Стаж 12 лет"));
		assert.ok(html.includes("Опыт 12 лет"));
		assert.ok(html.includes("4.9"));
		assert.ok(html.includes("smirnova.jpg"));
	});

	it("renders Telegram 1-tap booking card and 'Поделиться номером в Telegram' button", () => {
		const html = renderToStaticMarkup(createElement(PublicOnlineBookingWidget, { embedMode: "telegram" }));
		assert.ok(html.includes("dbw-tg-1tap-card"));
		assert.ok(html.includes("Поделиться номером в Telegram"));
		assert.ok(html.includes("Telegram 1-тап запись"));
	});

	it("renders Dental Boarding Pass with barcode, QR section, Yandex Maps and WhatsApp links", () => {
		const html = renderToStaticMarkup(createElement(PublicOnlineBookingWidget, { initialStep: 5 }));
		assert.ok(html.includes("dbw-boarding-pass"));
		assert.ok(html.includes("Dental Boarding Pass"));
		assert.ok(html.includes("dbw-pass-perforation"));
		assert.ok(html.includes("dbw-pass-barcode-section"));
		assert.ok(html.includes("Открыть маршрут в Яндекс.Картах"));
		assert.ok(html.includes("Написать в WhatsApp клиники"));
		assert.ok(html.includes("Кабинет №3"));
	});
});
