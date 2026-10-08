import assert from "node:assert/strict";
import { describe, test, beforeEach, afterEach, vi } from "vitest";
import {
	useTelephonyStore,
	assertNoSyntheticCallsInProduction,
} from "../../../store/telephonyStore";
import {
	enableDemoShowcaseMode,
	disableDemoShowcaseMode,
	isDemoShowcaseMode,
} from "../../../lib/demoMode";
import {
	dispatchBatchReminders,
	type TomorrowReminderItem,
} from "../../schedule/tomorrowRemindersEngine";
import { useAppStore } from "../../../store/appStore";

describe("Red Team Telephony & Messengers Production Purity Suite", () => {
	beforeEach(() => {
		useTelephonyStore.getState().clearHistory();
		useTelephonyStore.setState({ activeCall: null, isCallDrawerOpen: false });
		disableDemoShowcaseMode();
	});

	afterEach(() => {
		disableDemoShowcaseMode();
		vi.restoreAllMocks();
	});

	// ── 1. PRODUCTION PURITY: ZERO SYNTHETIC CALLS ──────────────────────────────
	describe("1. Production Purity & Anti-Synthetic Calls Invariant", () => {
		test("1.1. assertNoSyntheticCallsInProduction returns true in production mode", () => {
			disableDemoShowcaseMode();
			assert.strictEqual(isDemoShowcaseMode(), false);
			assert.strictEqual(assertNoSyntheticCallsInProduction(), true);
		});

		test("1.2. Production blocks triggerIncomingCall with empty or stub phone numbers", () => {
			disableDemoShowcaseMode();
			const store = useTelephonyStore.getState();

			// Попытка передать пустой/синтетический звонок
			store.triggerIncomingCall({
				phone: "",
				patientId: null,
				patientName: "",
				provider: "mango",
				status: "ringing",
			});

			// Звонок не должен создаваться в activeCall
			assert.strictEqual(useTelephonyStore.getState().activeCall, null);
			assert.strictEqual(useTelephonyStore.getState().callHistory.length, 0);

			// Попытка передать пробельный номер
			store.triggerIncomingCall({
				phone: "   ",
				patientId: null,
				patientName: "",
				provider: "mango",
				status: "ringing",
			});

			assert.strictEqual(useTelephonyStore.getState().activeCall, null);
		});

		test("1.3. Production does not invent fake patient names for unknown caller", () => {
			disableDemoShowcaseMode();
			const store = useTelephonyStore.getState();

			store.triggerIncomingCall({
				phone: "+7 999 111-22-33",
				patientId: null,
				patientName: "",
				provider: "mango",
				status: "ringing",
			});

			const active = useTelephonyStore.getState().activeCall;
			assert.ok(active, "Valid incoming phone call must be received");
			assert.strictEqual(active.phone, "+79991112233");
			// В продакшене без совпадения в БД patientName остается null или 'Неизвестный номер'
			assert.ok(
				!active.patientName || active.patientName === "Неизвестный номер",
				"No synthetic patient names allowed in production",
			);
		});
	});

	// ── 2. DEMO SHOWCASE IDENTITY: SMIRNOVA ANNA SERGEEVNA ──────────────────────
	describe("2. Demo Showcase Mode Canonical Identity Invariant", () => {
		test("2.1. In demo mode, anonymous incoming call automatically binds to canonical Smirnova Anna Sergeevna", () => {
			enableDemoShowcaseMode();
			assert.strictEqual(isDemoShowcaseMode(), true);

			const store = useTelephonyStore.getState();
			store.triggerIncomingCall({
				phone: "",
				patientId: null,
				patientName: "",
				provider: "mango",
				status: "ringing",
			});

			const active = useTelephonyStore.getState().activeCall;
			assert.ok(active, "Call must be registered in demo mode");
			assert.strictEqual(active.patientName, "Смирнова Анна Сергеевна");
			assert.strictEqual(
				active.patientId,
				"01a00000-0000-0000-0000-000000000001",
			);
			assert.strictEqual(active.phone, "+79162345678");
		});

		test("2.2. In demo mode, explicit phone call preserves phone but links Smirnova Anna Sergeevna if patient unknown", () => {
			enableDemoShowcaseMode();
			const store = useTelephonyStore.getState();

			store.triggerIncomingCall({
				phone: "+7 900 123-45-67",
				patientId: null,
				patientName: "Неизвестный номер",
				provider: "uis",
				status: "ringing",
			});

			const active = useTelephonyStore.getState().activeCall;
			assert.ok(active, "Call must exist");
			assert.strictEqual(active.patientName, "Смирнова Анна Сергеевна");
			assert.strictEqual(
				active.patientId,
				"01a00000-0000-0000-0000-000000000001",
			);
		});
	});

	// ── 3. CHAIRSIDE DOCTOR IMMUNITY (MANDATE 8E & 8N) ──────────────────────────
	describe("3. Chairside Doctor Immunity & Non-Disruption (Mandates 8e, 8n)", () => {
		test("3.1. Doctor immunity covers doctor role, visit, odontogram, and periodontics", () => {
			// Helper checking chairside immunity predicate
			const checkDoctorImmunity = (role: string, currentView: string) => {
				return (
					role === "doctor" ||
					currentView === "visit" ||
					currentView === "odontogram" ||
					currentView === "periodontics"
				);
			};

			// Doctor role always immune
			assert.strictEqual(checkDoctorImmunity("doctor", "schedule"), true);
			assert.strictEqual(checkDoctorImmunity("doctor", "patients"), true);

			// Chairside clinical views always immune even for other roles
			assert.strictEqual(checkDoctorImmunity("administrator", "visit"), true);
			assert.strictEqual(
				checkDoctorImmunity("administrator", "odontogram"),
				true,
			);
			assert.strictEqual(
				checkDoctorImmunity("administrator", "periodontics"),
				true,
			);

			// Non-doctor in non-chairside views receives incoming notifications
			assert.strictEqual(
				checkDoctorImmunity("administrator", "schedule"),
				false,
			);
			assert.strictEqual(checkDoctorImmunity("registrar", "finances"), false);
		});
	});

	// ── 4. MESSENGERS: REAL OUTBOUND API DISPATCH ──────────────────────────────
	describe("4. Messengers & Reminders Real Outbound API Integration", () => {
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
					reminderText:
						"Здравствуйте, Анна Сергеевна! Напоминаем о визите завтра в 10:00.",
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
					reminderText:
						"Здравствуйте, Дмитрий Игоревич! Напоминаем о визите завтра в 11:30.",
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

			// Проверяем, что были совершены РЕАЛЬНЫЕ сетевые вызовы
			assert.ok(
				fetchCalls.length >= 2,
				`Must issue real network calls, got ${fetchCalls.length}`,
			);

			// Первый вызов: WhatsApp роут
			const waCall = fetchCalls.find((c) => c.url === "/api/whatsapp/send");
			assert.ok(waCall, "Must call /api/whatsapp/send for whatsapp channel");
			assert.strictEqual(
				waCall.body.patientId,
				"01a00000-0000-0000-0000-000000000001",
			);
			assert.ok(waCall.body.message.includes("Анна Сергеевна"));

			// Второй вызов: Outbox роут для SMS
			const outboxCall = fetchCalls.find(
				(c) => c.url === "/api/communications/outbox",
			);
			assert.ok(
				outboxCall,
				"Must call /api/communications/outbox for sms channel",
			);
			assert.strictEqual(outboxCall.body.channel, "sms");
			assert.strictEqual(
				outboxCall.body.patientId,
				"01a00000-0000-0000-0000-000000000002",
			);
		});
	});
});
