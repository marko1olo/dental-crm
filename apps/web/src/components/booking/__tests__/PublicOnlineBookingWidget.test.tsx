import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	BookingAnyDoctorCard,
	BookingDoctorCard,
	type BookingDoctorData,
} from "../BookingDoctorCard";
import {
	BookingSlotPicker,
	type BookingSlotItem,
} from "../BookingSlotPicker";
import {
	DEFAULT_BRANCHES,
	DEFAULT_DOCTORS,
	DEFAULT_SERVICE_CATEGORIES,
	PublicOnlineBookingWidget,
	formatRussianDate,
	formatRussianPhone,
	generateBookingReference,
	generateEmbedSnippet,
	generateGoogleCalendarUrl,
	generateIcsCalendarContent,
	generateYandexCalendarUrl,
	isValidRussianPhone,
	localDateString,
	resolveCategoryIcon,
} from "../PublicOnlineBookingWidget";

describe("PublicOnlineBookingWidget: Streamlined 1-Screen 2-Click UX (Mandates 8e, 8k, 8p, 8n)", () => {
	it("renders streamlined 1-screen booking flow with Click 1 (Date/Time) and Click 2 (Contacts/Submit)", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				initialStep: 1,
			}),
		);

		// Header & Clinic branding
		assert.ok(
			html.includes("Онлайн-запись в клинику DENTE"),
			"Contains default widget title",
		);
		assert.ok(
			html.includes("Стоматологический центр DENTE"),
			"Contains clinic header badge",
		);
		assert.ok(
			html.includes("dbw-streamlined-flow"),
			"Contains streamlined 1-screen flow container",
		);

		// Click 1: Date & Time picker
		assert.ok(
			html.includes("Выберите дату и время приёма"),
			"Contains Click 1 Date & Time heading",
		);
		assert.ok(
			html.includes("dbw-calendar-container"),
			"Contains calendar container",
		);

		// Click 2: Patient Contacts & Book button
		assert.ok(
			html.includes("Ваши контактные данные"),
			"Contains Click 2 Patient Contacts heading",
		);
		assert.ok(
			html.includes("patient-name-input"),
			"Contains patient name input",
		);
		assert.ok(
			html.includes("patient-phone-input"),
			"Contains patient phone input",
		);
		assert.ok(
			html.includes("Записаться на приём"),
			"Contains Click 2 submit button 'Записаться на приём'",
		);
		assert.ok(
			html.includes("data-testid=\"step4-confirm-btn\""),
			"Contains test hook step4-confirm-btn",
		);
	});

	it("strictly purges hardcoded Samara mock arrays per Mandates 8a & 8k (Zero Mocks)", () => {
		// Verify exported mock arrays are clean empty arrays
		assert.equal(
			DEFAULT_BRANCHES.length,
			0,
			"DEFAULT_BRANCHES must be an empty array",
		);
		assert.equal(
			DEFAULT_DOCTORS.length,
			0,
			"DEFAULT_DOCTORS must be an empty array",
		);
		assert.equal(
			DEFAULT_SERVICE_CATEGORIES.length,
			0,
			"DEFAULT_SERVICE_CATEGORIES must be an empty array",
		);

		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {}),
		);

		// Ensure Samara hardcodes do not leak into output
		assert.equal(
			html.includes("г. Самара"),
			false,
			"Does not leak Samara city name",
		);
		assert.equal(
			html.includes("Филиал «Центральный»"),
			false,
			"Does not leak hardcoded central branch",
		);
		assert.equal(
			html.includes("Филиал «На Московском»"),
			false,
			"Does not leak hardcoded moscow branch",
		);
		assert.equal(
			html.includes("Д-р Смирнова Елена Владимировна"),
			false,
			"Does not leak hardcoded doctor",
		);
	});

	it("renders compact solo doctor banner when 1 doctor is provided (Mandate 8n Solo Doctor Sovereignty)", () => {
		const soloDoctor: BookingDoctorData = {
			id: "doc-solo-1",
			fullName: "Д-р Кузнецов Андрей Игоревич",
			specialties: ["Стоматолог-терапевт", "Ортопед"],
			experienceYears: 12,
			rating: 4.95,
			reviewsCount: 88,
			categoryIds: ["all"],
		};

		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				customDoctors: [soloDoctor],
			}),
		);

		// Must render compact solo doctor banner
		assert.ok(
			html.includes("dbw-solo-doctor-banner"),
			"Renders dbw-solo-doctor-banner",
		);
		assert.ok(
			html.includes("Соло-доктор"),
			"Displays 'Соло-доктор' tag",
		);
		assert.ok(
			html.includes("Д-р Кузнецов Андрей Игоревич"),
			"Renders solo doctor full name",
		);
		assert.ok(
			html.includes("Опыт 12 лет"),
			"Renders doctor experience",
		);

		// Must NOT render multi-card doctor selector when solo doctor is active
		assert.equal(
			html.includes("Любой свободный специалист"),
			false,
			"Does NOT show 'Любой свободный специалист' for solo doctor",
		);
	});

	it("renders doctor list with 'Любой свободный специалист' when multiple doctors are provided", () => {
		const multipleDoctors: BookingDoctorData[] = [
			{
				id: "doc-1",
				fullName: "Д-р Смирнова Елена",
				specialties: ["Терапевт"],
				experienceYears: 10,
				rating: 5.0,
				reviewsCount: 45,
				categoryIds: ["all"],
			},
			{
				id: "doc-2",
				fullName: "Д-р Васильев Олег",
				specialties: ["Хирург"],
				experienceYears: 15,
				rating: 4.9,
				reviewsCount: 60,
				categoryIds: ["all"],
			},
		];

		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				customDoctors: multipleDoctors,
			}),
		);

		assert.ok(
			html.includes("dbw-doctors-list"),
			"Renders dbw-doctors-list container",
		);
		assert.ok(
			html.includes("Любой свободный специалист"),
			"Renders 'Любой свободный специалист' option",
		);
		assert.ok(
			html.includes("Д-р Смирнова Елена"),
			"Renders doctor 1",
		);
		assert.ok(
			html.includes("Д-р Васильев Олег"),
			"Renders doctor 2",
		);
	});

	it("renders Step 5: Booking Confirmation Ticket without dev embed code leaks (Mandate 8p)", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				initialStep: 5,
			}),
		);

		assert.ok(
			html.includes("Запись успешно оформлена!"),
			"Renders success title",
		);
		assert.ok(
			html.includes("dbw-ticket-pill"),
			"Renders ticket pill element",
		);
		assert.ok(
			html.includes("Скачать .ICS файл"),
			"Contains ICS download button",
		);
		assert.ok(
			html.includes("Google Календарь"),
			"Contains Google Calendar link",
		);
		assert.ok(
			html.includes("Яндекс Календарь"),
			"Contains Yandex Calendar link",
		);

		// Mandate 8p: Absolute ban on developer embed code leaks on patient ticket
		assert.equal(
			html.includes("Получить HTML-код для вставки на сайт"),
			false,
			"Does NOT show embed snippet button to patient",
		);
		assert.equal(
			html.includes("dbw-embed-snippet-box"),
			false,
			"Does NOT render embed snippet box on confirmation",
		);
		assert.equal(
			html.includes("dente-booking-container"),
			false,
			"Does NOT leak widget script container into patient view",
		);
	});

	it("renders respectful callback notice without fake SMS blocking (Friction-Killer Law)", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				initialStep: 1,
			}),
		);

		assert.ok(
			html.includes("dbw-callback-notice"),
			"Contains respectful callback notice container",
		);
		assert.ok(
			html.includes("Администратор клиники перезвонит вам по номеру"),
			"Contains respectful callback text",
		);
		assert.equal(
			html.includes("Демо-СМС"),
			false,
			"Does not display fake demo SMS badge",
		);
		assert.equal(
			html.includes("DEV / Отладка"),
			false,
			"Does not display dev debug badge",
		);
	});

	it("supports custom theme, title, and subtitle overrides", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				title: "Запись в стоматологию доктора Кузнецова",
				subtitle: "Приём без очередей в центре города",
				theme: "calm_teal",
			}),
		);

		assert.ok(
			html.includes('data-theme="calm_teal"'),
			"Sets data-theme='calm_teal'",
		);
		assert.ok(
			html.includes("Запись в стоматологию доктора Кузнецова"),
			"Renders custom title",
		);
		assert.ok(
			html.includes("Приём без очередей в центре города"),
			"Renders custom subtitle",
		);
	});

	it("supports embedMode telegram, iframe, and modal attributes", () => {
		const tgHtml = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				embedMode: "telegram",
			}),
		);
		assert.ok(
			tgHtml.includes('data-embed="telegram"'),
			"Sets data-embed=telegram attribute",
		);
		assert.ok(
			tgHtml.includes("Telegram Mini App"),
			"Renders TG Mini App header badge",
		);

		const iframeHtml = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				embedMode: "iframe",
			}),
		);
		assert.ok(
			iframeHtml.includes('data-embed="iframe"'),
			"Sets data-embed=iframe attribute",
		);
	});
});

