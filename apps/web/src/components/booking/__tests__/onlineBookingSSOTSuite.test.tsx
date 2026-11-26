/**
 * onlineBookingSSOTSuite.test.tsx — Всеобъемлющий сьют тестов публичной онлайн-записи пациентов
 * Тестирует: канонические направления, ростер докторов, расчет слотов, телефонную валидацию,
 * монтирование в UI (Мандат 8aq), запрет disabled кнопок (Мандат 8e) и нормативы Sweet Spot (Мандат 8b).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
	CANONICAL_BOOKING_CATEGORIES,
	DEFAULT_DOCTORS_LIST,
	SERVICE_CATEGORIES,
	formatPhoneRu,
	groupSlotsByDayPeriod,
	isClinicNightTime,
	isValidPatientName,
	isValidRuPhone,
	normalizePhoneDigits,
} from "../PublicBookingWidget";

describe("DENTE Public Online Booking SSOT Suite", () => {
	it("1.1. Каталог содержит канонические клинические направления", () => {
		assert.ok(CANONICAL_BOOKING_CATEGORIES.length >= 6);
		const ids = CANONICAL_BOOKING_CATEGORIES.map((c) => c.id);
		assert.ok(ids.includes("therapy"), "Должна быть Терапия");
		assert.ok(ids.includes("hygiene"), "Должна быть Профгигиена");
		assert.ok(ids.includes("surgery"), "Должна быть Хирургия");
		assert.ok(ids.includes("orthodontics"), "Должна быть Ортодонтия");

		for (const cat of CANONICAL_BOOKING_CATEGORIES) {
			assert.ok(cat.title.length > 3, `Категория ${cat.id} должна иметь заголовок`);
			assert.ok(cat.durationMinutes >= 15, `Категория ${cat.id} должна иметь длительность >= 15м`);
		}
	});

	it("1.2. Мандат 8z: Ноль захардкоженных врачей в боевом коде (Zero Mocks)", () => {
		assert.equal(
			DEFAULT_DOCTORS_LIST.length,
			0,
			"DEFAULT_DOCTORS_LIST обязан быть пустым в продакшене — врачи загружаются через реальный API клиники",
		);
	});

	it("1.3. Группировка слотов по периодам дня: утро, день, вечер", () => {
		const testSlots = [
			{ time: "09:00", startsAt: "2026-11-01T09:00:00Z", endsAt: "2026-11-01T09:30:00Z" },
			{ time: "10:30", startsAt: "2026-11-01T10:30:00Z", endsAt: "2026-11-01T11:00:00Z" },
			{ time: "14:00", startsAt: "2026-11-01T14:00:00Z", endsAt: "2026-11-01T14:30:00Z" },
			{ time: "18:00", startsAt: "2026-11-01T18:00:00Z", endsAt: "2026-11-01T18:30:00Z" },
		];

		const grouped = groupSlotsByDayPeriod(testSlots);
		assert.ok(grouped.morning.some((s) => s.time === "09:00"));
		assert.ok(grouped.afternoon.some((s) => s.time === "14:00"));
		assert.ok(grouped.evening.some((s) => s.time === "18:00"));
	});

	it("1.4. Валидация и автоформатирование телефона РФ", () => {
		assert.equal(isValidRuPhone("+7 (999) 123-45-67"), true);
		assert.equal(isValidRuPhone("89991234567"), true);
		assert.equal(isValidRuPhone("+79991234567"), true);
		assert.equal(isValidRuPhone("123"), false);

		assert.equal(isValidPatientName("Иван Иванов"), true);
		assert.equal(isValidPatientName("A"), false);
	});

	it("2.1. Мандат 8e: Кнопка Primary CTA НИКОГДА НЕ DISABLED в WorkspaceStudioOverlayHost / PublicBookingWidget", () => {
		const hostPath = path.resolve(
			import.meta.dirname,
			"../../appLayout/WorkspaceStudioOverlayHost.tsx",
		);
		const hostSource = fs.readFileSync(hostPath, "utf-8");

		assert.ok(
			hostSource.includes("PublicBookingWidget"),
			"WorkspaceStudioOverlayHost обязан рендерить канонический PublicBookingWidget",
		);
		const widgetPath = path.resolve(import.meta.dirname, "../PublicBookingWidget.tsx");
		const widgetSource = fs.readFileSync(widgetPath, "utf-8");
		assert.ok(
			!widgetSource.includes("disabled={true}"),
			"Мандат 8e: Primary CTA кнопка не должна блокироваться через disabled",
		);
	});

	it("2.2. Мандат 8aq: PublicBookingWidget смонтирован в WorkspaceStudioOverlayHost и резолвится по #booking / #online-booking", async () => {
		const containerPath = path.resolve(
			import.meta.dirname,
			"../../appLayout/AppModalsContainer.tsx",
		);
		const containerSource = fs.readFileSync(containerPath, "utf-8");
		assert.ok(
			containerSource.includes("WorkspaceStudioOverlayHost"),
			"AppModalsContainer.tsx обязан импортировать и рендерить WorkspaceStudioOverlayHost",
		);

		const { resolveClinicRoute } = await import("../../../router/routeResolver");
		assert.equal(resolveClinicRoute("", "#booking").studio?.kind, "public_booking");
		assert.equal(resolveClinicRoute("", "#online-booking").studio?.kind, "public_booking");
	});

	it("2.3. Мандат 8b: Размеры файлов находятся в целевом Sweet Spot", () => {
		const widgetPath = path.resolve(import.meta.dirname, "../PublicBookingWidget.tsx");
		const widgetLines = fs.readFileSync(widgetPath, "utf-8").split("\n").length;
		assert.ok(
			widgetLines >= 80 && widgetLines <= 150,
			`PublicBookingWidget.tsx lines must be 80-150, got ${widgetLines}`,
		);
	});

	it("3.1. Эстетика десктопа: PublicBookingPage содержит десктопную витрину клиники, лицензию и контакты", () => {
		const pagePath = path.resolve(import.meta.dirname, "../../../pages/PublicBookingPage.tsx");
		const source = fs.readFileSync(pagePath, "utf-8");

		assert.ok(
			source.includes('data-testid="clinic-desktop-showcase"'),
			"PublicBookingPage обязана содержать десктопную витрину clinic-desktop-showcase для экранов >= 1024px",
		);
		assert.ok(
			source.includes("Лицензия №"),
			"Витрина клиники обязана отображать номер лицензии",
		);
		assert.ok(
			source.includes("Часы приёма"),
			"Витрина клиники обязана отображать часы приёма",
		);
		assert.ok(
			source.includes("var(--paper)") && source.includes("var(--primary)"),
			"PublicBookingPage обязана использовать CSS-токены темы",
		);
	});

	it("3.2. Статус предварительной брони: BookingPatientFormStep содержит бейдж доверия", () => {
		const stepPath = path.resolve(
			import.meta.dirname,
			"../publicWidget/BookingPatientFormStep.tsx",
		);
		const source = fs.readFileSync(stepPath, "utf-8");

		assert.ok(
			source.includes('data-testid="booking-trust-status-badge"'),
			"BookingPatientFormStep обязан содержать индикатор формата бронирования booking-trust-status-badge",
		);
		assert.ok(
			source.includes("Предварительная (требует звонка)"),
			"Форма обязана отображать статус предварительной брони без OTP",
		);
	});
});
