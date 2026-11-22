import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	idempotencyKeys,
	organizations,
	patients,
	users,
	visits,
} from "../../db/schema.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "scheduleDragDropAudit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);

const DOCTOR_1_ID = fixtureUuid(NAMESPACE, 10);
const CHAIR_1_ID = fixtureUuid(NAMESPACE, 30);
const PATIENT_1_ID = fixtureUuid(NAMESPACE, 40);
const PATIENT_2_ID = fixtureUuid(NAMESPACE, 41);

const ADMIN_SECRET_HEADER = "x-dente-admin-secret";
const SECRET_VARIABLE = "DENTE_SCHEDULE_ADMIN_SECRET";

describe("Schedule Drag & Drop Inquest: Overbooking, ACID Transitions & Solo Sovereignty", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let databaseAvailable = true;
	const adminSecret = randomBytes(24).toString("base64url");
	const savedSecret = process.env[SECRET_VARIABLE];

	before(async () => {
		process.env[SECRET_VARIABLE] = adminSecret;
		app = createTenantTestApp();
		await registerScheduleRoutes(app);
		await app.ready();

		clinicToken = signToken(
			{ organizationId: ORG_ID },
			authTokenSecret(),
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await db.delete(idempotencyKeys).where(eq(idempotencyKeys.clinicId, ORG_ID)).catch(() => {});
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "DND Audit Test Clinic",
				}).onConflictDoNothing();

				await tx.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Главный филиал",
				}).onConflictDoNothing();

				await tx.insert(users).values({
					id: DOCTOR_1_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Хирург Тестовый",
					role: "doctor",
					email: "doctor.dnd@dente.ru",
					phone: "+79001112233",
					isActive: true,
				}).onConflictDoNothing();

				await tx.insert(chairs).values({
					id: CHAIR_1_ID,
					organizationId: ORG_ID,
					clinicId: CLINIC_ID,
					name: "Кресло Терапии 1",
					isActive: true,
				}).onConflictDoNothing();

				await tx.insert(patients).values([
					{
						id: PATIENT_1_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						fullName: "Иванов Иван Иванович",
						phone: "+79001110001",
					},
					{
						id: PATIENT_2_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						fullName: "Петров Петр Петрович",
						phone: "+79001110002",
					},
				]).onConflictDoNothing();
			});
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				databaseAvailable = false;
				return;
			}
			throw error;
		}
	});

	after(async () => {
		if (savedSecret === undefined) {
			delete process.env[SECRET_VARIABLE];
		} else {
			process.env[SECRET_VARIABLE] = savedSecret;
		}
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
			await db.delete(idempotencyKeys).where(eq(idempotencyKeys.clinicId, ORG_ID)).catch(() => {});
		}
		await app.close();
	});

	test("1. DND move without allowOverbooking: returns 409 Conflict on overlap and keeps slot intact", async (t) => {
		if (!databaseAvailable) return t.skip("Database unavailable");

		// Создаем приём 1 (10:00 - 11:00)
		const createRes1 = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
				"content-type": "application/json",
				"idempotency-key": "idemp-dnd-1",
			},
			payload: {
				patientId: PATIENT_1_ID,
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				startsAt: "2026-12-01T10:00:00.000Z",
				endsAt: "2026-12-01T11:00:00.000Z",
				status: "planned",
				reason: "Лечение кариеса",
			},
		});
		assert.strictEqual(createRes1.statusCode, 201);
		const appt1 = JSON.parse(createRes1.body).appointment;

		// Создаем приём 2 (14:00 - 15:00)
		const createRes2 = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
				"content-type": "application/json",
				"idempotency-key": "idemp-dnd-2",
			},
			payload: {
				patientId: PATIENT_2_ID,
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				startsAt: "2026-12-01T14:00:00.000Z",
				endsAt: "2026-12-01T15:00:00.000Z",
				status: "planned",
				reason: "Консультация",
			},
		});
		assert.strictEqual(createRes2.statusCode, 201);
		const appt2 = JSON.parse(createRes2.body).appointment;

		// Попытка DND переноса приёма 2 на 10:30 (наложение на приём 1) с allowOverbooking: false
		const patchConflictRes = await app.inject({
			method: "PATCH",
			url: `/api/appointments/${appt2.id}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
				"content-type": "application/json",
				"idempotency-key": "idemp-dnd-move-conflict",
			},
			payload: {
				startsAt: "2026-12-01T10:30:00.000Z",
				endsAt: "2026-12-01T11:30:00.000Z",
				allowOverbooking: false,
			},
		});

		assert.strictEqual(patchConflictRes.statusCode, 409);
		const conflictPayload = JSON.parse(patchConflictRes.body);
		assert.strictEqual(conflictPayload.code, "AppointmentUpdateRejected");

		// Проверяем в БД: приём 2 НЕ переместился и остался на 14:00
		const [dbAppt2] = await db
			.select()
			.from(appointments)
			.where(and(eq(appointments.id, appt2.id), eq(appointments.organizationId, ORG_ID)));
		assert.strictEqual(dbAppt2.startsAt.toISOString(), "2026-12-01T14:00:00.000Z");
		assert.strictEqual(dbAppt2.isOverbooking, false);
	});

	test("2. DND move with explicit allowOverbooking: true succeeds and sets is_overbooking in DB", async (t) => {
		if (!databaseAvailable) return t.skip("Database unavailable");

		// Находим приём 2
		const [appt2] = await db
			.select()
			.from(appointments)
			.where(and(eq(appointments.patientId, PATIENT_2_ID), eq(appointments.organizationId, ORG_ID)))
			.limit(1);
		assert.ok(appt2);

		// Осознанный перенос с подтверждением овербукинга
		const patchOkRes = await app.inject({
			method: "PATCH",
			url: `/api/appointments/${appt2.id}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
				"content-type": "application/json",
				"idempotency-key": "idemp-dnd-move-confirmed-overbooking",
			},
			payload: {
				startsAt: "2026-12-01T10:30:00.000Z",
				endsAt: "2026-12-01T11:30:00.000Z",
				allowOverbooking: true,
			},
		});

		assert.strictEqual(patchOkRes.statusCode, 200);

		// Проверяем в БД: время изменилось и isOverbooking стал true
		const [updatedDb] = await db
			.select()
			.from(appointments)
			.where(and(eq(appointments.id, appt2.id), eq(appointments.organizationId, ORG_ID)));
		assert.strictEqual(updatedDb.startsAt.toISOString(), "2026-12-01T10:30:00.000Z");
		assert.strictEqual(updatedDb.isOverbooking, true);
	});

	test("3. ACID status transitions: in_treatment creates visit, completed signs visit", async (t) => {
		if (!databaseAvailable) return t.skip("Database unavailable");

		// Создаем изолированный приём 3 (17:00 - 18:00)
		const createRes3 = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
				"content-type": "application/json",
				"idempotency-key": "idemp-dnd-3",
			},
			payload: {
				patientId: PATIENT_1_ID,
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				startsAt: "2026-12-01T17:00:00.000Z",
				endsAt: "2026-12-01T18:00:00.000Z",
				status: "planned",
				reason: "Профгигиена",
			},
		});
		assert.strictEqual(createRes3.statusCode, 201);
		const appt3 = JSON.parse(createRes3.body).appointment;

		// 1) Перевод в in_treatment
		const inTreatmentRes = await app.inject({
			method: "PATCH",
			url: `/api/appointments/${appt3.id}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
				"content-type": "application/json",
			},
			payload: {
				status: "in_treatment",
			},
		});
		assert.strictEqual(inTreatmentRes.statusCode, 200);

		// Проверяем, что визит атомарно создан в БД
		const [createdVisit] = await db
			.select()
			.from(visits)
			.where(and(eq(visits.appointmentId, appt3.id), eq(visits.organizationId, ORG_ID)));
		assert.ok(createdVisit, "Визит должен быть создан при переходе в in_treatment");
		assert.strictEqual(createdVisit.status, "draft");

		// 2) Перевод в completed
		const completedRes = await app.inject({
			method: "PATCH",
			url: `/api/appointments/${appt3.id}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
				"content-type": "application/json",
			},
			payload: {
				status: "completed",
			},
		});
		assert.strictEqual(completedRes.statusCode, 200);

		// Проверяем, что визит подписан (status: signed)
		const [signedVisit] = await db
			.select()
			.from(visits)
			.where(and(eq(visits.appointmentId, appt3.id), eq(visits.organizationId, ORG_ID)));
		assert.ok(signedVisit);
		assert.strictEqual(signedVisit.status, "signed");
	});

	test("5. Schedule clipboard paste: slot without patientId (patientId: null) succeeds for solo practice", async (t) => {
		if (!databaseAvailable) return t.skip("Database unavailable");

		// Создаем анонимный резервный слот без пациента (19:00 - 19:30)
		const createReserveRes = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
				"content-type": "application/json",
				"idempotency-key": "idemp-reserve-slot",
			},
			payload: {
				patientId: null,
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				startsAt: "2026-12-01T19:00:00.000Z",
				endsAt: "2026-12-01T19:30:00.000Z",
				status: "planned",
				reason: "Резерв окна",
			},
		});
		assert.strictEqual(createReserveRes.statusCode, 201);
		const reserveAppt = JSON.parse(createReserveRes.body).appointment;

		// Копируем в буфер обмена
		const copyRes = await app.inject({
			method: "POST",
			url: "/api/schedule/clipboard-items",
			headers: {
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
				"content-type": "application/json",
			},
			payload: {
				appointmentId: reserveAppt.id,
			},
		});
		assert.strictEqual(copyRes.statusCode, 201);
		const clipboardItem = JSON.parse(copyRes.body);

		// Вставляем из буфера на другое время (20:00 - 20:30) без patientId (должно пройти успешно!)
		const pasteRes = await app.inject({
			method: "POST",
			url: `/api/schedule/clipboard-items/${clipboardItem.id}/paste`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
				"content-type": "application/json",
			},
			payload: {
				startsAt: "2026-12-01T20:00:00.000Z",
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
			},
		});
		assert.strictEqual(pasteRes.statusCode, 201);
	});

	test("4. Doctor shifts routes security: unauthenticated requests are rejected and cannot mutate shifts", async (t) => {
		// Без авторизации GET
		const unauthGet = await app.inject({
			method: "GET",
			url: "/api/schedule/shifts",
		});
		assert.ok(unauthGet.statusCode === 401 || unauthGet.statusCode === 403);

		// Без авторизации POST
		const unauthPost = await app.inject({
			method: "POST",
			url: "/api/schedule/shifts",
			headers: { "content-type": "application/json" },
			payload: {
				replaceAll: true,
				shifts: [],
			},
		});
		assert.ok(unauthPost.statusCode === 401 || unauthPost.statusCode === 403);
	});
});