describe("Sub-components: BookingDoctorCard & BookingSlotPicker", () => {
	it("renders BookingDoctorCard with doctor bio, rating, specialties and touch target", () => {
		const doc: BookingDoctorData = {
			id: "doc-test-1",
			fullName: "Д-р Морозова Ольга",
			specialties: ["Терапевт-эндодонтист"],
			experienceYears: 9,
			rating: 4.96,
			reviewsCount: 112,
			bio: "Специалист по сложному эндодонтическому лечению под микроскопом",
			categoryIds: ["all"],
		};

		const html = renderToStaticMarkup(
			createElement(BookingDoctorCard, {
				doctor: doc,
				isSelected: true,
				onSelect: () => {},
			}),
		);

		assert.ok(html.includes("dbw-doctor-card selected"));
		assert.ok(html.includes(doc.fullName));
		assert.ok(html.includes(doc.bio || ""));
		assert.ok(html.includes("Стаж 9 лет"));
		assert.ok(html.includes("4.96"));
	});

	it("renders BookingAnyDoctorCard with quick selection prompt", () => {
		const html = renderToStaticMarkup(
			createElement(BookingAnyDoctorCard, {
				isSelected: false,
				onSelect: () => {},
			}),
		);

		assert.ok(html.includes("Любой свободный специалист"));
		assert.ok(html.includes("Самая быстрая запись"));
	});

	it("renders BookingSlotPicker with filter chips, calendar days and time slots", () => {
		const testSlots: BookingSlotItem[] = [
			{
				time: "09:30",
				startsAt: "2026-08-20T09:30:00.000Z",
				endsAt: "2026-08-20T10:00:00.000Z",
				period: "morning",
			},
			{
				time: "14:00",
				startsAt: "2026-08-20T14:00:00.000Z",
				endsAt: "2026-08-20T14:30:00.000Z",
				period: "afternoon",
			},
			{
				time: "18:30",
				startsAt: "2026-08-20T18:30:00.000Z",
				endsAt: "2026-08-20T19:00:00.000Z",
				period: "evening",
			},
		];

		const html = renderToStaticMarkup(
			createElement(BookingSlotPicker, {
				selectedDate: "2026-08-20",
				onSelectDate: () => {},
				calendarMonth: new Date(2026, 7, 1),
				onPrevMonth: () => {},
				onNextMonth: () => {},
				calendarDays: [
					{
						dayNumber: 20,
						dateStr: "2026-08-20",
						isCurrentMonth: true,
						isPast: false,
						isToday: true,
						isSelected: true,
					},
				],
				monthLabel: "Август 2026",
				slots: testSlots,
				selectedSlot: testSlots[0] || null,
				onSelectSlot: () => {},
				slotsLoading: false,
			}),
		);

		assert.ok(html.includes("dbw-slot-picker-root"));
		assert.ok(html.includes("dbw-period-filter-chips"));
		assert.ok(html.includes("09:30"));
		assert.ok(html.includes("14:00"));
		assert.ok(html.includes("18:30"));
	});
});

