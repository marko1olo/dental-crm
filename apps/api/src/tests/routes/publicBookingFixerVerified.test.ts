import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	clinics,
	crmLeads,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import { registerPublicBookingRoutes } from "../../routes/publicBooking/publicBookingHandlers.js";
import { publicBookingQueueService } from "../../services/publicBookingQueueService.js";
import { OnlineBookingPlugin } from "../../services/bots/plugins/OnlineBookingPlugin.js";
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
		const code = publicBookingQueueService.getActiveCodeForTesting(testPhone);
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
		assert.equal(body.status, "unconfirmed");
		assert.ok(body.appointment?.id);

		// Verify appointment in DB has status planned
		const [createdAppt] = await db
			.select()
			.from(appointments)
			.where(eq(appointments.id, body.appointment.id))
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
		assert.equal(lead?.status, "new");
	});

	it("3. Web booking with verificationCode succeeds as confirmed", async (t) => {
		if (!databaseAvailable) return t.skip("Database not available");

		const testPhone = "+7 (916) 123-45-67";
		// Request OTP
		publicBookingQueueService.requestPhoneVerification(testPhone, "sms", "127.0.0.1", ORG_ID);
		const code = publicBookingQueueService.getActiveCodeForTesting(testPhone);
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

		// Verify appointment in DB has status confirmed
		const [createdAppt] = await db
			.select()
			.from(appointments)
			.where(eq(appointments.id, body.appointment.id))
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
			row.some((b) => b.callbackData.startsWith("booking:confirm:")),
		);
		assert.ok(hasSlots, "Must contain dynamic booking:confirm slots");

		// 2. Confirm booking via callback payload
		const firstSlotBtn = slotsReply.keyboard.buttons
			.flat()
			.find((b) => b.callbackData.startsWith("booking:confirm:"));
		assert.ok(firstSlotBtn);

		const confirmReply = await plugin.handle(
			{
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
});
