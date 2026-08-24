import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Dashboard, Appointment, Patient } from "@dental/shared";
import {
	compileTomorrowReminders,
	formatAllRemindersClipboardBuffer,
	getTomorrowDateIso,
} from "../tomorrowRemindersEngine";

describe("Tomorrow Appointment Reminders Engine Suite", () => {
	const mockTomorrowIso = "2026-08-26";

	const mockDashboard: Dashboard = {
		clinicSettings: {
			profile: {
				name: "Стоматология «ДЕНТЕ Плюс»",
				address: "Москва, ул. Ленина, 25",
				phone: "+7 (495) 777-88-99",
				timezone: "Europe/Moscow",
			},
			staff: [
				{
					id: "doc-1",
					fullName: "Иванов Иван Иванович",
					specialties: ["therapist"],
					active: true,
					role: "doctor",
				},
				{
					id: "doc-2",
					fullName: "Петров Петр Петрович",
					specialties: ["surgeon"],
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
				phone: "+7 (916) 123-45-67",
				allergies: "Аллергия на лидокаин",
			} as unknown as Patient,
			{
				id: "pat-2",
				fullName: "Кузнецов Дмитрий Павлович",
				phone: "+7 (925) 987-65-43",
			} as unknown as Patient,
			{
				id: "pat-3",
				fullName: "Федоров Алексей Викторович",
				phone: "", // no phone
			} as unknown as Patient,
		],
		appointments: [
			{
				id: "appt-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-08-26T10:00:00.000Z",
				endsAt: "2026-08-26T11:00:00.000Z",
				status: "confirmed",
				reason: "Лечение кариеса 24 зуба",
			} as unknown as Appointment,
			{
				id: "appt-2",
				patientId: "pat-2",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				startsAt: "2026-08-26T14:30:00.000Z",
				endsAt: "2026-08-26T15:30:00.000Z",
				status: "planned",
				reason: "Удаление зуба мудрости 38 (хирургия)",
			} as unknown as Appointment,
			{
				id: "appt-3",
				patientId: "pat-3",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-08-26T16:00:00.000Z",
				endsAt: "2026-08-26T16:30:00.000Z",
				status: "planned",
				reason: "Консультация ортопеда",
			} as unknown as Appointment,
			{
				id: "appt-cancelled",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-08-26T18:00:00.000Z",
				endsAt: "2026-08-26T18:30:00.000Z",
				status: "cancelled",
				reason: "Отмененная запись",
			} as unknown as Appointment,
			{
				id: "appt-other-day",
				patientId: "pat-2",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				startsAt: "2026-08-27T10:00:00.000Z",
				endsAt: "2026-08-27T11:00:00.000Z",
				status: "confirmed",
				reason: "Запись на послезавтра",
			} as unknown as Appointment,
		],
	} as unknown as Dashboard;

	it("1.1 compileTomorrowReminders — Correctly filters active appointments for target date", () => {
		const summary = compileTomorrowReminders(mockDashboard, mockTomorrowIso);

		assert.equal(summary.targetDateIso, mockTomorrowIso);
		assert.equal(summary.totalAppointmentsCount, 3, "Excludes cancelled and other days");
		assert.equal(summary.validPhoneCount, 2, "2 patients have phones");
		assert.equal(summary.missingPhoneCount, 1, "1 patient has no phone");
	});

	it("1.2 compileTomorrowReminders — Generates personalized WhatsApp message and URL", () => {
		const summary = compileTomorrowReminders(mockDashboard, mockTomorrowIso);
		const reminder1 = summary.reminders[0]!;
		assert.ok(reminder1, "reminder1 must exist");

		assert.equal(reminder1.patientName, "Смирнова Анна Сергеевна");
		assert.equal(reminder1.doctorName, "Иванов Иван Иванович");
		assert.equal(reminder1.hasAllergyWarning, true);
		assert.ok(reminder1.allergyWarningText?.includes("лидокаин"));
		assert.ok(reminder1.reminderText.includes("Смирнова Анна Сергеевна"));
		assert.ok(reminder1.reminderText.includes("Стоматология «ДЕНТЕ Плюс»"));
		assert.ok(reminder1.whatsAppUrl?.startsWith("https://wa.me/79161234567?text="));
	});

	it("1.3 compileTomorrowReminders — Adapts clinical preparation instructions for surgery/extraction", () => {
		const summary = compileTomorrowReminders(mockDashboard, mockTomorrowIso);
		const reminder2 = summary.reminders[1]!;
		assert.ok(reminder2, "reminder2 must exist");

		assert.equal(reminder2.patientName, "Кузнецов Дмитрий Павлович");
		assert.ok(
			reminder2.reminderText.toLowerCase().includes("удален") ||
			reminder2.reminderText.toLowerCase().includes("хирург") ||
			reminder2.reminderText.toLowerCase().includes("аспирин") ||
			reminder2.reminderText.toLowerCase().includes("покушать"),
			"Includes clinical preparation instruction",
		);
	});

	it("1.4 formatAllRemindersClipboardBuffer — Formats full registrar batch buffer", () => {
		const summary = compileTomorrowReminders(mockDashboard, mockTomorrowIso);
		const buffer = formatAllRemindersClipboardBuffer(summary);

		assert.ok(buffer.includes("НАПОМИНАНИЯ НА"), "Includes header");
		assert.ok(buffer.includes("Смирнова Анна Сергеевна"), "Includes patient 1");
		assert.ok(buffer.includes("Кузнецов Дмитрий Павлович"), "Includes patient 2");
		assert.ok(buffer.includes("[3]"), "Numbered entries");
	});

	it("1.5 getTomorrowDateIso — Returns valid YYYY-MM-DD string", () => {
		const tomorrow = getTomorrowDateIso(new Date("2026-08-25T12:00:00Z"));
		assert.equal(tomorrow, "2026-08-26");
	});
});