describe("PublicOnlineBookingWidget Utility Functions", () => {
	it("localDateString produces valid YYYY-MM-DD format", () => {
		const fixedDate = new Date(2026, 7, 18);
		const str = localDateString(fixedDate);
		assert.equal(str, "2026-08-18");
	});

	it("formatRussianDate converts YYYY-MM-DD into human-readable Russian date", () => {
		const formatted = formatRussianDate("2026-08-18");
		assert.ok(
			formatted.includes("август") || formatted.includes("18"),
			"Formats date in Russian",
		);
	});

	it("formatRussianPhone standardizes Russian telephone numbers", () => {
		assert.equal(
			formatRussianPhone("9991234567"),
			"+7 (999) 123-45-67",
			"Formats 10 digits without prefix",
		);
		assert.equal(
			formatRussianPhone("89991234567"),
			"+7 (999) 123-45-67",
			"Formats 11 digits starting with 8",
		);
		assert.equal(
			formatRussianPhone("+7 (999) 123-45-67"),
			"+7 (999) 123-45-67",
			"Preserves already formatted phone",
		);
		assert.equal(formatRussianPhone(""), "", "Returns empty for empty string");
	});

	it("isValidRussianPhone correctly validates Russian phone formats", () => {
		assert.equal(
			isValidRussianPhone("+7 (999) 123-45-67"),
			true,
			"Full formatted number is valid",
		);
		assert.equal(
			isValidRussianPhone("89991234567"),
			true,
			"11 digits starting with 8 is valid",
		);
		assert.equal(
			isValidRussianPhone("79991234567"),
			true,
			"11 digits starting with 7 is valid",
		);
		assert.equal(
			isValidRussianPhone("9991234567"),
			true,
			"10 digits mobile number is valid",
		);
		assert.equal(
			isValidRussianPhone("+7 (999) 123-45-6"),
			false,
			"Incomplete 9-digit number is invalid",
		);
		assert.equal(
			isValidRussianPhone(""),
			false,
			"Empty string is invalid",
		);
	});

	it("generateBookingReference generates structured ticket numbers", () => {
		const ref = generateBookingReference();
		assert.ok(ref.startsWith("DNT-"), "Starts with DNT- prefix");
		assert.ok(
			ref.includes(String(new Date().getFullYear())),
			"Includes current year",
		);
	});

	it("generateEmbedSnippet produces valid HTML snippet for third-party websites", () => {
		const snippet = generateEmbedSnippet({
			clinicId: "clinic-123",
			primaryColor: "#0d9488",
			theme: "calm_teal",
		});
		assert.ok(snippet.includes("booking.js"), "Includes booking.js script URL");
		assert.ok(snippet.includes('data-clinic-id="clinic-123"'), "Embeds clinic ID");
		assert.ok(snippet.includes('data-primary-color="#0d9488"'), "Embeds primary color");
	});

	it("generateIcsCalendarContent produces valid RFC 5545 iCalendar content", () => {
		const ics = generateIcsCalendarContent({
			title: "Приём в DENTE: Терапия",
			description: "Врач: Д-р Смирнова\\nТалон: DNT-2026-1234",
			location: "г. Москва, ул. Ленина, 42",
			startsAt: "2026-08-18T10:00:00.000Z",
			endsAt: "2026-08-18T10:45:00.000Z",
		});

		assert.ok(ics.includes("BEGIN:VCALENDAR"), "Has VCALENDAR start tag");
		assert.ok(ics.includes("END:VCALENDAR"), "Has VCALENDAR end tag");
		assert.ok(ics.includes("BEGIN:VEVENT"), "Has VEVENT start tag");
		assert.ok(ics.includes("END:VEVENT"), "Has VEVENT end tag");
		assert.ok(
			ics.includes("SUMMARY:Приём в DENTE: Терапия"),
			"Has correct SUMMARY",
		);
		assert.ok(ics.includes("STATUS:CONFIRMED"), "Has STATUS:CONFIRMED");
	});

	it("generateGoogleCalendarUrl generates correct Google Calendar URL", () => {
		const url = generateGoogleCalendarUrl({
			title: "Приём в DENTE",
			description: "Визит к врачу",
			location: "ул. Ленина 42",
			startsAt: "2026-08-18T10:00:00.000Z",
			endsAt: "2026-08-18T10:30:00.000Z",
		});

		assert.ok(
			url.startsWith("https://calendar.google.com/calendar/render"),
			"Has Google Calendar base URL",
		);
		assert.ok(url.includes("action=TEMPLATE"), "Includes TEMPLATE action");
	});

	it("generateYandexCalendarUrl generates correct Yandex Calendar URL", () => {
		const url = generateYandexCalendarUrl({
			title: "Приём в DENTE",
			description: "Визит к врачу",
			location: "ул. Ленина 42",
			startsAt: "2026-08-18T10:00:00.000Z",
			endsAt: "2026-08-18T10:30:00.000Z",
		});

		assert.ok(
			url.startsWith("https://calendar.yandex.ru/event/new"),
			"Has Yandex Calendar base URL",
		);
		assert.ok(url.includes("name="), "Includes name parameter");
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
		const rootFacade = await import("../../PublicOnlineBookingWidget.js");
		assert.ok(rootFacade.PublicOnlineBookingWidget, "Root facade exports PublicOnlineBookingWidget");
		assert.ok(rootFacade.default, "Root facade exports default component");
		assert.equal(rootFacade.PublicOnlineBookingWidget, rootFacade.default, "Named and default match");
	});
});

