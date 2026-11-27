import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	crmLeads,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import { registerPublicBookingRoutes } from "../../routes/publicBooking/publicBookingHandlers.js";
import { registerSettingsRoutes } from "../../routes/settings.js";
import {
	getActiveCodeForTesting,
	requestPhoneVerification,
} from "../../routes/publicBooking/smsVerificationAndSpamGate.js";
import { isAnyChairAvailable } from "../../routes/publicBooking/slotAvailabilityEngine.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { OnlineBookingPlugin } from "../../services/bots/plugins/OnlineBookingPlugin.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "publicBookingFixerVerified";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 3);

describe("Domain 4: Public Booking Fixer Verified Suite (Mandates 8e, 8n, 8x, 8ap)", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника Цифровой Стоматологии DENTE",
					clinicSchedule: {
						monday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
						tuesday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
						wednesday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
						thursday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
						friday: { isWorking: true, startsAt: "08:00", endsAt: "20:00" },
						saturday: { isWorking: true, startsAt: "09:00", endsAt: "18:00" },
						sunday: { isWorking: true, startsAt: "09:00", endsAt: "18:00" },
						requireSmsVerification: false,
					},
				});

				await tx.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Центральный филиал",
					timezone: "Europe/Moscow",
				});

				await tx.insert(users).values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Соколов Андрей Михайлович",
					role: "doctor",
					email: "sokolov@dente.local",
					isActive: true,
					workingHours: {
						monday: { isWorking: true, startMinute: 8 * 60, endMinute: 20 * 60 },
						tuesday: { isWorking: true, startMinute: 8 * 60, endMinute: 20 * 60 },
						wednesday: { isWorking: true, startMinute: 8 * 60, endMinute: 20 * 60 },
						thursday: { isWorking: true, startMinute: 8 * 60, endMinute: 20 * 60 },
						friday: { isWorking: true, startMinute: 8 * 60, endMinute: 20 * 60 },
						saturday: { isWorking: true, startMinute: 9 * 60, endMinute: 18 * 60 },
						sunday: { isWorking: true, startMinute: 9 * 60, endMinute: 18 * 60 },
					},
				});
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}

		app = createTenantTestApp();
		await registerPublicBookingRoutes(app);
		await app.ready();
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
		if (app) {
			await app.close();
		}
	});

	it("1. POST /:organizationId/send-otp and POST /:organizationId/verify-otp aliases work correctly", async (t) => {
		if (!databaseAvailable) return t.skip("Database not available");

		const testPhone = "+7 (999) 765-43-21";

		// 1. Send OTP via alias
		const sendRes = await app.inject({
			method: "POST",
			url: `/${ORG_ID}/send-otp`,
			payload: {
				phone: testPhone,
				method: "sms",
			},
		});

		assert.equal(sendRes.statusCode, 200);
		const sendData = JSON.parse(sendRes.body);
		assert.equal(sendData.success, true);
		assert.ok(sendData.challengeId);

		// 2. Fetch active code
		const code = getActiveCodeForTesting(testPhone);
		assert.ok(code, "Generated code must exist in challenge store");

		// 3. Verify OTP via alias
		const verifyRes = await app.inject({
			method: "POST",
			url: `/${ORG_ID}/verify-otp`,
			payload: {
				phone: testPhone,
				code,
			},
		});

		assert.equal(verifyRes.statusCode, 200);
		const verifyData = JSON.parse(verifyRes.body);
		assert.equal(verifyData.success, true);
		assert.equal(verifyData.verified, true);
	});

	it("2. Defect 1 Fix: Web booking without verificationCode succeeds in live mode as unconfirmed pre-booking", async (t) => {
		if (!databaseAvailable) return t.skip("Database not available");

		// Future date/time in 2029
		const startsAt = "2029-06-15T10:00:00.000Z";
		const endsAt = "2029-06-15T10:30:00.000Z";

		const bookRes = await app.inject({
			method: "POST",
			url: `/${ORG_ID}/book`,
			payload: {
				doctorId: DOCTOR_ID,
				startsAt,
				endsAt,
				patientName: "Воронова Елена Дмитриевна",
				patientPhone: "8 (927) 456-78-90",
				comment: "Консультация ортодонта",
				// verificationCode is intentionally omitted
			},
		});

		assert.equal(bookRes.statusCode, 200, `Expected 200, got ${bookRes.statusCode}: ${bookRes.body}`);
		const body = JSON.parse(bookRes.body);
		assert.equal(body.success, true);
		assert.equal(body.status, "preliminary");
		assert.equal(body.isPreliminary, true);
		assert.ok(body.referenceNumber);
		assert.equal(body.appointment, undefined);

		// Verify appointment in DB has status planned
		const [createdAppt] = await db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ORG_ID),
					eq(appointments.doctorUserId, DOCTOR_ID),
					eq(appointments.startsAt, new Date(startsAt)),
				),
			)
			.limit(1);

		assert.equal(createdAppt?.status, "planned");

		// Verify patient phone was normalized to E.164 (+79274567890)
		const [createdPatient] = await db
			.select()
			.from(patients)
			.where(eq(patients.id, createdAppt!.patientId!))
			.limit(1);

		assert.equal(createdPatient?.phone, "+79274567890", "Phone must be normalized to E.164");

		// Verify CRM lead was registered as unconfirmed
		const [lead] = await db
			.select()
			.from(crmLeads)
			.where(and(eq(crmLeads.organizationId, ORG_ID), eq(crmLeads.patientName, "Воронова Елена Дмитриевна")))
			.limit(1);

		assert.ok(lead);
		assert.ok(lead?.status === "consult_booked" || lead?.status === "new", `Lead status must be consult_booked or new, got: ${lead?.status}`);
	});

	it("3. Web booking with verificationCode succeeds as confirmed", async (t) => {
		if (!databaseAvailable) return t.skip("Database not available");

		const testPhone = "+7 (916) 123-45-67";
		// Request OTP
		await requestPhoneVerification(testPhone, "sms", "127.0.0.1", ORG_ID);
		const code = getActiveCodeForTesting(testPhone);
		assert.ok(code);

		const startsAt = "2029-06-15T11:00:00.000Z";
		const endsAt = "2029-06-15T11:30:00.000Z";

		const bookRes = await app.inject({
			method: "POST",
			url: `/${ORG_ID}/book`,
			payload: {
				doctorId: DOCTOR_ID,
				startsAt,
				endsAt,
				patientName: "Смирнов Петр Алексеевич",
				patientPhone: testPhone,
				comment: "Профгигиена",
				verificationCode: code,
			},
		});

		assert.equal(bookRes.statusCode, 200);
		const body = JSON.parse(bookRes.body);
		assert.equal(body.success, true);
		assert.equal(body.status, "confirmed");
		assert.ok(body.referenceNumber);
		assert.equal(body.appointment, undefined);

		// Verify appointment in DB has status confirmed
		const [createdAppt] = await db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ORG_ID),
					eq(appointments.doctorUserId, DOCTOR_ID),
					eq(appointments.startsAt, new Date(startsAt)),
				),
			)
			.limit(1);

		assert.equal(createdAppt?.status, "confirmed");
	});

	it("4. OnlineBookingPlugin: calculates slots dynamically via calculateAvailableSlots and books via executeBookingTransaction", async (t) => {
		if (!databaseAvailable) return t.skip("Database not available");

		const plugin = new OnlineBookingPlugin();
		const mockRuntime: any = {};

		// 1. Request slots via message text "записаться"
		const slotsReply = await plugin.handle(
			{
				botConfigId: "cfg_test_123",
				timestamp: Date.now(),
				organizationId: ORG_ID,
				senderId: "tg_user_12345",
				senderName: "Иван Телеграмов",
				text: "хочу записаться на прием",
				channel: "telegram",
			},
			mockRuntime,
		);

		assert.ok(slotsReply);
		assert.equal(slotsReply.actionExecuted, "booking_slots_presented");
		assert.ok(slotsReply.keyboard?.buttons);
		// Buttons should contain calculated slots
		const hasSlots = slotsReply.keyboard.buttons.some((row) =>
			row.some((b) => b.callbackData?.startsWith("booking:confirm:") ?? false),
		);
		assert.ok(hasSlots, "Must contain dynamic booking:confirm slots");

		// 2. Confirm booking via callback payload
		const firstSlotBtn = slotsReply.keyboard.buttons
			.flat()
			.find((b) => b.callbackData?.startsWith("booking:confirm:") ?? false);
		assert.ok(firstSlotBtn && firstSlotBtn.callbackData);

		const confirmReply = await plugin.handle(
			{
				botConfigId: "cfg_test_123",
				timestamp: Date.now(),
				organizationId: ORG_ID,
				senderId: "79998881122",
				senderName: "Иван Телеграмов",
				text: "",
				payload: firstSlotBtn.callbackData,
				channel: "telegram",
			},
			mockRuntime,
		);

		assert.ok(confirmReply);
		assert.equal(confirmReply.actionExecuted, "appointment_booked");
		assert.ok(confirmReply.metadata?.appointmentId);
		assert.match(confirmReply.text, /Вы успешно записаны на приём/);

		// Double booking collision check: same payload must report conflict
		const duplicateReply = await plugin.handle(
			{
				botConfigId: "cfg_test_123",
				timestamp: Date.now(),
				organizationId: ORG_ID,
				senderId: "79997770000",
				senderName: "Другой Пациент",
				text: "",
				payload: firstSlotBtn.callbackData,
				channel: "telegram",
			},
			mockRuntime,
		);

		assert.ok(duplicateReply);
		assert.equal(duplicateReply.actionExecuted, "booking_conflict");
		assert.match(duplicateReply.text, /уже занято/);
	});

	it("5. Unit Test: isAnyChairAvailable correctly determines chair vacancy", () => {
		const activeChairs = ["chair-1", "chair-2"];
		const now = Date.now();
		const slotStartMs = now + 3600_000;
		const slotEndMs = slotStartMs + 1800_000;

		// 1. Both chairs free
		assert.equal(isAnyChairAvailable(activeChairs, [], slotStartMs, slotEndMs), true);

		// 2. Only chair-1 occupied, chair-2 free
		const oneOccupied = [
			{ chairId: "chair-1", startMs: slotStartMs, endMs: slotEndMs },
		];
		assert.equal(isAnyChairAvailable(activeChairs, oneOccupied, slotStartMs, slotEndMs), true);

		// 3. Both chairs occupied -> returns false
		const bothOccupied = [
			{ chairId: "chair-1", startMs: slotStartMs, endMs: slotEndMs },
			{ chairId: "chair-2", startMs: slotStartMs, endMs: slotEndMs },
		];
		assert.equal(isAnyChairAvailable(activeChairs, bothOccupied, slotStartMs, slotEndMs), false);

		// 4. Overlap boundary: previous appointment ends right when slot starts
		const adjacent = [
			{ chairId: "chair-1", startMs: slotStartMs - 1800_000, endMs: slotStartMs },
			{ chairId: "chair-2", startMs: slotEndMs, endMs: slotEndMs + 1800_000 },
		];
		assert.equal(isAnyChairAvailable(activeChairs, adjacent, slotStartMs, slotEndMs), true);

		// 5. Empty active chairs clinic -> returns true (unconstrained)
		assert.equal(isAnyChairAvailable([], bothOccupied, slotStartMs, slotEndMs), true);
	});

	it("6. Chair pre-check in calculateAvailableSlots excludes time slots when all clinic chairs are occupied", async (t) => {
		if (!databaseAvailable) return t.skip("Database not available");

		const CHAIR_ID = fixtureUuid(NAMESPACE, 99);
		const testDate = "2029-06-20";
		const busyStart = "2029-06-20T10:00:00.000Z";
		const busyEnd = "2029-06-20T10:30:00.000Z";

		await withFixtureTenant(ORG_ID, async (tx) => {
			// Insert sole active physical chair
			await tx.insert(chairs).values({
				id: CHAIR_ID,
				organizationId: ORG_ID,
				clinicId: CLINIC_ID,
				name: "Кресло 1 (Хирургия)",
				isActive: true,
			});

			// Insert existing appointment occupying this sole chair from 10:00 to 10:30
			await tx.insert(appointments).values({
				organizationId: ORG_ID,
				chairId: CHAIR_ID,
				doctorUserId: DOCTOR_ID,
				startsAt: new Date(busyStart),
				endsAt: new Date(busyEnd),
				status: "planned",
			});
		});

		// Query available slots
		const res = await app.inject({
			method: "GET",
			url: `/${ORG_ID}/slots?date=${testDate}`,
		});

		assert.equal(res.statusCode, 200);
		const slots = JSON.parse(res.body) as Array<{ startsAt: string }>;
		assert.ok(Array.isArray(slots));

		// Ensure 10:00-10:30 slot is NOT in the list because sole chair was occupied
		const hasBusySlot = slots.some((s) => s.startsAt === busyStart);
		assert.equal(hasBusySlot, false, "Slot with occupied physical chair must be excluded from available slots");
	});

	it("7. Multi-Tenant Strict Isolation: POST /send-otp without organizationId rejects with 404 ClinicNotFound", async (t) => {
		if (!databaseAvailable) return t.skip("Database not available");

		const testPhone = "+7 (999) 111-22-33";

		// Direct call to root /send-otp without organizationId must be strictly rejected per Mandate 8s & 152-FZ
		const res = await app.inject({
			method: "POST",
			url: "/send-otp",
			payload: {
				phone: testPhone,
				method: "sms",
			},
		});

		assert.equal(res.statusCode, 404, `Expected 404, got ${res.statusCode}: ${res.body}`);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "ClinicNotFound");
		assert.ok(body.message.includes("Клиника не найдена"));

		// Providing explicit valid organizationId succeeds with 200
		const resValid = await app.inject({
			method: "POST",
			url: `/${ORG_ID}/send-otp`,
			payload: {
				phone: testPhone,
				method: "sms",
			},
		});
		assert.equal(resValid.statusCode, 200);
		const validBody = JSON.parse(resValid.body);
		assert.equal(validBody.success, true);
		assert.ok(validBody.challengeId);
	});

	it("8. Clinic work hours saved via PUT /api/settings/clinic/profile govern public booking slots and closed-day 409", async (t) => {
		if (!databaseAvailable) return t.skip("Database not available");

		const WORK_ORG_ID = fixtureUuid(NAMESPACE, 100);
		const WORK_DOC_ID = fixtureUuid(NAMESPACE, 101);
		const adminSecret = `proof-${Date.now()}`;
		const prevSecret = process.env.DENTE_SETTINGS_ADMIN_SECRET;
		const prevUnguarded = process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS;
		process.env.DENTE_SETTINGS_ADMIN_SECRET = adminSecret;
		process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS = "0";

		const computeFutureWeekday = (targetDay: number): string => {
			const d = new Date();
			d.setDate(d.getDate() + 7);
			const diff = (targetDay - d.getDay() + 7) % 7;
			d.setDate(d.getDate() + diff);
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		};
		const futureMonday = computeFutureWeekday(1);
		const futureSaturday = computeFutureWeekday(6);

		await purgeFixtureOrganizations([WORK_ORG_ID]);
		const settingsApp = createTenantTestApp();
		try {
			await registerSettingsRoutes(settingsApp);
			await settingsApp.register(registerPublicBookingRoutes, { prefix: "/api/public/booking" });
			await settingsApp.ready();

			await withFixtureTenant(WORK_ORG_ID, async (tx) => {
				await tx.insert(organizations).values({ id: WORK_ORG_ID, name: "Проверка часов работы — клиника" });
				await tx.insert(clinics).values({
					organizationId: WORK_ORG_ID,
					name: "Проверка часов работы — клиника",
					timezone: "Europe/Samara",
				});
				await tx.insert(users).values({
					id: WORK_DOC_ID,
					organizationId: WORK_ORG_ID,
					fullName: "Врач проверки часов",
					role: "doctor",
					isActive: true,
				});
			});

			const readSlots = async (date: string) => {
				const r = await settingsApp.inject({
					method: "GET",
					url: `/api/public/booking/${WORK_ORG_ID}/slots/${WORK_DOC_ID}?date=${date}`,
				});
				return {
					status: r.statusCode,
					slots: r.statusCode === 200 ? (JSON.parse(r.body) as Array<{ time: string }>) : null,
					error: r.statusCode !== 200 ? ((JSON.parse(r.body) as { error?: string }).error ?? null) : null,
				};
			};

			const beforeMon = await readSlots(futureMonday);
			const beforeSat = await readSlots(futureSaturday);
			assert.equal(beforeMon.slots?.[0]?.time, "09:00");
			assert.equal((beforeSat.slots?.length ?? 0) > 0, true);

			const clinicToken = signToken({ organizationId: WORK_ORG_ID }, authTokenSecret());
			const ownerToken = signToken({ organizationId: WORK_ORG_ID, userId: WORK_DOC_ID, role: "owner" }, authTokenSecret());
			const saved = await settingsApp.inject({
				method: "PUT",
				url: "/api/settings/clinic/profile",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": ownerToken,
					"x-dente-admin-secret": adminSecret,
				},
				payload: {
					clinicName: "Проверка часов работы — клиника",
					legalName: "Проверка часов работы — клиника",
					timezone: "Europe/Samara",
					defaultVisitMinutes: 60,
					scheduleDefaults: {
						workdayStart: "08:00",
						workdayEnd: "20:00",
						workingDays: [1, 2, 3, 4, 5],
						appointmentBufferMinutes: 15,
					},
					egiszEnabled: false,
				},
			});
			assert.equal(saved.statusCode, 200, saved.body);

			const afterMon = await readSlots(futureMonday);
			const afterSat = await readSlots(futureSaturday);
			assert.equal(afterMon.slots?.[0]?.time, "08:00");
			assert.equal(afterMon.slots?.[afterMon.slots.length - 1]?.time, "19:30");
			assert.equal(afterMon.slots?.length, 24);
			assert.equal(afterSat.status, 409);
			assert.equal(afterSat.error, "ClinicClosedThatDay");

			await withFixtureTenant(WORK_ORG_ID, async (tx) => {
				const [patientRow] = await tx
					.insert(patients)
					.values({ organizationId: WORK_ORG_ID, fullName: "Пациент проверки часов" })
					.returning({ id: patients.id });
				assert.ok(patientRow);
				const busyStart = new Date(`${futureMonday}T08:00:00.000+04:00`);
				await tx.insert(appointments).values({
					organizationId: WORK_ORG_ID,
					patientId: patientRow.id,
					doctorUserId: WORK_DOC_ID,
					status: "planned",
					startsAt: busyStart,
					endsAt: new Date(busyStart.getTime() + 3_600_000),
				});
			});

			const withBusy = await readSlots(futureMonday);
			assert.equal(withBusy.slots?.some((s) => s.time === "08:00"), false);
			assert.equal(withBusy.slots?.some((s) => s.time === "08:30"), false);
			assert.equal(withBusy.slots?.[0]?.time, "09:00");
			assert.equal(withBusy.slots?.length, 22);
		} finally {
			if (prevSecret === undefined) delete process.env.DENTE_SETTINGS_ADMIN_SECRET;
			else process.env.DENTE_SETTINGS_ADMIN_SECRET = prevSecret;
			if (prevUnguarded === undefined) delete process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS;
			else process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS = prevUnguarded;
			await settingsApp.close();
			await purgeFixtureOrganizations([WORK_ORG_ID]);
		}
	});

	it("6. [W16-BK-01] rejects patientId in public /book payload and returns minimal public DTO without internal UUIDs", async (t) => {
		if (!databaseAvailable) return t.skip("Database not available");

		const [foreignPatient] = await withFixtureTenant(ORG_ID, async (tx) => {
			return tx
				.insert(patients)
				.values({
					organizationId: ORG_ID,
					fullName: "Сторонний Пациент 152-ФЗ",
					phone: "+79001112233",
					status: "active",
				})
				.returning({ id: patients.id });
		});
		assert.ok(foreignPatient);

		const res = await app.inject({
			method: "POST",
			url: `/${ORG_ID}/book`,
			payload: {
				doctorId: DOCTOR_ID,
				patientId: foreignPatient.id,
				startsAt: "2029-06-15T12:00:00.000Z",
				endsAt: "2029-06-15T12:30:00.000Z",
				patientName: "Посторонний Клиент",
				patientPhone: "+79009998877",
			},
		});
		assert.equal(res.statusCode, 400, `Public /book must reject arbitrary patientId via .strict(), got ${res.statusCode}: ${res.body}`);

		const waitlistIdor = await app.inject({
			method: "POST",
			url: `/${ORG_ID}/waitlist`,
			payload: {
				patientId: foreignPatient.id,
				patientName: "Чужой Вход",
				patientPhone: "+79009998877",
			},
		});
		assert.equal(waitlistIdor.statusCode, 403, `Waitlist must reject mismatched patientId phone, got ${waitlistIdor.statusCode}: ${waitlistIdor.body}`);
	});

	it("7. [W16-BK-02] blocks OTP brute-force bypass after 3 failed DB attempts without falling back to in-memory cache", async (t) => {
		if (!databaseAvailable) return t.skip("Database not available");

		const targetPhone = "+7 (926) 777-88-99";
		const issued = await requestPhoneVerification(targetPhone, "sms", "127.0.0.2", ORG_ID);
		assert.equal(issued.allowed, true);
		const validCode = issued.developerCode ?? getActiveCodeForTesting(targetPhone);
		assert.ok(validCode);

		const { verifyPhoneOtpAsync } = await import("../../routes/publicBooking/smsVerificationAndSpamGate.js");
		const wrongCode = validCode === "000000" ? "111111" : "000000";

		for (let attempt = 1; attempt <= 3; attempt++) {
			const res = await verifyPhoneOtpAsync(targetPhone, wrongCode, ORG_ID);
			assert.equal(res.valid, false, `Attempt ${attempt} with wrong code must fail`);
		}

		// 4th attempt even with validCode MUST fail (exhausted in DB AND purged from in-memory map by challengeKey)
		const bypassAttempt = await verifyPhoneOtpAsync(targetPhone, validCode, ORG_ID);
		assert.equal(bypassAttempt.valid, false, "4th attempt after DB exhaustion must NOT bypass via in-memory map");
	});
});
