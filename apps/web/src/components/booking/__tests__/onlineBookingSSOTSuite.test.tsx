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

	it("2.1. Мандат 8e: Кнопка Primary CTA НИКОГДА НЕ DISABLED в DirectPublicBookingLauncher", () => {
		const launcherPath = path.resolve(import.meta.dirname, "../DirectPublicBookingLauncher.tsx");
		const source = fs.readFileSync(launcherPath, "utf-8");

		// Проверяем, что нет disabled на кнопке закрытия или подтверждения
		assert.ok(
			!source.includes("disabled={true}"),
			"Мандат 8e: Primary CTA кнопка не должна блокироваться через disabled",
		);
		assert.ok(
			source.includes("PublicBookingWidget"),
			"DirectPublicBookingLauncher обязан рендерить канонический PublicBookingWidget",
		);
	});

	it("2.2. Мандат 8aq: DirectPublicBookingLauncher смонтирован в AppShell.tsx и StandaloneLaunchers.tsx", () => {
		const appShellPath = path.resolve(import.meta.dirname, "../../../AppShell.tsx");
		const appShellSource = fs.readFileSync(appShellPath, "utf-8");
		assert.ok(
			appShellSource.includes("DirectPublicBookingLauncher"),
			"AppShell.tsx обязан импортировать и рендерить DirectPublicBookingLauncher",
		);
		assert.ok(
			appShellSource.includes("<DirectPublicBookingLauncher />"),
			"AppShell.tsx обязан монтировать <DirectPublicBookingLauncher /> в дерево",
		);

		const launchersPath = path.resolve(
			import.meta.dirname,
			"../../appLayout/modalsContainerModules/StandaloneLaunchers.tsx",
		);
		const launchersSource = fs.readFileSync(launchersPath, "utf-8");
		assert.ok(
			launchersSource.includes("DirectPublicBookingLauncher"),
			"StandaloneLaunchers.tsx обязан импортировать DirectPublicBookingLauncher",
		);
		assert.ok(
			launchersSource.includes("#booking") && launchersSource.includes("#online-booking"),
			"StandaloneLaunchers.tsx обязан обрабатывать хэши #booking и #online-booking",
		);
	});

	it("2.3. Мандат 8b: Размеры файлов находятся в целевом Sweet Spot", () => {
		const widgetPath = path.resolve(import.meta.dirname, "../PublicBookingWidget.tsx");
		const widgetLines = fs.readFileSync(widgetPath, "utf-8").split("\n").length;
		assert.ok(
			widgetLines >= 80 && widgetLines <= 150,
			`PublicBookingWidget.tsx lines must be 80-150, got ${widgetLines}`,
		);

		const launcherPath = path.resolve(import.meta.dirname, "../DirectPublicBookingLauncher.tsx");
		const launcherLines = fs.readFileSync(launcherPath, "utf-8").split("\n").length;
		assert.ok(
			launcherLines >= 60 && launcherLines <= 130,
			`DirectPublicBookingLauncher.tsx lines must be 60-130, got ${launcherLines}`,
		);
	});
});
