/**
 * DENTE CRM — Multi-Channel Patient Reminders Dispatcher & Quiet Hours Suite
 *
 * Инварианты:
 * 1. 1-клик генерация персонализированных текстов («Уважаемый Иван Иванович, напоминаем о приёме завтра...»)
 * 2. Умная маршрутизация канала: Бесплатный Telegram -> WhatsApp -> Каскадный fallback на SMS
 * 3. Фильтр «Тихий час» (ФЗ-152 и ФЗ-38 «О рекламе»): блокировка ночных отправок 21:00 – 08:00
 * 4. 1-клик интерактивные ссылки подтверждения визита («👍 Подтверждаю», «❌ Прошу перенести»)
 * 5. CITO экстренный приоритет при острой боли в обход ночной блокировки
 * 6. Пакетная рассылка с формированием буфера для администратора
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Appointment, Dashboard, Patient } from "@dental/shared";
import {
	buildAppointmentActionLinks,
	buildSmsUrl,
	buildTelegramUrl,
	buildWhatsAppUrl,
	checkQuietHoursPolicy,
} from "../components/schedule/generateAppointmentWhatsAppMessage";
import {
	compileTomorrowReminders,
	dispatchBatchReminders,
	formatAllRemindersClipboardBuffer,
	getTomorrowDateIso,
	resolvePatientReminderChannel,
} from "../components/schedule/tomorrowRemindersEngine";

describe("TOMORROW REMINDERS DISPATCHER & MULTI-CHANNEL WATERFALL SUITE", () => {
	const mockTomorrowIso = "2026-08-27";

	const mockDashboard: Dashboard = {
		clinicSettings: {
			profile: {
				name: "Стоматологическая клиника «ДЕНТЕ Элит»",
				address: "Москва, ул. Арбат, 15",
				phone: "+7 (495) 100-20-30",
				timezone: "Europe/Moscow",
			},
			staff: [
				{
					id: "doc-1",
					fullName: "Иванов Иван Иванович",
					specialties: ["Терапевт-эндодонтист"],
					active: true,
					role: "doctor",
				},
				{
					id: "doc-2",
					fullName: "Петров Петр Петрович",
					specialties: ["Хирург-имплантолог"],
					active: true,
					role: "doctor",
				},
			],
			chairs: [
				{ id: "chair-1", name: "Кабинет 1 (Терапия)", active: true },
				{ id: "chair-2", name: "Кабинет 2 (Хирургия)", active: true },
			],
		},
		patients: [
			{
				id: "pat-1",
				fullName: "Смирнова Анна Сергеевна",
				phone: "+7 (916) 111-22-33",
				telegram: "anna_smirnova_tg",
				allergies: "Аллергия на пенициллин",
			} as unknown as Patient,
			{
				id: "pat-2",
				fullName: "Кузнецов Дмитрий Павлович",
				phone: "+7 (925) 222-33-44",
			} as unknown as Patient,
			{
				id: "pat-3",
				fullName: "Сидоров Олег Николаевич",
				phone: null,
			} as unknown as Patient,
			{
				id: "pat-4",
				fullName: "Васильев Игорь Михайлович",
				phone: "+7 (903) 555-66-77",
			} as unknown as Patient,
		],
		appointments: [
			{
				id: "appt-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-08-27T10:00:00.000Z",
				endsAt: "2026-08-27T11:00:00.000Z",
				status: "planned",
				reason: "Лечение пульпита 16 зуба",
			} as unknown as Appointment,
			{
				id: "appt-2",
				patientId: "pat-2",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				startsAt: "2026-08-27T14:30:00.000Z",
				endsAt: "2026-08-27T15:30:00.000Z",
				status: "confirmed",
				reason: "Удаление ретинированного зуба 38 (хирургия)",
			} as unknown as Appointment,
			{
				id: "appt-3",
				patientId: "pat-3",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-08-27T16:00:00.000Z",
				endsAt: "2026-08-27T16:30:00.000Z",
				status: "planned",
				reason: "Консультация",
			} as unknown as Appointment,
			{
				id: "appt-4-cito",
				patientId: "pat-4",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				startsAt: "2026-08-27T18:00:00.000Z",
				endsAt: "2026-08-27T18:30:00.000Z",
				status: "planned",
				reason: "CITO Острая боль в области зуба 46",
				isCito: true,
			} as unknown as Appointment,
		],
	} as unknown as Dashboard;

	// ── 1. MULTI-CHANNEL WATERFALL RESOLUTION ─────────────────────────────────

	test("1.1. resolvePatientReminderChannel picks Telegram first if handle exists", () => {
		const res = resolvePatientReminderChannel("+7 (916) 111-22-33", "anna_smirnova_tg");
		assert.strictEqual(res.preferred, "telegram");
		assert.deepStrictEqual(res.available, ["telegram", "whatsapp", "sms"]);
	});

	test("1.2. resolvePatientReminderChannel falls back to WhatsApp/SMS if no Telegram", () => {
		const res = resolvePatientReminderChannel("+7 (925) 222-33-44", null);
		assert.strictEqual(res.preferred, "whatsapp");
		assert.deepStrictEqual(res.available, ["whatsapp", "sms"]);
	});

	test("1.3. resolvePatientReminderChannel respects explicit channel override", () => {
		const res = resolvePatientReminderChannel("+7 (916) 111-22-33", "anna_smirnova_tg", "sms");
		assert.strictEqual(res.preferred, "sms");
	});

	// ── 2. QUIET HOURS POLICY (152-FZ / 38-FZ) ───────────────────────────────

	test("2.1. checkQuietHoursPolicy blocks night sending between 21:00 and 08:00", () => {
		const nightTime = new Date("2026-08-26T22:30:00+03:00");
		const resNight = checkQuietHoursPolicy(nightTime, "Europe/Moscow");
		assert.strictEqual(resNight.isQuietHours, true);
		assert.ok(resNight.warningRu?.includes("Тихий час"));

		const earlyMorning = new Date("2026-08-26T06:15:00+03:00");
		const resEarly = checkQuietHoursPolicy(earlyMorning, "Europe/Moscow");
		assert.strictEqual(resEarly.isQuietHours, true);

		const daytime = new Date("2026-08-26T14:00:00+03:00");
		const resDay = checkQuietHoursPolicy(daytime, "Europe/Moscow");
		assert.strictEqual(resDay.isQuietHours, false);
		assert.strictEqual(resDay.warningRu, undefined);
	});

	// ── 3. 1-CLICK INTERACTIVE CONFIRMATION & RESCHEDULE LINKS ───────────────

	test("3.1. buildAppointmentActionLinks formats valid confirm and reschedule URLs", () => {
		const links = buildAppointmentActionLinks("appt-12345", "https://dente.clinic");
		assert.strictEqual(links.confirmUrl, "https://dente.clinic/api/public/appointment/appt-12345/confirm");
		assert.strictEqual(links.rescheduleUrl, "https://dente.clinic/api/public/appointment/appt-12345/reschedule");
	});

	test("3.2. buildTelegramUrl and buildWhatsAppUrl format correct direct links", () => {
		const tg = buildTelegramUrl("@anna_dent", "Привет");
		assert.ok(tg.startsWith("https://t.me/anna_dent?text="));

		const wa = buildWhatsAppUrl("+7 (916) 111-22-33", "Напоминание о приеме");
		assert.ok(wa.startsWith("https://wa.me/79161112233?text="));

		const sms = buildSmsUrl("+7 (916) 111-22-33", "Текст");
		assert.ok(sms.startsWith("sms:+79161112233?body="));
	});

	// ── 4. BATCH COMPILATION & CLINICAL INSTRUCTIONS ──────────────────────────

	test("4.1. compileTomorrowReminders aggregates full reminder payload with clinical prep", () => {
		const dayTime = new Date("2026-08-26T12:00:00+03:00");
		const summary = compileTomorrowReminders(mockDashboard, mockTomorrowIso, {
			now: dayTime,
			baseUrl: "https://clinic.dente.ru",
		});

		assert.strictEqual(summary.targetDateIso, mockTomorrowIso);
		assert.strictEqual(summary.totalAppointmentsCount, 4);
		assert.strictEqual(summary.validPhoneCount, 3);
		assert.strictEqual(summary.missingPhoneCount, 1);
		assert.strictEqual(summary.telegramAvailableCount, 1);
		assert.strictEqual(summary.whatsAppAvailableCount, 3);
		assert.strictEqual(summary.smsAvailableCount, 3);

		// Check Patient 1 (Telegram preferred + Allergy alert + Confirm links)
		const rem1 = summary.reminders[0]!;
		assert.strictEqual(rem1.patientName, "Смирнова Анна Сергеевна");
		assert.strictEqual(rem1.preferredChannel, "telegram");
		assert.strictEqual(rem1.hasAllergyWarning, true);
		assert.ok(rem1.allergyWarningText?.includes("пенициллин"));
		assert.ok(rem1.reminderText.includes("👍 Подтвердить: https://clinic.dente.ru/api/public/appointment/appt-1/confirm"));
		assert.ok(rem1.reminderText.includes("❌ Перенести: https://clinic.dente.ru/api/public/appointment/appt-1/reschedule"));

		// Check Patient 2 (Surgery prep instruction)
		const rem2 = summary.reminders[1]!;
		assert.strictEqual(rem2.patientName, "Кузнецов Дмитрий Павлович");
		assert.strictEqual(rem2.preferredChannel, "whatsapp");
		assert.ok(rem2.reminderText.includes("аспирин") || rem2.reminderText.includes("перекусите"));

		// Check Patient 4 (CITO emergency bypasses quiet hours)
		const rem4 = summary.reminders[3]!;
		assert.strictEqual(rem4.isCito, true);
		assert.strictEqual(rem4.isQuietHours, false); // CITO exempt from quiet hours
	});

	// ── 5. BATCH DISPATCHER EXECUTION & REPORTING ────────────────────────────

	test("5.1. dispatchBatchReminders processes reminders respecting quiet hours and contacts", async () => {
		const nightTime = new Date("2026-08-26T23:00:00+03:00");
		const summary = compileTomorrowReminders(mockDashboard, mockTomorrowIso, {
			now: nightTime,
		});

		// During night time without override: normal appointments skipped, CITO dispatched
		const resultNight = await dispatchBatchReminders(summary.reminders, {
			allowQuietHoursOverride: false,
		});

		assert.strictEqual(resultNight.total, 4);
		assert.strictEqual(resultNight.skippedNoContact, 1); // Patient 3 has no phone
		assert.strictEqual(resultNight.skippedQuietHours, 2); // Patient 1 & 2 skipped
		assert.strictEqual(resultNight.dispatched, 1); // Patient 4 (CITO) dispatched

		// With override enabled
		const resultOverride = await dispatchBatchReminders(summary.reminders, {
			allowQuietHoursOverride: true,
		});
		assert.strictEqual(resultOverride.dispatched, 3);
		assert.strictEqual(resultOverride.skippedNoContact, 1);
	});

	// ── 6. CLIPBOARD BUFFER FORMATTING ────────────────────────────────────────

	test("6.1. formatAllRemindersClipboardBuffer builds complete multi-channel text for registrar", () => {
		const summary = compileTomorrowReminders(mockDashboard, mockTomorrowIso);
		const buffer = formatAllRemindersClipboardBuffer(summary);

		assert.ok(buffer.includes("НАПОМИНАНИЯ НА"));
		assert.ok(buffer.includes("Смирнова Анна Сергеевна"));
		assert.ok(buffer.includes("[Канал: TELEGRAM]"));
		assert.ok(buffer.includes("[Канал: WHATSAPP]"));
	});
});
