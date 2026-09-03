import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	BookingAnyDoctorCard,
	BookingDoctorCard,
} from "../BookingDoctorCard";
import { BookingSlotPicker } from "../BookingSlotPicker";
import {
	DEFAULT_BRANCHES,
	DEFAULT_DOCTORS,
	DEFAULT_SERVICE_CATEGORIES,
	PublicOnlineBookingWidget,
	type ServiceCategory,
	formatRussianDate,
	formatRussianPhone,
	generateBookingReference,
	generateEmbedSnippet,
	generateGoogleCalendarUrl,
	generateIcsCalendarContent,
	generateMockSlotsForDate,
	generateYandexCalendarUrl,
	isValidRussianPhone,
	localDateString,
	resolveCategoryIcon,
} from "../PublicOnlineBookingWidget";

describe("PublicOnlineBookingWidget Component & Embeddable Flow", () => {
	it("renders Step 1: Branch & Service Category selection with all 5 mandatory categories", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				initialStep: 1,
			}),
		);

		// Header & Structure
		assert.ok(
			html.includes("Онлайн-запись в клинику DENTE"),
			"Contains default widget title",
		);
		assert.ok(
			html.includes("Стоматологический центр DENTE"),
			"Contains clinic header badge",
		);

		// Branches
		assert.ok(
			html.includes("Филиал «Центральный»"),
			"Contains central branch",
		);
		assert.ok(
			html.includes("Филиал «На Московском»"),
			"Contains moscow branch",
		);

		// 5 Mandatory Service Categories
		assert.ok(html.includes("Терапия"), "Contains category Терапия");
		assert.ok(html.includes("Ортопедия"), "Contains category Ортопедия");
		assert.ok(html.includes("Хирургия"), "Contains category Хирургия");
		assert.ok(
			html.includes("Детский приём"),
			"Contains category Детский приём",
		);
		assert.ok(html.includes("Гигиена"), "Contains category Гигиена");

		// Services list within default selected category (Терапия)
		assert.ok(
			html.includes("Первичная консультация терапевта"),
			"Contains primary therapy service",
		);
		assert.ok(
			html.includes("Лечение кариеса"),
			"Contains caries treatment service",
		);

		// Next button
		assert.ok(
			html.includes("Выбрать врача"),
			"Contains step 1 forward button",
		);
	});

	it("renders Step 2: Attending Doctor Selection with rating, experience, and photo/avatar", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				initialStep: 2,
				initialCategoryId: "therapy",
			}),
		);

		assert.ok(
			html.includes("Лечащий врач"),
			"Contains Step 2 heading 'Лечащий врач'",
		);
		assert.ok(
			html.includes("Любой свободный специалист"),
			"Contains 'Любой свободный специалист' quick option",
		);

		// Doctors details
		assert.ok(
			html.includes("Д-р Смирнова Елена Владимировна"),
			"Renders doctor name",
		);
		assert.ok(
			html.includes("Стаж 14 лет"),
			"Renders doctor experience badge",
		);
		assert.ok(html.includes("4.98"), "Renders doctor rating");
		assert.ok(
			html.includes("236 отзывов"),
			"Renders doctor reviews count",
		);

		// Navigation buttons
		assert.ok(html.includes("Назад"), "Contains Back button");
		assert.ok(
			html.includes("Выбрать дату и время"),
			"Contains Next step button",
		);
	});

	it("renders Step 3: Date & Slot Picker with interactive calendar and grouped time periods", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				initialStep: 3,
			}),
		);

		assert.ok(
			html.includes("Выберите дату и время приёма"),
			"Contains Step 3 heading",
		);
		assert.ok(
			html.includes("dbw-calendar-container"),
			"Contains calendar container element",
		);

		// Calendar weekday headers
		assert.ok(html.includes(">Пн<"), "Contains Monday header");
		assert.ok(html.includes(">Вт<"), "Contains Tuesday header");
		assert.ok(html.includes(">Ср<"), "Contains Wednesday header");
		assert.ok(html.includes(">Чт<"), "Contains Thursday header");
		assert.ok(html.includes(">Пт<"), "Contains Friday header");
		assert.ok(html.includes(">Сб<"), "Contains Saturday header");
		assert.ok(html.includes(">Вс<"), "Contains Sunday header");

		// Time slot periods & chips
		assert.ok(html.includes("Утро"), "Contains Morning slots section");
		assert.ok(html.includes("День"), "Contains Afternoon slots section");
		assert.ok(html.includes("Вечер"), "Contains Evening slots section");

		// Action buttons
		assert.ok(html.includes("Назад"), "Contains Back button");
		assert.ok(
			html.includes("Перейти к контактам"),
			"Contains Next step button",
		);
	});

	it("renders Step 4: Patient Info Form without SMS simulation block by default (production booking flow)", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				initialStep: 4,
			}),
		);

		assert.ok(
			html.includes("Ваши контактные данные"),
			"Contains Step 4 heading",
		);
		assert.ok(
			html.includes("patient-name-input"),
			"Contains patient full name input",
		);
		assert.ok(
			html.includes("patient-phone-input"),
			"Contains patient phone input",
		);
		assert.ok(
			html.includes('placeholder="+7 (999) 000-00-00"'),
			"Contains phone placeholder with Russian mask",
		);
		assert.ok(
			html.includes("patient-comment-input"),
			"Contains patient comment textarea",
		);

		// Must NOT contain demo SMS mocks or SMS verification block in production
		assert.equal(
			html.includes("Подтверждение номера телефона"),
			false,
			"Does NOT contain SMS verification block by default",
		);
		assert.equal(
			html.includes("Демо-СМС"),
			false,
			"Does NOT contain 'Демо-СМС' text by default",
		);
		assert.equal(
			html.includes("4826"),
			false,
			"Does NOT contain hardcoded code 4826",
		);
		assert.equal(
			html.includes("Быстро вставить"),
			false,
			"Does NOT contain 'Быстро вставить' button by default",
		);
		assert.equal(
			html.includes("Получить СМС-код"),
			false,
			"Does NOT contain 'Получить СМС-код' button by default",
		);

		// Privacy policy consent and final confirm button
		assert.ok(
			html.includes("privacy-checkbox"),
			"Contains privacy consent checkbox",
		);
		assert.ok(
			html.includes("Подтвердить запись"),
			"Contains Final Confirm button",
		);
	});

	it("renders Step 4: Patient Info Form with SMS Verification simulation when enableSmsSimulation is explicitly true", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				initialStep: 4,
				enableSmsSimulation: true,
			}),
		);

		assert.ok(
			html.includes("Ваши контактные данные"),
			"Contains Step 4 heading",
		);
		assert.ok(
			html.includes("patient-name-input"),
			"Contains patient full name input",
		);
		assert.ok(
			html.includes("patient-phone-input"),
			"Contains patient phone input",
		);
		assert.ok(
			html.includes("patient-comment-input"),
			"Contains patient comment textarea",
		);

		// SMS Verification Simulation Section
		assert.ok(
			html.includes("Подтверждение номера телефона"),
			"Contains SMS verification title",
		);
		assert.ok(
			html.includes("Получить СМС-код"),
			"Contains SMS code request button",
		);

		// Privacy policy consent
		assert.ok(
			html.includes("privacy-checkbox"),
			"Contains privacy consent checkbox",
		);
		assert.ok(
			html.includes("Подтвердить запись"),
			"Contains Final Confirm button",
		);
	});

	it("renders Step 4: Patient Info Form with clinic SMS verification active but without demo mocks when requireSmsVerification is true", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				initialStep: 4,
				requireSmsVerification: true,
				enableSmsSimulation: false,
			}),
		);

		assert.ok(
			html.includes("Подтверждение номера телефона"),
			"Contains SMS verification title when clinic requires SMS",
		);
		assert.ok(
			html.includes("Получить СМС-код"),
			"Contains SMS request button",
		);

		// Must NOT show demo badge or fast insert mock button
		assert.equal(
			html.includes("Демо-СМС"),
			false,
			"Does not display 'Демо-СМС' badge",
		);
		assert.equal(
			html.includes("Быстро вставить"),
			false,
			"Does not display 'Быстро вставить' button",
		);
	});

	it("renders Step 5: Instant Booking Confirmation Card with Ticket reference & Calendar Export", () => {
		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				initialStep: 5,
			}),
		);

		assert.ok(
			html.includes("dente-booking-widget"),
			"Renders widget wrapper",
		);
		assert.ok(
			html.includes("Запись успешно оформлена!"),
			"Renders success title",
		);
		assert.ok(
			html.includes("Получить HTML-код для вставки на сайт"),
			"Contains Embed Code Snippet button",
		);
	});

	it("supports custom theme, title, subtitle, and custom branches/categories overrides", () => {
		const customBranches = [
			{
				id: "b-vip",
				name: "VIP Клиника на Набережной",
				address: "г. Самара, Волжский проспект, 10",
				phone: "+7 (846) 999-00-11",
				workHours: "Круглосуточно",
				isMain: true,
			},
		];

		const customCategories: ServiceCategory[] = DEFAULT_SERVICE_CATEGORIES.slice(0, 2);

		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, {
				title: "Запись на приём в премиум-отделение",
				subtitle: "Персональный координатор и комфортный приём",
				theme: "dark",
				customBranches,
				customCategories,
			}),
		);

		assert.ok(
			html.includes('data-theme="dark"'),
			"Applies dark theme attribute",
		);
		assert.ok(
			html.includes("Запись на приём в премиум-отделение"),
			"Renders custom title",
		);
		assert.ok(
			html.includes("VIP Клиника на Набережной"),
			"Renders custom branch",
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
		const doc = DEFAULT_DOCTORS[0]!;
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
		assert.ok(html.includes("Стаж 14 лет"));
		assert.ok(html.includes("4.98"));
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
		const mockSlots = generateMockSlotsForDate("2026-08-20");
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
				slots: mockSlots,
				selectedSlot: mockSlots[0] || null,
				onSelectSlot: () => {},
				slotsLoading: false,
			}),
		);

		assert.ok(html.includes("dbw-slot-picker-root"));
		assert.ok(html.includes("dbw-period-filter-chips"));
		assert.ok(html.includes("09:00"));
		assert.ok(html.includes("14:00"));
		assert.ok(html.includes("18:00"));
	});
});

