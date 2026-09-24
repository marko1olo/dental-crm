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
} from "../BookingConfirmationView";
import type { BookingConfirmationData } from "../PublicOnlineBookingWidget";

const mockConfirmationData: BookingConfirmationData = {
	referenceNumber: "DNT-7788-9900",
	date: "2026-10-15",
	time: "14:30",
	startsAt: "2026-10-15T14:30:00.000Z",
	endsAt: "2026-10-15T15:00:00.000Z",
	cabinetNumber: "Кабинет №5 (Хирургическое отделение)",
	patientName: "Алексей Смирнов",
	patientPhone: "+7 (999) 111-22-33",
	doctor: {
		id: "doc-1",
		fullName: "Д-р Смирнова Анна Павловна",
		specialties: ["Стоматолог-терапевт"],
		categoryIds: ["cat-1"],
		experienceYears: 12,
		rating: 4.95,
		reviewsCount: 142,
	},
	branch: {
		id: "b-1",
		name: "DENTE Центр",
		address: "г. Москва, ул. Тверская, д. 12",
		phone: "+7 (495) 100-20-30",
		workHours: "09:00 - 21:00",
	},
	createdAt: "2026-09-24T12:00:00.000Z",
};

describe("BookingConfirmationView: Ambient Art Backdrop & Floating Dental Boarding Pass (Mandates 8l, 8p)", () => {
	it("renders ambient art backdrop with soft scrim filter by default", () => {
		const html = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
				showArtBackdrop: true,
				artPack: "abstract",
			}),
		);

		assert.ok(
			html.includes("dbw-confirmation-view-container"),
			"Renders view container",
		);
		assert.ok(
			html.includes("dbw-confirmation-art-wrapper"),
			"Renders art wrapper",
		);
		assert.ok(
			html.includes("dbw-confirmation-scrim"),
			"Renders soft scrim filter layer",
		);
	});

	it("renders floating Dental Boarding Pass with elevated card classes", () => {
		const html = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
				isFloating: true,
			}),
		);

		assert.ok(
			html.includes("dbw-boarding-pass"),
			"Renders boarding pass container",
		);
		assert.ok(
			html.includes("dbw-floating-pass"),
			"Includes floating pass class",
		);
		assert.ok(
			html.includes("Dental Boarding Pass"),
			"Displays Dental Boarding Pass heading",
		);
		assert.ok(
			html.includes("Подтверждено"),
			"Displays confirmed status badge",
		);
		assert.ok(
			html.includes("dbw-pass-perforation"),
			"Includes ticket notch perforation line",
		);
	});

	it("renders exact ticket reference and details without data loss", () => {
		const html = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
			}),
		);

		assert.ok(
			html.includes("DNT-7788-9900"),
			"Displays reference number in ticket pill",
		);
		assert.ok(
			html.includes("Д-р Смирнова Анна Павловна"),
			"Displays doctor full name",
		);
		assert.ok(
			html.includes("Кабинет №5 (Хирургическое отделение)"),
			"Displays cabinet number",
		);
		assert.ok(
			html.includes("DENTE Центр — г. Москва, ул. Тверская, д. 12"),
			"Displays branch address",
		);
		assert.ok(
			html.includes("Алексей Смирнов"),
			"Displays patient name",
		);
		assert.ok(
			html.includes("+7 (999) 111-22-33"),
			"Displays patient phone",
		);
		assert.ok(
			html.includes("14:30"),
			"Displays appointment time",
		);
	});

	it("renders barcode, QR section, calendar and route export links", () => {
		const html = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
			}),
		);

		assert.ok(
			html.includes("dbw-pass-barcode-section"),
			"Renders barcode section",
		);
		assert.ok(
			html.includes("QR Ресепшен"),
			"Renders reception desk QR label",
		);
		assert.ok(
			html.includes("Скачать .ICS файл"),
			"Renders ICS download button",
		);
		assert.ok(
			html.includes("Google Календарь"),
			"Renders Google Calendar button",
		);
		assert.ok(
			html.includes("Яндекс Календарь"),
			"Renders Yandex Calendar button",
		);
		assert.ok(
			html.includes("Открыть маршрут в Яндекс.Картах"),
			"Renders Yandex Maps route button",
		);
		assert.ok(
			html.includes("Написать в WhatsApp клиники"),
			"Renders WhatsApp button",
		);
		assert.ok(
			html.includes("Распечатать талон"),
			"Renders print button",
		);
	});

	it("supports custom art packs (nature, abstract) and disabling backdrop", () => {
		const htmlWithoutBackdrop = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
				showArtBackdrop: false,
			}),
		);
		assert.equal(
			htmlWithoutBackdrop.includes("dbw-confirmation-art-wrapper"),
			false,
			"Does not render art wrapper when showArtBackdrop is false",
		);

		const htmlWithNature = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
				artPack: "nature",
				showArtBackdrop: true,
			}),
		);
		assert.ok(
			htmlWithNature.includes("dbw-confirmation-art-wrapper"),
			"Renders art wrapper with nature pack",
		);
	});

	it("supports multi-theme overrides (light, dark, night, calm_teal, contrast)", () => {
		for (const theme of ["light", "dark", "night", "calm_teal", "contrast"] as const) {
			const html = renderToStaticMarkup(
				createElement(BookingConfirmationView, {
					confirmationData: mockConfirmationData,
					theme,
				}),
			);
			assert.ok(
				html.includes(`data-theme="${theme}"`),
				`Renders data-theme="${theme}" attribute`,
			);
		}
	});

	it("renders re-book button when onReset callback is provided", () => {
		const htmlWithReset = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
				onReset: () => {},
			}),
		);
		assert.ok(
			htmlWithReset.includes("Записаться ещё раз"),
			"Contains re-book button when onReset provided",
		);

		const htmlWithoutReset = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: mockConfirmationData,
			}),
		);
		assert.equal(
			htmlWithoutReset.includes("Записаться ещё раз"),
			false,
			"Omits re-book button when onReset is not provided",
		);
	});

	it("calendar and date helpers function accurately", () => {
		const formattedDate = formatRussianDate("2026-10-15");
		assert.ok(
			formattedDate.includes("октября") && formattedDate.includes("2026"),
			"Formats Russian date properly",
		);

		const ics = generateIcsCalendarContent({
			title: "Приём DENTE",
			description: "Запись на приём",
			location: "г. Москва",
			startsAt: "2026-10-15T10:00:00.000Z",
			endsAt: "2026-10-15T10:30:00.000Z",
		});
		assert.ok(ics.includes("BEGIN:VCALENDAR"), "Produces valid ICS header");
		assert.ok(ics.includes("SUMMARY:Приём DENTE"), "Contains summary");

		const gUrl = generateGoogleCalendarUrl({
			title: "DENTE",
			description: "Тест",
			location: "Клиника",
			startsAt: "2026-10-15T10:00:00.000Z",
			endsAt: "2026-10-15T10:30:00.000Z",
		});
		assert.ok(gUrl.includes("calendar.google.com"), "Generates valid Google Calendar URL");

		const yUrl = generateYandexCalendarUrl({
			title: "DENTE",
			description: "Тест",
			location: "Клиника",
			startsAt: "2026-10-15T10:00:00.000Z",
			endsAt: "2026-10-15T10:30:00.000Z",
		});
		assert.ok(yUrl.includes("calendar.yandex.ru"), "Generates valid Yandex Calendar URL");
	});
});
