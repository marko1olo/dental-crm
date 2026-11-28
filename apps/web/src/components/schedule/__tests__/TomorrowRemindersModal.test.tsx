import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TomorrowRemindersModal } from "../TomorrowRemindersModal.js";
import {
	compileTomorrowReminders,
	dispatchBatchReminders,
	type TomorrowReminderItem,
} from "../tomorrowRemindersEngine";
import type { Dashboard, Appointment, Patient } from "@dental/shared";

describe("TomorrowRemindersModal Component Suite", () => {
	const mockTomorrowIso = "2026-08-26";

	const mockDashboard: Dashboard = {
		clinicSettings: {
			profile: {
				clinicName: "Стоматология «ДЕНТЕ Плюс»",
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
			],
			chairs: [
				{ id: "chair-1", name: "Кабинет 1", active: true },
			],
		},
		patients: [
			{
				id: "pat-1",
				fullName: "Смирнова Анна Сергеевна",
				phone: "+7 (916) 123-45-67",
				allergies: "Лидокаин",
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
				status: "planned",
				reason: "Лечение кариеса",
			} as unknown as Appointment,
		],
	} as unknown as Dashboard;

	it("renders nothing when isOpen is false", () => {
		const html = renderToStaticMarkup(
			<TomorrowRemindersModal
				isOpen={false}
				onClose={() => {}}
				dashboard={mockDashboard}
			/>,
		);
		assert.equal(html, "");
	});

	it("renders modal structure with multi-channel actions, patient details and 1-click controls when open", () => {
		const html = renderToStaticMarkup(
			<TomorrowRemindersModal
				isOpen={true}
				onClose={() => {}}
				dashboard={mockDashboard}
				targetDateIso={mockTomorrowIso}
			/>,
		);

		assert.ok(html.includes("data-testid=\"tomorrow-reminders-modal\""), "Renders modal testid");
		assert.ok(html.includes("Напоминания на завтра"), "Renders modal title");
		assert.ok(html.includes("Смирнова Анна Сергеевна"), "Renders patient name");
		assert.ok(html.includes("+7 (916) 123-45-67"), "Renders patient phone");
		assert.ok(html.includes("Иванов Иван Иванович"), "Renders doctor name");
		assert.ok(html.includes("Копировать все"), "Renders copy all button");
		assert.ok(html.includes("Отправить напоминания"), "Renders cascade dispatch button");
		assert.ok(html.includes("WhatsApp"), "Renders WhatsApp channel");
		assert.ok(html.includes("SMS"), "Renders SMS channel");
	});

	it("compileTomorrowReminders buckets appointments by clinicTimezone rather than UTC slice(0,10)", () => {
		const vladivostokDashboard = {
			...mockDashboard,
			clinicSettings: {
				...mockDashboard.clinicSettings,
				profile: {
					...mockDashboard.clinicSettings.profile,
					timezone: "Asia/Vladivostok",
				},
			},
			appointments: [
				{
					id: "appt-tz-1",
					patientId: "pat-1",
					doctorUserId: "doc-1",
					chairId: "chair-1",
					// 2026-08-26T18:30:00Z = 2026-08-27 04:30 in Asia/Vladivostok (UTC+10)
					startsAt: "2026-08-26T18:30:00.000Z",
					endsAt: "2026-08-26T19:00:00.000Z",
					status: "planned",
					reason: "Осмотр",
				} as unknown as Appointment,
			],
		} as unknown as Dashboard;

		const summary = compileTomorrowReminders(vladivostokDashboard, "2026-08-27", {
			timezone: "Asia/Vladivostok",
		});
		assert.equal(summary.totalAppointmentsCount, 1);
		assert.equal(summary.reminders[0]?.appointmentId, "appt-tz-1");
	});

	it("dispatchBatchReminders fails honestly on 500 and reads server reason ?? details on mixed results", async () => {
		const originalFetch = globalThis.fetch;
		const sampleReminder: TomorrowReminderItem = {
			appointmentId: "01950000-0000-7000-8000-000000000301",
			patientId: "pat-1",
			patientName: "Смирнова Анна",
			patientPhone: "+79161234567",
			telegramUsername: null,
			startsAtIso: "2026-08-26T10:00:00.000Z",
			timeFormatted: "13:00",
			dateFormatted: "26.08.2026",
			doctorName: "Иванов И.И.",
			doctorSpecialty: "Терапевт",
			chairName: "Каб 1",
			treatmentReason: "Осмотр",
			reminderText: "Напоминание",
			preferredChannel: "whatsapp",
			availableChannels: ["whatsapp", "sms"],
			whatsAppUrl: null,
			telegramUrl: null,
			smsUrl: null,
			confirmUrl: null,
			rescheduleUrl: null,
			status: "planned",
			isCito: false,
			hasAllergyWarning: false,
			isQuietHours: false,
		};

		try {
			globalThis.fetch = (async () =>
				new Response(JSON.stringify({ message: "Шлюз уведомлений недоступен" }), {
					status: 500,
					headers: { "content-type": "application/json" },
				})) as typeof fetch;

			const failedBatch = await dispatchBatchReminders([sampleReminder], {
				dateIso: "2026-08-26",
				clinicTimeZone: "Europe/Moscow",
			});
			assert.equal(failedBatch.dispatched, 0);
			assert.equal(failedBatch.results[0]?.status, "error");
			assert.equal(failedBatch.results[0]?.error, "Шлюз уведомлений недоступен");

			globalThis.fetch = (async () =>
				new Response(
					JSON.stringify({
						data: {
							results: [
								{
									appointmentId: "01950000-0000-7000-8000-000000000301",
									status: "failed",
									details: "SMS-провайдер отклонил номер",
								},
							],
						},
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				)) as typeof fetch;

			const detailsBatch = await dispatchBatchReminders([sampleReminder], {
				dateIso: "2026-08-26",
				clinicTimeZone: "Europe/Moscow",
			});
			assert.equal(detailsBatch.dispatched, 0);
			assert.equal(detailsBatch.results[0]?.status, "error");
			assert.equal(detailsBatch.results[0]?.error, "SMS-провайдер отклонил номер");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
