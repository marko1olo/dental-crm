/**
 * onlineBookingSSOTSuite.test.tsx — Всеобъемлющий сьют тестов публичной онлайн-записи пациентов
 * Тестирует: 6 направлений, ростер докторов, расчет слотов 09:00-21:00, телефонную валидацию,
 * монтирование в UI (Мандат 8aq), запрет disabled кнопок (Мандат 8e) и нормативы Sweet Spot (Мандат 8b).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
	ANY_DOCTOR_ID,
	ANY_DOCTOR_SPECIALIST,
	CANONICAL_ONLINE_CATEGORIES,
	CANONICAL_ONLINE_DOCTORS,
	DEFAULT_CLINIC_BRANCH,
	formatRuPhoneInput,
	generateBookingReferenceNumber,
	generateDailyTimeSlots,
	getDoctorsForCategory,
	isValidRuPhone,
	submitOnlineBookingPayload,
} from "../onlineBookingCatalogData";

describe("DENTE Public Online Booking SSOT Suite", () => {
	it("1.1. Каталог содержит ровно 6 канонических клинических направлений", () => {
		assert.equal(CANONICAL_ONLINE_CATEGORIES.length, 6);
		const ids = CANONICAL_ONLINE_CATEGORIES.map((c) => c.id);
		assert.ok(ids.includes("therapy"), "Должна быть Терапия");
		assert.ok(ids.includes("hygiene"), "Должна быть Профгигиена");
		assert.ok(ids.includes("surgery"), "Должна быть Хирургия");
		assert.ok(ids.includes("orthopedics"), "Должна быть Ортопедия");
		assert.ok(ids.includes("orthodontics"), "Должна быть Ортодонтия");
		assert.ok(ids.includes("pediatric"), "Должен быть Детский приём");

		for (const cat of CANONICAL_ONLINE_CATEGORIES) {
			assert.ok(cat.title.length > 3, `Категория ${cat.id} должна иметь заголовок`);
			assert.ok(cat.description.length > 5, `Категория ${cat.id} должна иметь описание`);
			assert.ok(cat.popularServices.length >= 2, `Категория ${cat.id} должна иметь от 2 популярных услуг`);
			for (const srv of cat.popularServices) {
				assert.ok(srv.id.length > 0);
				assert.ok(srv.title.length > 0);
				assert.ok(srv.durationMinutes >= 15);
				assert.ok(srv.priceFormatted.includes("₽"));
			}
		}
	});

	it("1.2. Ростер врачей и поддержка 'Любой свободный доктор'", () => {
		assert.ok(CANONICAL_ONLINE_DOCTORS.length >= 4);
		assert.equal(ANY_DOCTOR_SPECIALIST.id, ANY_DOCTOR_ID);
		assert.ok(ANY_DOCTOR_SPECIALIST.fullName.includes("Любой"));

		// Любой доктор должен присутствовать при фильтре любой категории
		const surgeryDocs = getDoctorsForCategory("surgery");
		assert.ok(surgeryDocs.some((d) => d.id === ANY_DOCTOR_ID));
		assert.ok(surgeryDocs.some((d) => d.id === "doc-ivanov"));

		const orthoDocs = getDoctorsForCategory("orthodontics");
		assert.ok(orthoDocs.some((d) => d.id === ANY_DOCTOR_ID));
		assert.ok(orthoDocs.some((d) => d.id === "doc-vasilieva"));
	});

	it("1.3. Генерация временных слотов в диапазоне 09:00 – 21:00", () => {
		const slots30 = generateDailyTimeSlots("2026-10-31", 30);
		assert.ok(slots30.length > 0, "Слоты должны быть сгенерированы");
		assert.equal(slots30[0].time, "09:00");
		const lastSlot = slots30[slots30.length - 1];
		assert.equal(lastSlot.endsAt, "21:00");

		// Проверка периодов: утро < 12:00, день 12:00-17:00, вечер >= 17:00
		const morningSlot = slots30.find((s) => s.time === "09:30");
		assert.equal(morningSlot?.period, "morning");

		const afternoonSlot = slots30.find((s) => s.time === "14:00");
		assert.equal(afternoonSlot?.period, "afternoon");

		const eveningSlot = slots30.find((s) => s.time === "18:30");
		assert.equal(eveningSlot?.period, "evening");

		// Проверка исключения занятых слотов
		const occupied = ["10:00", "11:30"];
		const freeSlots = generateDailyTimeSlots("2026-10-31", 30, occupied);
		assert.ok(!freeSlots.some((s) => s.time === "10:00"));
		assert.ok(!freeSlots.some((s) => s.time === "11:30"));
	});

	it("1.4. Валидация и автоформатирование телефона РФ", () => {
		assert.equal(formatRuPhoneInput("9991234567"), "+7 (999) 123-45-67");
		assert.equal(formatRuPhoneInput("89991234567"), "+7 (999) 123-45-67");
		assert.equal(formatRuPhoneInput("+79991234567"), "+7 (999) 123-45-67");

		assert.equal(isValidRuPhone("+7 (999) 123-45-67"), true);
		assert.equal(isValidRuPhone("89991234567"), true);
		assert.equal(isValidRuPhone("123"), false);
		assert.equal(isValidRuPhone("+1 555 123 4567"), false);
	});

	it("1.5. Генерация номера талона и отправка бронирования", async () => {
		const ref = generateBookingReferenceNumber();
		assert.ok(ref.startsWith("DNT-2026-"));

		const confirmation = await submitOnlineBookingPayload({
			categoryId: "therapy",
			doctorId: "doc-smirnova",
			date: "2026-11-01",
			time: "10:30",
			patientName: "Алексей Смирнов",
			patientPhone: "+7 (999) 777-88-99",
			comment: "Осмотр и консультация",
		});

		assert.equal(confirmation.status, "confirmed");
		assert.equal(confirmation.doctor.id, "doc-smirnova");
		assert.equal(confirmation.patientName, "Алексей Смирнов");
		assert.equal(confirmation.patientPhone, "+7 (999) 777-88-99");
		assert.ok(confirmation.referenceNumber.startsWith("DNT-2026-"));
		assert.equal(confirmation.branch?.address, DEFAULT_CLINIC_BRANCH.address);
	});

	it("2.1. Мандат 8e: Кнопка Primary CTA НИКОГДА НЕ DISABLED в PublicBookingStudioModal", () => {
		const modalPath = path.resolve(import.meta.dirname, "../PublicBookingStudioModal.tsx");
		const source = fs.readFileSync(modalPath, "utf-8");

		// Проверяем, что нет disabled на кнопке записи
		assert.ok(
			!source.includes("disabled={") && !source.includes("disabled ="),
			"Мандат 8e: Primary CTA кнопка не должна блокироваться через disabled",
		);

		// Проверяем наличие фирменного цвета кнопки #0d9488
		assert.ok(
			source.includes("#0d9488"),
			"Мандат 8am: Кнопка Primary CTA должна иметь цвет #0d9488",
		);

		// Проверяем сенсорный размер min-h-[44px]
		assert.ok(
			source.includes("min-h-[44px]"),
			"Apple HIG: Сенсорная зона интерактивных элементов должна быть >= 44px",
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
		const catalogPath = path.resolve(import.meta.dirname, "../onlineBookingCatalogData.ts");
		const catalogLines = fs.readFileSync(catalogPath, "utf-8").split("\n").length;
		assert.ok(
			catalogLines >= 280 && catalogLines <= 350,
			`onlineBookingCatalogData.ts lines must be 280-350, got ${catalogLines}`,
		);

		const modalPath = path.resolve(import.meta.dirname, "../PublicBookingStudioModal.tsx");
		const modalLines = fs.readFileSync(modalPath, "utf-8").split("\n").length;
		assert.ok(
			modalLines >= 380 && modalLines <= 480,
			`PublicBookingStudioModal.tsx lines must be 380-480, got ${modalLines}`,
		);

		const launcherPath = path.resolve(import.meta.dirname, "../DirectPublicBookingLauncher.tsx");
		const launcherLines = fs.readFileSync(launcherPath, "utf-8").split("\n").length;
		assert.ok(
			launcherLines >= 60 && launcherLines <= 100,
			`DirectPublicBookingLauncher.tsx lines must be 60-100, got ${launcherLines}`,
		);
	});
});