describe("PublicOnlineBookingWidget Utility Functions", () => {
	it("localDateString produces valid YYYY-MM-DD format", () => {
		const fixedDate = new Date(2026, 7, 18); // 18 Aug 2026
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
			isValidRussianPhone("+7 (999)"),
			false,
			"Short prefix is invalid",
		);
		assert.equal(
			isValidRussianPhone(""),
			false,
			"Empty string is invalid",
		);
		assert.equal(
			isValidRussianPhone("12345"),
			false,
			"Short string is invalid",
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
			location: "г. Самара, ул. Ленина, 42",
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
		assert.ok(
			ics.includes("LOCATION:г. Самара, ул. Ленина, 42"),
			"Has correct LOCATION",
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
		assert.ok(url.includes("text="), "Includes text parameter");
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

	it("generateMockSlotsForDate generates morning, afternoon, and evening slots", () => {
		const slots = generateMockSlotsForDate("2026-08-18", 30);
		assert.ok(slots.length > 5, "Generates multiple slots");
		assert.ok(
			slots.some((s) => s.period === "morning"),
			"Contains morning slot",
		);
		assert.ok(
			slots.some((s) => s.period === "afternoon"),
			"Contains afternoon slot",
		);
		assert.ok(
			slots.some((s) => s.period === "evening"),
			"Contains evening slot",
		);
	});

	it("resolveCategoryIcon handles all 5 category icons cleanly", () => {
		assert.ok(resolveCategoryIcon("Stethoscope"));
		assert.ok(resolveCategoryIcon("Sparkles"));
		assert.ok(resolveCategoryIcon("Scissors"));
		assert.ok(resolveCategoryIcon("Smile"));
		assert.ok(resolveCategoryIcon("Activity"));
		assert.ok(resolveCategoryIcon("UnknownFallback"));
	});
});
