import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	organizations,
	patients,
	users,
} from "../db/schema.js";
import { handleBookAppointment } from "../routes/omnichannelBots/triageModules/triageBookingAction.js";
import { fixtureUuid, withFixtureTenant } from "./support/fixtureOrganizations.js";

describe("Omnichannel Triage Booking Action: Doctor Role Enforcement & Slot Collisions", () => {
	const TEST_ORG_ID = fixtureUuid("omni-triage-book-test", 1);
	const PATIENT_ID = fixtureUuid("omni-triage-book-test", 2);
	const DOCTOR_USER_ID = fixtureUuid("omni-triage-book-test", 3);
	const ADMIN_USER_ID = fixtureUuid("omni-triage-book-test", 4);
	const CHAIR_ID = fixtureUuid("omni-triage-book-test", 5);
	const CLINIC_ID = fixtureUuid("omni-triage-book-test", 6);

	let isDbAvailable = false;

	before(async () => {
		try {
			await db.execute(sql`SELECT 1`);
			isDbAvailable = true;
		} catch {
			isDbAvailable = false;
		}

		if (isDbAvailable) {
			await withFixtureTenant(TEST_ORG_ID, async (tx) => {
				await tx
					.delete(appointments)
					.where(eq(appointments.organizationId, TEST_ORG_ID));

				await tx
					.insert(organizations)
					.values({ id: TEST_ORG_ID, name: "Клиника Омниканального Бронирования" })
					.onConflictDoNothing();

				await tx
					.insert(clinics)
					.values({
						id: CLINIC_ID,
						organizationId: TEST_ORG_ID,
						name: "Тестовая Клиника Домена 38",
					})
					.onConflictDoNothing();

				await tx
					.insert(users)
					.values([
						{
							id: DOCTOR_USER_ID,
							organizationId: TEST_ORG_ID,
							fullName: "Доктор Стоматологов Иван",
							email: "doc.triage@dente.local",
							role: "doctor",
							isActive: true,
						},
						{
							id: ADMIN_USER_ID,
							organizationId: TEST_ORG_ID,
							fullName: "Администратор Клиники Петр",
							email: "admin.triage@dente.local",
							role: "administrator",
							isActive: true,
						},
					])
					.onConflictDoNothing();

				await tx
					.insert(patients)
					.values({
						id: PATIENT_ID,
						organizationId: TEST_ORG_ID,
						fullName: "Пациент Тестовый Сергеевич",
						phone: "+7 999 555-44-33",
					})
					.onConflictDoNothing();

				await tx
					.insert(chairs)
					.values({
						id: CHAIR_ID,
						organizationId: TEST_ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло 1 (Терапия)",
						isActive: true,
					})
					.onConflictDoNothing();
			});
		}
	});

	it("1. Rejects invalid date intervals with 400 ValidationError", async () => {
		const res = await handleBookAppointment(TEST_ORG_ID, "test_sender_1", {
			patientId: PATIENT_ID,
			startsAt: "2030-05-10T12:00:00Z",
			endsAt: "2030-05-10T11:00:00Z", // startsAt >= endsAt
		});

		assert.strictEqual(res.ok, false);
		assert.strictEqual(res.statusCode, 400);
		assert.strictEqual(res.error, "ValidationError");
	});

	it("2. Rejects booking on non-doctor staff (e.g. administrator) with 400 DoctorNotFound", async () => {
		if (!isDbAvailable) return;

		const res = await handleBookAppointment(TEST_ORG_ID, "test_sender_1", {
			patientId: PATIENT_ID,
			doctorUserId: ADMIN_USER_ID, // role is 'administrator', not 'doctor'
			startsAt: "2030-05-10T10:00:00Z",
			endsAt: "2030-05-10T11:00:00Z",
			sendConfirmationToChat: false,
		});

		assert.strictEqual(res.ok, false);
		assert.strictEqual(res.statusCode, 400);
		assert.strictEqual(res.error, "DoctorNotFound");
		assert.ok(res.message?.includes("не является лечащим врачом"));
	});

	it("3. Successfully books appointment for user with role 'doctor'", async () => {
		if (!isDbAvailable) return;

		const res = await handleBookAppointment(TEST_ORG_ID, "test_sender_1", {
			patientId: PATIENT_ID,
			doctorUserId: DOCTOR_USER_ID,
			startsAt: "2030-05-10T10:00:00Z",
			endsAt: "2030-05-10T11:00:00Z",
			reason: "Первичный осмотр",
			sendConfirmationToChat: false,
		});

		assert.strictEqual(res.ok, true);
		assert.ok(res.appointmentId);
	});

	it("4. Detects slot collision and rejects overlapping booking with 409 SlotConflict", async () => {
		if (!isDbAvailable) return;

		// Попытка записаться на пересекающийся интервал 10:30 - 11:30 к тому же врачу/пациенту
		const conflictRes = await handleBookAppointment(TEST_ORG_ID, "test_sender_2", {
			patientId: PATIENT_ID,
			doctorUserId: DOCTOR_USER_ID,
			startsAt: "2030-05-10T10:30:00Z",
			endsAt: "2030-05-10T11:30:00Z",
			reason: "Конфликтная запись",
			sendConfirmationToChat: false,
		});

		assert.strictEqual(conflictRes.ok, false);
		assert.strictEqual(conflictRes.statusCode, 409);
		assert.strictEqual(conflictRes.error, "SlotConflict");
		assert.ok(conflictRes.message?.includes("уже занято"));
	});

	it("5. Accepts non-overlapping adjacent slot cleanly", async () => {
		if (!isDbAvailable) return;

		// Смежный непересекающийся интервал: 11:00 - 12:00
		const adjacentRes = await handleBookAppointment(TEST_ORG_ID, "test_sender_3", {
			patientId: PATIENT_ID,
			doctorUserId: DOCTOR_USER_ID,
			startsAt: "2030-05-10T11:00:00Z",
			endsAt: "2030-05-10T12:00:00Z",
			reason: "Смежный прием",
			sendConfirmationToChat: false,
		});

		assert.strictEqual(adjacentRes.ok, true);
		assert.ok(adjacentRes.appointmentId);
	});
});