describe("PublicOnlineBookingWidget: Wave 2 Apple & Telegram Mini-App UX (Mandates 8c, 8d, 8e, 8p, 8n)", () => {
	it("renders compact days ribbon with Сегодня, Завтра, and time slot periods", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				initialStep: 1,
			}),
		);

		// Days ribbon
		assert.ok(html.includes("dbw-days-ribbon"), "Contains days ribbon container");
		assert.ok(html.includes("Сегодня"), "Contains 'Сегодня' in quick days ribbon");
		assert.ok(html.includes("Завтра"), "Contains 'Завтра' in quick days ribbon");
		assert.ok(
			html.includes("Ближайшие дни:"),
			"Contains quick ribbon section label",
		);

		// Period chip filters
		assert.ok(html.includes("Утро ("), "Contains Morning period filter chip");
		assert.ok(html.includes("День ("), "Contains Afternoon period filter chip");
		assert.ok(html.includes("Вечер ("), "Contains Evening period filter chip");

		// With sample slots in BookingSlotPicker:
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
					{
						time: "09:30",
						startsAt: "2026-08-20T09:30:00Z",
						endsAt: "2026-08-20T10:00:00Z",
						period: "morning",
					},
					{
						time: "14:00",
						startsAt: "2026-08-20T14:00:00Z",
						endsAt: "2026-08-20T14:30:00Z",
						period: "afternoon",
					},
					{
						time: "18:00",
						startsAt: "2026-08-20T18:00:00Z",
						endsAt: "2026-08-20T18:30:00Z",
						period: "evening",
					},
				],
				selectedSlot: null,
				onSelectSlot: () => {},
				slotsLoading: false,
			}),
		);

		assert.ok(
			slotPickerHtml.includes("Утро (09:00–12:00)"),
			"Contains Morning period with hours",
		);
		assert.ok(
			slotPickerHtml.includes("День (12:00–16:00)"),
			"Contains Afternoon period with hours",
		);
		assert.ok(
			slotPickerHtml.includes("Вечер (16:00–21:00)"),
			"Contains Evening period with hours",
		);
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

		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				customDoctors: [soloDoc],
			}),
		);

		assert.ok(html.includes("dbw-solo-doctor-banner"), "Renders solo doctor banner");
		assert.ok(html.includes("Ваш доктор:"), "Renders 'Ваш доктор:' label");
		assert.ok(html.includes("Смирнова Е. В."), "Renders doctor full name");
		assert.ok(html.includes("Стаж 12 лет"), "Renders doctor experience as Стаж");
		assert.ok(html.includes("Опыт 12 лет"), "Renders doctor experience as Опыт");
		assert.ok(html.includes("4.9"), "Renders rating 4.9");
		assert.ok(html.includes("smirnova.jpg"), "Renders 40px photo avatar image");
	});

	it("renders Telegram 1-tap booking card and 'Поделиться номером в Telegram' button when in Telegram context", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				embedMode: "telegram",
			}),
		);

		assert.ok(
			html.includes("dbw-tg-1tap-card"),
			"Contains Telegram 1-tap card container",
		);
		assert.ok(
			html.includes("Поделиться номером в Telegram"),
			"Contains 'Поделиться номером в Telegram' button",
		);
		assert.ok(
			html.includes("Telegram 1-тап запись"),
			"Displays Telegram 1-tap header badge",
		);
	});

	it("renders Dental Boarding Pass with barcode, QR section, Yandex Maps and WhatsApp links", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				initialStep: 5,
			}),
		);

		// Boarding pass card & styling
		assert.ok(
			html.includes("dbw-boarding-pass"),
			"Contains dbw-boarding-pass container",
		);
		assert.ok(
			html.includes("Dental Boarding Pass"),
			"Displays Dental Boarding Pass heading",
		);
		assert.ok(
			html.includes("dbw-pass-perforation"),
			"Contains perforation line with ticket notches",
		);
		assert.ok(
			html.includes("dbw-pass-barcode-section"),
			"Contains barcode & QR section for reception",
		);

		// 1-Click Action Buttons
		assert.ok(
			html.includes("Открыть маршрут в Яндекс.Картах"),
			"Contains Yandex Maps route button",
		);
		assert.ok(
			html.includes("Написать в WhatsApp клиники"),
			"Contains WhatsApp clinic button",
		);
		assert.ok(
			html.includes("Кабинет №3"),
			"Displays room / cabinet information",
		);
	});
});

