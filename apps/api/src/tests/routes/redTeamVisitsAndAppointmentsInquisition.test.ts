/**
 * redTeamVisitsAndAppointmentsInquisition.test.ts
 *
 * RED TEAM ИНКВИЗИЦИЯ МАРШРУТОВ ПРИЁМОВ (VISITS), РАСПИСАНИЯ (APPOINTMENTS) И КАРТ (PATIENTS)
 *
 * Аудит защищённости и целостности контрактов:
 * 1. Инъекции и отказ от парсинга невалидных UUID параметров (возврат 400/404 без SQL-утечек 500);
 * 2. Аутентификационный барьер токена кабинета (401 AuthRequired без утечки бизнес-состояния);
 * 3. Полный жизненный цикл визита (open -> draft -> complete -> idempotent re-complete);
 * 4. Идемпотентность повторного открытия визита;
 * 5. Железная изоляция арендаторов (Tenant Isolation / RLS) между Клиникой А и Клиникой Б.
 */

import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { appointments, clinics, organizations, patients, users, visits } from "../../db/schema.js";
import { registerAppointmentsRoutes } from "../../routes/appointments.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { TOKEN_SECRET } from "../../routes/auth.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "redteam-visits-inquisition";

const ORG_A = fixtureUuid(NAMESPACE, 1);
const ORG_B = fixtureUuid(NAMESPACE, 2);
const CLINIC_A = fixtureUuid(NAMESPACE, 3);
const CLINIC_B = fixtureUuid(NAMESPACE, 4);

const DOCTOR_A = fixtureUuid(NAMESPACE, 5);
const DOCTOR_B = fixtureUuid(NAMESPACE, 6);

const PATIENT_A = fixtureUuid(NAMESPACE, 10);
const PATIENT_B = fixtureUuid(NAMESPACE, 11);

const APPT_A = fixtureUuid(NAMESPACE, 20);
const APPT_B = fixtureUuid(NAMESPACE, 21);
const APPT_CLOSED = fixtureUuid(NAMESPACE, 22);

const visitResponseSchema = z.object({
	visit: z.object({
		id: z.string().uuid(),
		appointmentId: z.string().uuid().nullable().optional(),
		patientId: z.string().uuid(),
		organizationId: z.string().uuid(),
		status: z.string(),
	}),
});

