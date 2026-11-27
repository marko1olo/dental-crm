import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { getPeriodStartInTimeZone, shiftCalendarDay, tomorrowDateKeyInTimeZone, wallClockToUtcInTimeZone } from "@dental/shared";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	denteMaxBotConfigs,
	denteTelegramChatLinks,
	doctorShiftRosters,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { isReservationMatchingChair } from "../../db/appointmentsQueryModules/scheduleReservationLockHelpers.js";
import { registerDiagnocatIntegrationRoutes } from "../../routes/integrations/diagnocat.js";
import { registerFlexbeRoutes } from "../../routes/integrations/flexbe.js";
import { registerMaxRoutes } from "../../routes/max.js";
import { registerPublicBookingRoutes } from "../../routes/publicBooking/publicBookingHandlers.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { buildDenteTelegramLinkedScheduleReply } from "../../routes/telegram/canonicalStore/telegramCareRequestsAndCallbacks.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { PriceFaqPlugin } from "../../services/bots/plugins/PriceFaqPlugin.js";
import { ServiceReminderPlugin } from "../../services/bots/plugins/ServiceReminderPlugin.js";
import type { OmnichannelBotRuntime } from "../../services/bots/types.js";
import { authenticatePbxWebhook } from "../../services/telephony/telephonySecurity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { hashTelegramChatFingerprint } from "../../utils/telegramChatHash.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createIdempotentTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "wave7ScheduleBotsTelephonyTimezones";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const OTHER_ORG_ID = fixtureUuid(FIXTURE, 2);
const CLINIC_ID = fixtureUuid(FIXTURE, 10);
const CHAIR_1_ID = fixtureUuid(FIXTURE, 20);
const CHAIR_2_ID = fixtureUuid(FIXTURE, 21);
const DOCTOR_ID = fixtureUuid(FIXTURE, 30);
const DOCTOR_2_ID = fixtureUuid(FIXTURE, 32);
const RECEPTION_ID = fixtureUuid(FIXTURE, 31);
const PATIENT_ID = fixtureUuid(FIXTURE, 40);
const OTHER_PATIENT_ID = fixtureUuid(FIXTURE, 41);
const APPT_REMINDER_ID = fixtureUuid(FIXTURE, 50);
const FOREIGN_APPT_ID = fixtureUuid(FIXTURE, 51);
const TELEPHONY_ORG_ID = fixtureUuid(FIXTURE, 60);

const BOT_RUNTIME: OmnichannelBotRuntime = {
	botId: `telegram:${ORG_ID}:default`,
	channel: "telegram",
	organizationId: ORG_ID,
	clinicId: CLINIC_ID,
	botConfigId: "default",
	tokenHash: "test-hash",
	isActive: true,
	enabledPlugins: ["service_reminders", "price_faq"],
	registeredAt: new Date(),
	lastActiveAt: null,
	lastError: null,
	metadata: {},
	metrics: {
		totalMessages: 0,
		successMessages: 0,
		failedMessages: 0,
		rateLimitedMessages: 0,
		lastProcessedAt: null,
	},
};

