import assert from "node:assert/strict";
import { describe, test, beforeEach, afterEach, vi } from "vitest";
import {
	dispatchBatchReminders,
	type TomorrowReminderItem,
} from "../../schedule/tomorrowRemindersEngine";

describe("Telephony & Messengers Real Outbound API Integration", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("4.1. dispatchBatchReminders issues real fetch calls to /api/whatsapp/send and /api/communications/outbox", async () => {
		const fetchCalls: Array<{ url: string; body: any; headers: any }> = [];

		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string, init?: RequestInit) => {
				fetchCalls.push({
					url,
					body: init?.body ? JSON.parse(init.body as string) : null,
					headers: init?.headers,
				});
				return {
					ok: true,
					status: 200,
					json: async () => ({ success: true, messageId: "msg-123" }),
					text: async () => JSON.stringify({ success: true }),
				} as Response;
			}),
		);

		const mockReminders: TomorrowReminderItem[] = [
			{
				appointmentId: "appt-wa-1",
				patientId: "01a00000-0000-0000-0000-000000000001",
				patientName: "Смирнова Анна Сергеевна",
				patientPhone: "+7 916 234-56-78",
				telegramUsername: null,
				startsAtIso: "2026-08-27T10:00:00Z",
				timeFormatted: "10:00",
				dateFormatted: "27 августа",
				doctorName: "Д-р Соколов А. В.",
				doctorSpecialty: "Терапевт",
				chairName: "Кресло 1",
				treatmentReason: "Осмотр и лечение",
				reminderText: "Здравствуйте, Анна Сергеевна! Напоминаем о визите завтра в 10:00.",
				preferredChannel: "whatsapp",
				availableChannels: ["whatsapp", "sms"],
				whatsAppUrl: "https://wa.me/79162345678",
				telegramUrl: null,
				smsUrl: "sms:+79162345678",
				confirmUrl: "https://clinic.dente.ru/api/confirm/1",
				rescheduleUrl: "https://clinic.dente.ru/api/reschedule/1",
				status: "confirmed",
				isCito: false,
				hasAllergyWarning: false,
				isQuietHours: false,
			},
			{
				appointmentId: "appt-sms-2",
				patientId: "01a00000-0000-0000-0000-000000000002",
				patientName: "Воронов Дмитрий Игоревич",
				patientPhone: "+7 925 876-54-32",
				telegramUsername: null,
				startsAtIso: "2026-08-27T11:30:00Z",
				timeFormatted: "11:30",
				dateFormatted: "27 августа",
				doctorName: "Д-р Орлов А. В.",
				doctorSpecialty: "Ортопед",
				chairName: "Кресло 2",
				treatmentReason: "Примерка коронки",
				reminderText: "Здравствуйте, Дмитрий Игоревич! Напоминаем о визите завтра в 11:30.",
				preferredChannel: "sms",
				availableChannels: ["sms"],
				whatsAppUrl: null,
				telegramUrl: null,
				smsUrl: "sms:+79258765432",
				confirmUrl: null,
				rescheduleUrl: null,
				status: "confirmed",
				isCito: false,
				hasAllergyWarning: true,
				isQuietHours: false,
			},
		];

		const result = await dispatchBatchReminders(mockReminders, {
			allowQuietHoursOverride: true,
		});

		assert.strictEqual(result.total, 2);
		assert.strictEqual(result.dispatched, 2);
		assert.strictEqual(result.skippedNoContact, 0);

		assert.ok(fetchCalls.length >= 2, `Must issue real network calls, got ${fetchCalls.length}`);

		const waCall = fetchCalls.find((c) => c.url === "/api/whatsapp/send");
		assert.ok(waCall);
		assert.strictEqual(waCall.body.patientId, "01a00000-0000-0000-0000-000000000001");
		assert.ok(waCall.body.message.includes("Анна Сергеевна"));

		const outboxCall = fetchCalls.find((c) => c.url === "/api/communications/outbox");
		assert.ok(outboxCall);
		assert.strictEqual(outboxCall.body.channel, "sms");
		assert.strictEqual(outboxCall.body.patientId, "01a00000-0000-0000-0000-000000000002");
	});
});