test("RED-TEAM HAMMER: Visits & Appointments Route Inquisition", async (suite) => {
	let app: FastifyInstance;
	let tokenClinicA: string;
	let tokenClinicB: string;
	let databaseReady = false;

	const savedEnv = {
		allowUnguardedMutations: process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS,
		allowUnguardedReads: process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS,
		persistence: process.env.DENTAL_STATE_PERSISTENCE,
	};

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		delete process.env.DENTAL_STATE_PERSISTENCE;

		try {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);
		} catch (e) {
			console.warn("[RedTeam Visits Before] Purge warning:", e);
		}

		app = createTenantTestApp();
		await registerVisitRoutes(app);
		await registerAppointmentsRoutes(app);
		await registerPatientRoutes(app);
		await app.ready();

		const secret = TOKEN_SECRET();
		tokenClinicA = signToken({ organizationId: ORG_A, clinicId: CLINIC_A, type: "clinic" }, secret);
		tokenClinicB = signToken({ organizationId: ORG_B, clinicId: CLINIC_B, type: "clinic" }, secret);

		try {
			await withFixtureTenant(ORG_A, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_A,
					name: "Клиника Инквизиции А",
					inn: "7709999881",
					kpp: "770901001",
					ogrn: "1237700999881",
				}).onConflictDoNothing();

				await tx.insert(clinics).values({
					id: CLINIC_A,
					organizationId: ORG_A,
					name: "Отделение А",
					address: "г. Москва, ул. Клиническая, д. 1",
					phone: "+74959998801",
				}).onConflictDoNothing();

				await tx.insert(users).values({
					id: DOCTOR_A,
					organizationId: ORG_A,
					role: "doctor",
					fullName: "Д-р Инквизитор А",
				}).onConflictDoNothing();

				await tx.insert(patients).values({
					id: PATIENT_A,
					organizationId: ORG_A,
					fullName: "Пациент Клиники А",
					birthDate: "1985-05-15",
					phone: "+79991118801",
					status: "active",
				}).onConflictDoNothing();

				await tx.insert(appointments).values([
					{
						id: APPT_A,
						organizationId: ORG_A,
						patientId: PATIENT_A,
						doctorUserId: DOCTOR_A,
						startsAt: new Date("2026-10-01T10:00:00.000Z"),
						endsAt: new Date("2026-10-01T11:00:00.000Z"),
						status: "confirmed",
					},
					{
						id: APPT_CLOSED,
						organizationId: ORG_A,
						patientId: PATIENT_A,
						doctorUserId: DOCTOR_A,
						startsAt: new Date("2026-10-01T12:00:00.000Z"),
						endsAt: new Date("2026-10-01T13:00:00.000Z"),
						status: "cancelled",
					},
				]).onConflictDoNothing();
			});

			await withFixtureTenant(ORG_B, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_B,
					name: "Клиника Инквизиции Б",
					inn: "7709999882",
					kpp: "770901001",
					ogrn: "1237700999882",
				}).onConflictDoNothing();

				await tx.insert(clinics).values({
					id: CLINIC_B,
					organizationId: ORG_B,
					name: "Отделение Б",
					address: "г. Москва, ул. Клиническая, д. 2",
					phone: "+74959998802",
				}).onConflictDoNothing();

				await tx.insert(users).values({
					id: DOCTOR_B,
					organizationId: ORG_B,
					role: "doctor",
					fullName: "Д-р Инквизитор Б",
				}).onConflictDoNothing();

				await tx.insert(patients).values({
					id: PATIENT_B,
					organizationId: ORG_B,
					fullName: "Пациент Клиники Б",
					birthDate: "1989-09-09",
					phone: "+79991118802",
					status: "active",
				}).onConflictDoNothing();

				await tx.insert(appointments).values({
					id: APPT_B,
					organizationId: ORG_B,
					patientId: PATIENT_B,
					doctorUserId: DOCTOR_B,
					startsAt: new Date("2026-10-01T14:00:00.000Z"),
					endsAt: new Date("2026-10-01T15:00:00.000Z"),
					status: "confirmed",
				}).onConflictDoNothing();
			});

			databaseReady = true;
		} catch (e) {
			if (!isDatabaseUnavailable(e)) throw e;
		}
	});

	after(async () => {
		if (app) await app.close();
		if (savedEnv.allowUnguardedMutations !== undefined) {
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = savedEnv.allowUnguardedMutations;
		} else {
			delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
		}
		if (savedEnv.allowUnguardedReads !== undefined) {
			process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = savedEnv.allowUnguardedReads;
		} else {
			delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		}
		if (savedEnv.persistence !== undefined) {
			process.env.DENTAL_STATE_PERSISTENCE = savedEnv.persistence;
		} else {
			delete process.env.DENTAL_STATE_PERSISTENCE;
		}

		try {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);
		} catch (e) {
			console.warn("[RedTeam Visits Cleanup] Purge warning:", e);
		}
	});

	// =========================================================================
	// РАЗДЕЛ 1: ЗАЩИТА ОТ НЕВАЛИДНЫХ UUID И SQL-ИНЪЕКЦИЙ (400/404 ВМЕСТО 500)
	// =========================================================================
	await suite.test("1.1. GET /api/appointments/:id/visit с невалидным UUID отдаёт 400 без утечки SQL", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/appointments/not-a-valid-uuid-123/visit",
			headers: { "x-dente-clinic-token": tokenClinicA },
		});

		assert.equal(res.statusCode, 400, "Ожидается 400 VisitValidationError");
		const body = JSON.parse(res.body);
		assert.equal(body.error, "VisitValidationError");
		assert.ok(!res.body.includes("syntax error"), "SQL-синтаксис не должен утекать");
	});

	await suite.test("1.2. POST /api/appointments/:id/visit с невалидным UUID отдаёт 400 без 500", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/appointments/malformed-appointment-id/visit",
			headers: { "x-dente-clinic-token": tokenClinicA },
		});

		assert.equal(res.statusCode, 400, "Ожидается 400 VisitValidationError");
		const body = JSON.parse(res.body);
		assert.equal(body.error, "VisitValidationError");
	});

	await suite.test("1.3. POST /api/visits/:visitId/complete с невалидным UUID отдаёт 404, а не 409/500", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/visits/not-a-valid-visit-uuid/complete",
			headers: { "x-dente-clinic-token": tokenClinicA },
		});

		assert.equal(res.statusCode, 404, "Ожидается 404 VisitNotFound");
		const body = JSON.parse(res.body);
		assert.equal(body.error, "VisitNotFound");
	});

	await suite.test("1.4. GET /api/appointments/:appointmentId с невалидным UUID отдаёт 400", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/appointments/invalid-appt-id",
			headers: { "x-dente-clinic-token": tokenClinicA },
		});

		assert.equal(res.statusCode, 400, "Ожидается 400 AppointmentValidationError");
		const body = JSON.parse(res.body);
		assert.equal(body.code, "AppointmentValidationError");
	});

	await suite.test("1.5. PATCH /api/appointments/:appointmentId с невалидным UUID отдаёт 400", async () => {
		const res = await app.inject({
			method: "PATCH",
			url: "/api/appointments/invalid-appt-id",
			headers: { "x-dente-clinic-token": tokenClinicA },
			payload: { status: "in_treatment" },
		});

		assert.equal(res.statusCode, 400, "Ожидается 400 AppointmentValidationError");
		const body = JSON.parse(res.body);
		assert.equal(body.code, "AppointmentValidationError");
	});

	// =========================================================================
	// РАЗДЕЛ 2: АУТЕНТИФИКАЦИОННЫЙ БАРЬЕР (401 AuthRequired)
	// =========================================================================
	await suite.test("2.1. GET /api/appointments/:id/visit без токена отдаёт 401", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/appointments/${APPT_A}/visit`,
		});
		assert.equal(res.statusCode, 401);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "AuthRequired");
	});

	await suite.test("2.2. POST /api/appointments/:id/visit без токена отдаёт 401", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/appointments/${APPT_A}/visit`,
		});
		assert.equal(res.statusCode, 401);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "AuthRequired");
	});

	await suite.test("2.3. POST /api/visits/:visitId/complete без токена отдаёт 401", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/visits/${fixtureUuid(NAMESPACE, 99)}/complete`,
		});
		assert.equal(res.statusCode, 401);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "AuthRequired");
	});

	// =========================================================================
	// РАЗДЕЛ 3: БОЕВОЙ ЖИЗНЕННЫЙ ЦИКЛ, ИДЕМПОТЕНТНОСТЬ И ИЗОЛЯЦИЯ АРЕНДАТОРОВ
	// =========================================================================
	let createdVisitId: string;

	await suite.test("3.1. Клиника А успешно открывает черновик приёма для своей записи", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/appointments/${APPT_A}/visit`,
			headers: { "x-dente-clinic-token": tokenClinicA },
		});

		assert.ok(res.statusCode === 200 || res.statusCode === 201, `Ожидался статус 200 или 201, получен ${res.statusCode}: ${res.body}`);
		const body = JSON.parse(res.body);
		const parsed = visitResponseSchema.parse(body);
		assert.equal(parsed.visit.organizationId, ORG_A);
		assert.equal(parsed.visit.patientId, PATIENT_A);
		assert.equal(parsed.visit.status, "draft");
		createdVisitId = parsed.visit.id;
	});

	await suite.test("3.2. Повторное открытие визита (POST) идемпотентно возвращает существующий черновик", async (t) => {
		if (!databaseReady || !createdVisitId) return t.skip("База данных недоступна или визит не создан");

		const res = await app.inject({
			method: "POST",
			url: `/api/appointments/${APPT_A}/visit`,
			headers: { "x-dente-clinic-token": tokenClinicA },
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		const parsed = visitResponseSchema.parse(body);
		assert.equal(parsed.visit.id, createdVisitId, "Идемпотентный вызов должен возвращать тот же ID визита");
	});

	await suite.test("3.3. GET /api/appointments/:id/visit возвращает созданный визит", async (t) => {
		if (!databaseReady || !createdVisitId) return t.skip("База данных недоступна или визит не создан");

		const res = await app.inject({
			method: "GET",
			url: `/api/appointments/${APPT_A}/visit`,
			headers: { "x-dente-clinic-token": tokenClinicA },
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		const parsed = visitResponseSchema.parse(body);
		assert.equal(parsed.visit.id, createdVisitId);
	});

	await suite.test("3.4. ИЗОЛЯЦИЯ АРЕНДАТОРОВ: Клиника Б не видит визит Клиники А (visit: null) и получает 404 на приём", async (t) => {
		if (!databaseReady || !createdVisitId) return t.skip("База данных недоступна");

		const visitRes = await app.inject({
			method: "GET",
			url: `/api/appointments/${APPT_A}/visit`,
			headers: { "x-dente-clinic-token": tokenClinicB },
		});

		assert.equal(visitRes.statusCode, 200);
		const visitBody = JSON.parse(visitRes.body);
		assert.equal(visitBody.visit, null, "Чужая клиника не должна иметь доступа к визиту другого арендатора");

		const apptRes = await app.inject({
			method: "GET",
			url: `/api/appointments/${APPT_A}`,
			headers: { "x-dente-clinic-token": tokenClinicB },
		});
		assert.equal(apptRes.statusCode, 404, "Чужая клиника не должна иметь доступа к записи другого арендатора");
	});

	await suite.test("3.5. ИЗОЛЯЦИЯ АРЕНДАТОРОВ: Клиника Б не может закрыть визит Клиники А (возврат 404)", async (t) => {
		if (!databaseReady || !createdVisitId) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/visits/${createdVisitId}/complete`,
			headers: { "x-dente-clinic-token": tokenClinicB },
		});

		assert.equal(res.statusCode, 404, "Завершение чужого визита должно быть заблокировано с 404");
	});

	await suite.test("3.6. Попытка открыть визит для отменённой записи отдаёт 409 AppointmentClosed", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/appointments/${APPT_CLOSED}/visit`,
			headers: { "x-dente-clinic-token": tokenClinicA },
		});

		assert.equal(res.statusCode, 409, "Запись уже отменена, приём не открывается");
		const body = JSON.parse(res.body);
		assert.equal(body.error, "AppointmentClosed");
	});

	await suite.test("3.7. Клиника А успешно закрывает (complete) свой черновик визита", async (t) => {
		if (!databaseReady || !createdVisitId) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/visits/${createdVisitId}/complete`,
			headers: { "x-dente-clinic-token": tokenClinicA },
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.ok, true);
		assert.equal(body.status, "completed");
		assert.ok(body.visit);
		assert.equal(body.visit.id, createdVisitId);
		assert.equal(body.visit.status, "signed");
	});

	await suite.test("3.8. Повторное завершение уже подписанного визита идемпотентно успешно (alreadySigned)", async (t) => {
		if (!databaseReady || !createdVisitId) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/visits/${createdVisitId}/complete`,
			headers: { "x-dente-clinic-token": tokenClinicA },
		});

		assert.equal(res.statusCode, 200, "Идемпотентный complete возвращает 200");
		const body = JSON.parse(res.body);
		assert.equal(body.ok, true);
		assert.equal(body.alreadySigned, true);
	});

	await suite.test("3.9. Попытка автосейва подписанного визита отклоняется с 409 visit_closed", async (t) => {
		if (!databaseReady || !createdVisitId) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "PUT",
			url: `/api/visits/${createdVisitId}/draft/autosave`,
			headers: { "x-dente-clinic-token": tokenClinicA },
			payload: {
				patientId: PATIENT_A,
				selectedSpecialty: "therapist",
				text: "Попытка изменить подписанный приём",
				draft: {
					complaint: "боль",
					anamnesis: null,
					objectiveStatus: null,
					examination: null,
					diagnosis: null,
					treatment: null,
					treatmentPlan: null,
					recommendations: null,
					warnings: [],
				},
			},
		});

		assert.equal(res.statusCode, 409, "Подписанный визит заблокирован для изменений черновика");
		const body = JSON.parse(res.body);
		assert.equal(body.error, "VisitDraftMutationRejected");
		assert.equal(body.reason, "visit_closed");
	});
});