describe("Wave 7 Schedule, Bots, Telephony & Timezones Regression Suite", () => {
	let app: FastifyInstance;
	let tokenReception: string;
	let dbAvailable = true;
	const clinicTz = "Asia/Vladivostok";
	const tomorrowIso = tomorrowDateKeyInTimeZone(clinicTz);

	before(async () => {
		try {
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.execute(sql`SELECT 1`);
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				return;
			}
			throw err;
		}

		await purgeFixtureOrganizations([ORG_ID, OTHER_ORG_ID, TELEPHONY_ORG_ID]);

		app = await createIdempotentTenantTestApp();
		await registerScheduleRoutes(app);
		await app.register(registerPublicBookingRoutes, { prefix: "/api/public/booking" });
		await registerDiagnocatIntegrationRoutes(app);
		await registerFlexbeRoutes(app);
		await registerMaxRoutes(app);
		await app.ready();

		tokenReception = signToken(
			{
				userId: RECEPTION_ID,
				organizationId: ORG_ID,
				role: "receptionist",
				fullName: "Регистратор Волна 7",
			},
			authTokenSecret(),
		);

		await withSuperuserBypass(async (tx) => {
			await tx.insert(organizations).values([
				{
					id: ORG_ID,
					name: "Клиника Волна 7",
					inn: "7707777701",
					clinicSchedule: {
						monday: { isWorking: true, startsAt: "08:00", endsAt: "24:00" },
						tuesday: { isWorking: true, startsAt: "08:00", endsAt: "24:00" },
						wednesday: { isWorking: true, startsAt: "08:00", endsAt: "24:00" },
						thursday: { isWorking: true, startsAt: "08:00", endsAt: "24:00" },
						friday: { isWorking: true, startsAt: "08:00", endsAt: "24:00" },
						saturday: { isWorking: true, startsAt: "08:00", endsAt: "24:00" },
						sunday: { isWorking: true, startsAt: "08:00", endsAt: "24:00" },
						requireSmsVerification: false,
					},
				},
				{ id: OTHER_ORG_ID, name: "Клиника Чужая 7", inn: "7707777702" },
				{
					id: TELEPHONY_ORG_ID,
					name: "Клиника Телефония Секрет",
					inn: "7707777703",
					workspaceFeatureFlags: {
						telephonyWebhookSecret: "per-org-secret-value-xyz",
					},
				},
			]);

			await tx.insert(clinics).values({
				id: CLINIC_ID,
				organizationId: ORG_ID,
				name: "Филиал Владивосток",
				timezone: clinicTz,
			});

			await tx.insert(chairs).values([
				{ id: CHAIR_1_ID, organizationId: ORG_ID, clinicId: CLINIC_ID, name: "Кресло 1", isActive: true },
				{ id: CHAIR_2_ID, organizationId: ORG_ID, clinicId: CLINIC_ID, name: "Кресло 2", isActive: true },
			]);

			await tx.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Д-р Тихоокеанский А.В.",
					role: "doctor",
					isActive: true,
					workingHours: {
						monday: { isWorking: true, startMinute: 8 * 60, endMinute: 24 * 60 },
						tuesday: { isWorking: true, startMinute: 8 * 60, endMinute: 24 * 60 },
						wednesday: { isWorking: true, startMinute: 8 * 60, endMinute: 24 * 60 },
						thursday: { isWorking: true, startMinute: 8 * 60, endMinute: 24 * 60 },
						friday: { isWorking: true, startMinute: 8 * 60, endMinute: 24 * 60 },
						saturday: { isWorking: true, startMinute: 8 * 60, endMinute: 24 * 60 },
						sunday: { isWorking: true, startMinute: 8 * 60, endMinute: 24 * 60 },
					},
				},
				{
					id: DOCTOR_2_ID,
					organizationId: ORG_ID,
					fullName: "Д-р Второй Б.В.",
					role: "doctor",
					isActive: true,
				},
				{
					id: RECEPTION_ID,
					organizationId: ORG_ID,
					fullName: "Регистратор Волна 7",
					role: "receptionist",
					isActive: true,
				},
			]);

			await tx.insert(patients).values([
				{ id: PATIENT_ID, organizationId: ORG_ID, fullName: "Иванов Алексей", phone: "+79001112233" },
				{ id: OTHER_PATIENT_ID, organizationId: ORG_ID, fullName: "Сидоров Виктор", phone: "+79009998877" },
			]);
		});

		const tomorrow10Utc = wallClockToUtcInTimeZone(tomorrowIso, 10, 0, clinicTz)!;
		const tomorrow1030Utc = new Date(tomorrow10Utc.getTime() + 30 * 60_000);
		const tomorrow16Utc = wallClockToUtcInTimeZone(tomorrowIso, 16, 0, clinicTz)!;
		const tomorrow1630Utc = new Date(tomorrow16Utc.getTime() + 30 * 60_000);

		await withTenantCtx(ORG_ID, async (tx) => {
			await tx.insert(appointments).values([
				{
					id: APPT_REMINDER_ID,
					organizationId: ORG_ID,
					clinicId: CLINIC_ID,
					patientId: PATIENT_ID,
					doctorUserId: DOCTOR_ID,
					chairId: CHAIR_1_ID,
					status: "planned",
					startsAt: tomorrow10Utc,
					endsAt: tomorrow1030Utc,
					reason: "Профосмотр",
				},
				{
					id: FOREIGN_APPT_ID,
					organizationId: ORG_ID,
					clinicId: CLINIC_ID,
					patientId: OTHER_PATIENT_ID,
					doctorUserId: DOCTOR_ID,
					chairId: CHAIR_2_ID,
					status: "planned",
					startsAt: tomorrow16Utc,
					endsAt: tomorrow1630Utc,
					reason: "Осмотр",
				},
			]);

			await tx.insert(denteTelegramChatLinks).values({
				organizationId: ORG_ID,
				clinicId: CLINIC_ID,
				botConfigId: "default",
				subjectType: "patient",
				subjectId: PATIENT_ID,
				chatFingerprint: hashTelegramChatFingerprint("99887766"),
				chatIdLast4: "7766",
				status: "active",
			});
		});
	});

	after(async () => {
		if (dbAvailable) {
			await purgeFixtureOrganizations([ORG_ID, OTHER_ORG_ID, TELEPHONY_ORG_ID]);
		}
		if (app) {
			await app.close();
		}
	});

	it("1. isReservationMatchingChair matches 'Все кресла', 'ALL', '*', '' and isolates named chairs", () => {
		assert.equal(isReservationMatchingChair("Все кресла", "Кресло 1"), true);
		assert.equal(isReservationMatchingChair("ALL", "Кресло 2"), true);
		assert.equal(isReservationMatchingChair("*", "Кресло 1"), true);
		assert.equal(isReservationMatchingChair("", "Кресло 1"), true);
		assert.equal(isReservationMatchingChair("Кресло 1", "Кресло 1"), true);
		assert.equal(isReservationMatchingChair("Кресло 1", "Кресло 2"), false);
	});

	it("2. 'Все кресла' scheduleTimeReservation blocks appointments, slot-lease and public booking slots", async (t) => {
		if (!dbAvailable) {
			t.skip("PostgreSQL unavailable");
			return;
		}
		const reserveStart = wallClockToUtcInTimeZone(tomorrowIso, 12, 0, clinicTz)!;
		const reserveEnd = wallClockToUtcInTimeZone(tomorrowIso, 13, 0, clinicTz)!;

		const resCreate = await app.inject({
			method: "POST",
			url: "/api/schedule/time-reservations",
			headers: {
				authorization: `Bearer ${tokenReception}`,
				"idempotency-key": randomUUID(),
			},
			payload: {
				chairName: "Все кресла",
				reservationType: "meeting",
				startTime: reserveStart.toISOString(),
				endTime: reserveEnd.toISOString(),
				bookingLocked: true,
				note: "Общая планёрка",
			},
		});
		assert.equal(resCreate.statusCode, 201, resCreate.body);

		// Lease during 12:00-12:30 must return 409 SLOT_RESERVED
		const leaseRes = await app.inject({
			method: "POST",
			url: "/api/schedule/leases/acquire",
			headers: {
				authorization: `Bearer ${tokenReception}`,
				"idempotency-key": randomUUID(),
			},
			payload: {
				chairId: CHAIR_2_ID,
				doctorUserId: DOCTOR_ID,
				holderSessionId: "test-lease-session-1",
				startsAt: reserveStart.toISOString(),
				endsAt: new Date(reserveStart.getTime() + 30 * 60_000).toISOString(),
			},
		});
		assert.equal(leaseRes.statusCode, 409, leaseRes.body);

		// Appointment creation on Chair 2 during reservation must return 409
		const apptRes = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: {
				authorization: `Bearer ${tokenReception}`,
				"idempotency-key": randomUUID(),
			},
			payload: {
				patientId: PATIENT_ID,
				doctorUserId: DOCTOR_ID,
				chairId: CHAIR_2_ID,
				startsAt: reserveStart.toISOString(),
				endsAt: new Date(reserveStart.getTime() + 30 * 60_000).toISOString(),
				reason: "Попытка пробить резерв",
			},
		});
		assert.equal(apptRes.statusCode, 409, apptRes.body);

		// Public booking slots must exclude 12:00..12:30
		const slotsRes = await app.inject({
			method: "GET",
			url: `/api/public/booking/${ORG_ID}/slots?date=${tomorrowIso}`,
		});
		assert.equal(slotsRes.statusCode, 200, slotsRes.body);
		const slotsJson = slotsRes.json() as { slots?: Array<{ time?: string; startTime?: string }> };
		const hasReserved12 = (slotsJson.slots ?? []).some((s) => (s.time ?? s.startTime) === "12:00");
		assert.equal(hasReserved12, false, "12:00 slot blocked by 'Все кресла' must not appear in public slots");
	});

	it("3. Public booking accepts slot ending at midnight 00:00", async (t) => {
		if (!dbAvailable) {
			t.skip("PostgreSQL unavailable");
			return;
		}
		const dayAfter = shiftCalendarDay(tomorrowIso, 1);
		const res = await app.inject({
			method: "POST",
			url: `/api/public/booking/${ORG_ID}/book`,
			headers: { "idempotency-key": randomUUID() },
			payload: {
				organizationId: ORG_ID,
				doctorId: DOCTOR_ID,
				startsAt: `${tomorrowIso}T23:30:00+10:00`,
				endsAt: `${dayAfter}T00:00:00+10:00`,
				patientName: "Ночной Пациент",
				patientPhone: "+79005556677",
			},
		});
		assert.equal(res.statusCode, 200, res.body);
	});

	it("4. POST /api/schedule/shifts scopes deletion by chairId/doctorId and accepts .strict() metadata", async (t) => {
		if (!dbAvailable) {
			t.skip("PostgreSQL unavailable");
			return;
		}
		await withTenantCtx(ORG_ID, async (tx) => {
			await tx.insert(doctorShiftRosters).values([
				{
					id: `shift-${tomorrowIso}-${CHAIR_1_ID}`,
					organizationId: ORG_ID,
					clinicId: CLINIC_ID,
					doctorId: DOCTOR_ID,
					doctorName: "Д-р А",
					chairId: CHAIR_1_ID,
					cabinetId: CHAIR_1_ID,
					dateIso: tomorrowIso,
					startTime: "08:00",
					endTime: "14:00",
				},
				{
					id: `shift-${tomorrowIso}-${CHAIR_2_ID}`,
					organizationId: ORG_ID,
					clinicId: CLINIC_ID,
					doctorId: DOCTOR_2_ID,
					doctorName: "Д-р Б",
					chairId: CHAIR_2_ID,
					cabinetId: CHAIR_2_ID,
					dateIso: tomorrowIso,
					startTime: "14:00",
					endTime: "20:00",
				},
			]);
		});

		const shiftSaveRes = await app.inject({
			method: "POST",
			url: `/api/schedule/shifts?clinicId=${CLINIC_ID}`,
			headers: {
				authorization: `Bearer ${tokenReception}`,
				"idempotency-key": randomUUID(),
			},
			payload: {
				dateIso: tomorrowIso,
				chairId: CHAIR_1_ID,
				shifts: [
					{
						id: `shift-${tomorrowIso}-${CHAIR_1_ID}-updated`,
						doctorId: DOCTOR_ID,
						doctorName: "Д-р А",
						doctorSpecialty: "therapist",
						clinicId: CLINIC_ID,
						assistantId: null,
						assistantName: null,
						chairId: CHAIR_1_ID,
						cabinetId: CHAIR_1_ID,
						dateIso: tomorrowIso,
						archetypeId: "morning_shift",
						shiftPreset: "morning",
						startTime: "09:00",
						endTime: "15:00",
						durationHours: 6,
						breakMinutes: 0,
						isNight: false,
						nightHours: 0,
						status: "scheduled",
						customNotes: "Ок",
					},
				],
			},
		});
		assert.equal(shiftSaveRes.statusCode, 200, shiftSaveRes.body);

		const remaining = await withTenantCtx(ORG_ID, async (tx) =>
			tx
				.select({ id: doctorShiftRosters.id, chairId: doctorShiftRosters.chairId })
				.from(doctorShiftRosters)
				.where(and(eq(doctorShiftRosters.organizationId, ORG_ID), eq(doctorShiftRosters.dateIso, tomorrowIso))),
		);
		assert.ok(
			remaining.some((r) => r.chairId === CHAIR_2_ID),
			"Saving shift for Chair 1 must preserve Chair 2 shift on the same date",
		);
	});

	it("5. ServiceReminderPlugin enforces fail-closed identity & ownership and uses clinic timezone", async (t) => {
		if (!dbAvailable) {
			t.skip("PostgreSQL unavailable");
			return;
		}
		const plugin = new ServiceReminderPlugin();

		// Unverified short numeric Telegram senderId MUST NOT confirm foreign appointment
		const unverifiedReply = await plugin.handle(
			{
				channel: "telegram",
				organizationId: ORG_ID,
				clinicId: CLINIC_ID,
				botConfigId: "default",
				senderId: "12345",
				text: "Подтверждаю",
				payload: `confirm_visit:${FOREIGN_APPT_ID}`,
				timestamp: Date.now(),
			},
			BOT_RUNTIME,
		);
		assert.equal(unverifiedReply?.actionExecuted, "no_active_appointment_found");

		// Verified chat link also MUST NOT confirm another patient's appointment
		const foreignAttemptReply = await plugin.handle(
			{
				channel: "telegram",
				organizationId: ORG_ID,
				clinicId: CLINIC_ID,
				botConfigId: "default",
				senderId: "99887766",
				text: "Подтверждаю",
				payload: `confirm_visit:${FOREIGN_APPT_ID}`,
				timestamp: Date.now(),
			},
			BOT_RUNTIME,
		);
		assert.equal(foreignAttemptReply?.actionExecuted, "appointment_not_found");

		// Verified chat link confirming OWN appointment succeeds in clinic TZ
		const ownConfirmReply = await plugin.handle(
			{
				channel: "telegram",
				organizationId: ORG_ID,
				clinicId: CLINIC_ID,
				botConfigId: "default",
				senderId: "99887766",
				text: "Подтверждаю",
				payload: `confirm_visit:${APPT_REMINDER_ID}`,
				timestamp: Date.now(),
			},
			BOT_RUNTIME,
		);
		assert.equal(ownConfirmReply?.actionExecuted, "appointment_confirmed");
		assert.ok(ownConfirmReply?.text.includes("10:00"), `Expected 10:00 Vladivostok time, got ${ownConfirmReply?.text}`);
		assert.equal(ownConfirmReply?.text.includes("1 клик"), false);
	});

	it("6. PriceFaqPlugin returns honest empty state without fake prices & Telegram schedule reply uses real PG18 appointments", async (t) => {
		if (!dbAvailable) {
			t.skip("PostgreSQL unavailable");
			return;
		}
		const faq = new PriceFaqPlugin();
		const faqReply = await faq.handle(
			{
				channel: "telegram",
				organizationId: ORG_ID,
				clinicId: CLINIC_ID,
				botConfigId: "default",
				senderId: "99887766",
				text: "Сколько стоит имплант?",
				timestamp: Date.now(),
			},
			BOT_RUNTIME,
		);
		assert.equal(faqReply?.actionExecuted, "empty_price_catalog_presented");
		assert.equal(faqReply?.text.includes("1 000 ₽"), false);
		assert.equal(faqReply?.text.includes("35 000 ₽"), false);

		const tgSchedule = await buildDenteTelegramLinkedScheduleReply(
			hashTelegramChatFingerprint("99887766"),
			{ organizationId: ORG_ID, clinicId: CLINIC_ID },
		);
		assert.equal(tgSchedule.linked, true);
		assert.ok(tgSchedule.appointmentCount >= 1);
		assert.ok(tgSchedule.text.includes("10:00"), `Expected real PG18 appointment in reply: ${tgSchedule.text}`);
	});

	it("7. Diagnocat, Flexbe, MAX & Telephony webhooks enforce cross-tenant and per-org secret isolation", async (t) => {
		if (!dbAvailable) {
			t.skip("PostgreSQL unavailable");
			return;
		}
		const prevDiagnocatSecret = process.env.DIAGNOCAT_WEBHOOK_SECRET;
		const prevFlexbeSecret = process.env.FLEXBE_WEBHOOK_SECRET;
		const prevTelephonySecret = process.env.TELEPHONY_WEBHOOK_SECRET;
		process.env.DIAGNOCAT_WEBHOOK_SECRET = "diag-secret-1";
		process.env.FLEXBE_WEBHOOK_SECRET = "flexbe-global-secret-1";
		process.env.TELEPHONY_WEBHOOK_SECRET = "global-telephony-secret";

		try {
			// Diagnocat cross-tenant mismatch must return 403
			const diagRes = await app.inject({
				method: "POST",
				url: "/api/integrations/diagnocat/webhook",
				headers: { "x-diagnocat-secret": "diag-secret-1" },
				payload: {
					patientId: PATIENT_ID,
					organizationId: OTHER_ORG_ID,
					reportUrl: "https://diagnocat.example/report/1",
					odontogramData: { teeth: {} },
				},
			});
			assert.equal(diagRes.statusCode, 403, diagRes.body);

			// Flexbe non-existent org must return 404
			const flexbeRes = await app.inject({
				method: "POST",
				url: `/api/integrations/flexbe/webhook?organizationId=${randomUUID()}`,
				headers: { "x-dente-webhook-secret": "flexbe-global-secret-1" },
				payload: { name: "Лид", phone: "+79001234567" },
			});
			assert.equal(flexbeRes.statusCode, 404, flexbeRes.body);

			// MAX duplicate botId across 2 orgs must refuse webhook processing
			await withTenantCtx(ORG_ID, async (tx) => {
				await tx.insert(denteMaxBotConfigs).values({
					organizationId: ORG_ID,
					botId: "shared-bot-id-collision",
					isActive: true,
					isEnabled: true,
				});
			});
			await withTenantCtx(OTHER_ORG_ID, async (tx) => {
				await tx.insert(denteMaxBotConfigs).values({
					organizationId: OTHER_ORG_ID,
					botId: "shared-bot-id-collision",
					isActive: true,
					isEnabled: true,
				});
			});
			const prevMaxSecret = process.env.MAX_WEBHOOK_SECRET;
			const prevDenteSecret = process.env.DENTE_WEBHOOK_SECRET;
			delete process.env.MAX_WEBHOOK_SECRET;
			delete process.env.DENTE_WEBHOOK_SECRET;
			try {
				const maxRes = await app.inject({
					method: "POST",
					url: "/api/max/webhook",
					headers: {
						"x-max-bot-id": "shared-bot-id-collision",
						"x-dente-webhook-secret": "any-secret",
						"idempotency-key": randomUUID(),
					},
					payload: {
						update_type: "message_created",
						timestamp: Math.floor(Date.now() / 1000),
						payload: { chat: { chatId: "chat-1" }, text: "Привет", msgId: "m-1" },
					},
				});
				assert.equal(maxRes.statusCode, 409, maxRes.body);
			} finally {
				if (prevMaxSecret === undefined) delete process.env.MAX_WEBHOOK_SECRET;
				else process.env.MAX_WEBHOOK_SECRET = prevMaxSecret;
				if (prevDenteSecret === undefined) delete process.env.DENTE_WEBHOOK_SECRET;
				else process.env.DENTE_WEBHOOK_SECRET = prevDenteSecret;
			}

			// Telephony: when org has per-org secret, global TELEPHONY_WEBHOOK_SECRET must be rejected (401)
			let telephonyRejectedStatus = 0;
			const fakeReq = {
				headers: { "x-dente-webhook-secret": "global-telephony-secret" },
				query: {},
				log: app.log,
			} as unknown as Parameters<typeof authenticatePbxWebhook>[0];
			const fakeReply = {
				status(code: number) {
					telephonyRejectedStatus = code;
					return this;
				},
				send() {
					return this;
				},
			} as unknown as Parameters<typeof authenticatePbxWebhook>[1];

			const isAuthed = await authenticatePbxWebhook(fakeReq, fakeReply, TELEPHONY_ORG_ID, {});
			assert.equal(isAuthed, false);
			assert.equal(telephonyRejectedStatus, 401);
		} finally {
			if (prevDiagnocatSecret === undefined) delete process.env.DIAGNOCAT_WEBHOOK_SECRET;
			else process.env.DIAGNOCAT_WEBHOOK_SECRET = prevDiagnocatSecret;
			if (prevFlexbeSecret === undefined) delete process.env.FLEXBE_WEBHOOK_SECRET;
			else process.env.FLEXBE_WEBHOOK_SECRET = prevFlexbeSecret;
			if (prevTelephonySecret === undefined) delete process.env.TELEPHONY_WEBHOOK_SECRET;
			else process.env.TELEPHONY_WEBHOOK_SECRET = prevTelephonySecret;
		}
	});

	it("8. getPeriodStartInTimeZone calculates month start across UTC midnight in Asia/Vladivostok", () => {
		const instant = new Date("2026-06-30T15:30:00.000Z"); // 2026-07-01 01:30 in Vladivostok
		const start = getPeriodStartInTimeZone("month", "Asia/Vladivostok", instant);
		assert.equal(start.toISOString(), "2026-06-30T14:00:00.000Z");
	});
});
