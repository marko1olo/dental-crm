/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RED TEAM ACID CONCURRENCY & STRESS TEST SUITE: SCHEDULE SLOT LOCK
 * 4D Conflict Collision Prevention & Anti-Double-Booking Defense
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Clinical Context:
 * In a busy multi-chair clinic, reception administrators, doctors, and call-center
 * coordinators can attempt to book the exact same slot concurrently.
 * PostgreSQL 18 must enforce deterministic row-level locks (chairs, users, patients
 * ordered by UUID ASC) inside strict ACID transactions.
 *
 * Invariants:
 * 1. 15 concurrent bookings for the SAME DOCTOR at the SAME TIME:
 *    Exactly 1 request returns HTTP 201 Created, exactly 14 return HTTP 409 Conflict.
 * 2. 15 concurrent bookings for the SAME CHAIR at the SAME TIME (different doctors):
 *    Exactly 1 request returns HTTP 201 Created, exactly 14 return HTTP 409 Conflict.
 * 3. 15 concurrent bookings for the SAME PATIENT at the SAME TIME (different chairs/doctors):
 *    Exactly 1 request returns HTTP 201 Created, exactly 14 return HTTP 409 Conflict.
 * 4. 15 concurrent bookings for the SAME ASSISTANT at the SAME TIME:
 *    Exactly 1 request returns HTTP 201 Created, exactly 14 return HTTP 409 Conflict.
 * 5. PostgreSQL Database Census:
 *    Zero double bookings, zero orphaned appointments, exact record count in DB.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	organizations,
	patients,
	users,
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

const NAMESPACE = "schedSlotLockConc";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);

const DOCTOR_ALPHA_ID = fixtureUuid(NAMESPACE, 10);
const DOCTOR_BETA_ID = fixtureUuid(NAMESPACE, 11);

const ASSISTANT_ALPHA_ID = fixtureUuid(NAMESPACE, 20);
const ASSISTANT_BETA_ID = fixtureUuid(NAMESPACE, 21);

const CHAIR_SURGERY_ID = fixtureUuid(NAMESPACE, 30);
const CHAIR_THERAPY_ID = fixtureUuid(NAMESPACE, 31);

const PATIENT_ALPHA_ID = fixtureUuid(NAMESPACE, 40);
const PATIENT_BETA_ID = fixtureUuid(NAMESPACE, 41);
const PATIENT_IDS = Array.from({ length: 20 }, (_, i) => fixtureUuid(NAMESPACE, 50 + i));

const ADMIN_SECRET_HEADER = "x-dente-admin-secret";
const SECRET_VARIABLE = "DENTE_SCHEDULE_ADMIN_SECRET";

describe("RED TEAM: Schedule Slot Lock & 4D Collision Invariants (15-Thread Concurrency)", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let databaseAvailable = true;
	const adminSecret = randomBytes(24).toString("base64url");
	const savedSecret = process.env[SECRET_VARIABLE];

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_READS = "1";
		process.env[SECRET_VARIABLE] = adminSecret;

		app = createTenantTestApp();
		await registerScheduleRoutes(app);
		await app.ready();

		clinicToken = signToken(
			{ organizationId: ORG_ID, role: "owner", scope: "clinic" },
			authTokenSecret(),
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Клиника Стресс-Теста Расписания ACID",
					})
					.onConflictDoNothing();

				await tx
					.insert(clinics)
					.values({
						id: CLINIC_ID,
						organizationId: ORG_ID,
						name: "Филиал Стоматологии №1",
					})
					.onConflictDoNothing();

				await tx
					.insert(users)
					.values([
						{
							id: DOCTOR_ALPHA_ID,
							organizationId: ORG_ID,
							fullName: "Врач-Хирург Барабаш С.В.",
							role: "doctor",
							isActive: true,
						},
						{
							id: DOCTOR_BETA_ID,
							organizationId: ORG_ID,
							fullName: "Врач-Терапевт Смирнова Е.А.",
							role: "doctor",
							isActive: true,
						},
						{
							id: ASSISTANT_ALPHA_ID,
							organizationId: ORG_ID,
							fullName: "Ассистент Васильев К.И.",
							role: "assistant",
							isActive: true,
						},
						{
							id: ASSISTANT_BETA_ID,
							organizationId: ORG_ID,
							fullName: "Ассистент Николаева А.Д.",
							role: "assistant",
							isActive: true,
						},
					])
					.onConflictDoNothing();

				await tx
					.insert(chairs)
					.values([
						{
							id: CHAIR_SURGERY_ID,
							organizationId: ORG_ID,
							clinicId: CLINIC_ID,
							name: "Кресло 1 (Хирургия / Имплантация)",
							isActive: true,
						},
						{
							id: CHAIR_THERAPY_ID,
							organizationId: ORG_ID,
							clinicId: CLINIC_ID,
							name: "Кресло 2 (Терапия / Эндодонтия)",
							isActive: true,
						},
					])
					.onConflictDoNothing();

				await tx
					.insert(patients)
					.values([
						{
							id: PATIENT_ALPHA_ID,
							organizationId: ORG_ID,
							fullName: "Пациент Иванов Иван Иванович",
							phone: "+79997771122",
							status: "active",
						},
						{
							id: PATIENT_BETA_ID,
							organizationId: ORG_ID,
							fullName: "Пациентка Петрова Анна Сергеевна",
							phone: "+79997771123",
							status: "active",
						},
						...PATIENT_IDS.map((pid, idx) => ({
							id: pid,
							organizationId: ORG_ID,
							fullName: `Тестовый Пациент #${idx + 1}`,
							phone: `+799977712${String(idx).padStart(2, "0")}`,
							status: "active" as const,
						})),
					])
					.onConflictDoNothing();
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		await app?.close();
		if (savedSecret === undefined) delete process.env[SECRET_VARIABLE];
		else process.env[SECRET_VARIABLE] = savedSecret;

		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	async function injectCreateAppointment(payload: {
		patientId: string;
		doctorUserId: string;
		chairId: string;
		assistantUserId?: string;
		startsAt: string;
		endsAt: string;
		reason?: string;
	}) {
		return app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
			},
			payload: {
				status: "planned",
				reason: payload.reason ?? "Клинический приём",
				...payload,
			},
		});
	}

	it("1.1 Doctor Slot Lock: 15 concurrent bookings for Doctor Alpha yield exactly 1 x 201 Created, 14 x 409 Conflict", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2029-01-15T09:00:00.000Z";
		const endsAt = "2029-01-15T09:45:00.000Z";
		const concurrencyCount = 15;

		// 15 simultaneous requests attempting to book Doctor Alpha at the exact same time
		const requests = Array.from({ length: concurrencyCount }, (_, idx) =>
			injectCreateAppointment({
				doctorUserId: DOCTOR_ALPHA_ID,
				chairId: idx % 2 === 0 ? CHAIR_SURGERY_ID : CHAIR_THERAPY_ID,
				patientId: PATIENT_IDS[idx]!,
				startsAt,
				endsAt,
				reason: `Конкурентная запись #${idx + 1}`,
			}),
		);

		const responses = await Promise.all(requests);

		const created = responses.filter((r) => r.statusCode === 201);
		const conflicts = responses.filter((r) => r.statusCode === 409);

		assert.equal(
			created.length,
			1,
			`Ровно 1 запрос на запись к врачу должен завершиться 201 Created. Получено: ${created.length}`,
		);
		assert.equal(
			conflicts.length,
			concurrencyCount - 1,
			`Ровно ${concurrencyCount - 1} запросов обязаны получить детерминированный 409 Conflict. Получено: ${conflicts.length}`,
		);

		for (const conf of conflicts) {
			const body = conf.json() as { code: string; message: string; reason: string };
			assert.equal(body.code, "AppointmentCreateRejected");
			assert.equal(body.reason, "resource_overlap");
			assert.match(body.message, /У врача уже есть запись в это время/i);
		}

		// Verify database state: strictly 1 appointment in DB for Doctor Alpha in this interval
		const dbAppointments = await withFixtureTenant(ORG_ID, async (tx) => {
			return await tx
				.select()
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, ORG_ID),
						eq(appointments.doctorUserId, DOCTOR_ALPHA_ID),
						eq(appointments.startsAt, new Date(startsAt)),
					),
				);
		});

		assert.equal(
			dbAppointments.length,
			1,
			"В базе данных PostgreSQL создана строго 1 запись для врача без дублей",
		);
	});

	it("1.2 Chair Slot Lock: 15 concurrent bookings for Surgery Chair yield exactly 1 x 201 Created, 14 x 409 Conflict", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2029-01-15T10:00:00.000Z";
		const endsAt = "2029-01-15T10:45:00.000Z";
		const concurrencyCount = 15;

		// 15 simultaneous requests attempting to book Surgery Chair across different doctors/patients
		const requests = Array.from({ length: concurrencyCount }, (_, idx) =>
			injectCreateAppointment({
				doctorUserId: idx % 2 === 0 ? DOCTOR_ALPHA_ID : DOCTOR_BETA_ID,
				chairId: CHAIR_SURGERY_ID,
				patientId: PATIENT_IDS[idx]!,
				startsAt,
				endsAt,
				reason: `Гонка за кресло #${idx + 1}`,
			}),
		);

		const responses = await Promise.all(requests);

		const created = responses.filter((r) => r.statusCode === 201);
		const conflicts = responses.filter((r) => r.statusCode === 409);

		assert.equal(
			created.length,
			1,
			`Ровно 1 запрос на бронирование кресла должен пройти (201). Получено: ${created.length}`,
		);
		assert.equal(
			conflicts.length,
			concurrencyCount - 1,
			`Все конкурирующие ${concurrencyCount - 1} запросов должны получить 409 Conflict`,
		);

		for (const conf of conflicts) {
			const body = conf.json() as { code: string; message: string; reason: string };
			assert.equal(body.code, "AppointmentCreateRejected");
			assert.equal(body.reason, "resource_overlap");
			assert.match(
				body.message,
				/(Кресло уже занято другой записью в это время|У врача уже есть запись в это время|У пациента уже есть запись в это время)/i,
			);
		}

		// Verify database state: strictly 1 appointment in DB for Surgery Chair in this interval
		const dbAppointments = await withFixtureTenant(ORG_ID, async (tx) => {
			return await tx
				.select()
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, ORG_ID),
						eq(appointments.chairId, CHAIR_SURGERY_ID),
						eq(appointments.startsAt, new Date(startsAt)),
					),
				);
		});

		assert.equal(
			dbAppointments.length,
			1,
			"В базе данных PostgreSQL создана строго 1 запись для кресла без дублей",
		);
	});

	it("1.3 Patient Collision Defense: 15 concurrent bookings for Patient Beta yield exactly 1 x 201 Created, 14 x 409 Conflict", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2029-01-15T11:00:00.000Z";
		const endsAt = "2029-01-15T11:45:00.000Z";
		const concurrencyCount = 15;

		// 15 simultaneous requests attempting to book Patient Beta simultaneously in different chairs/doctors
		const requests = Array.from({ length: concurrencyCount }, (_, idx) =>
			injectCreateAppointment({
				doctorUserId: idx % 2 === 0 ? DOCTOR_ALPHA_ID : DOCTOR_BETA_ID,
				chairId: idx % 2 === 0 ? CHAIR_SURGERY_ID : CHAIR_THERAPY_ID,
				patientId: PATIENT_BETA_ID,
				startsAt,
				endsAt,
				reason: `Гонка за пациента #${idx + 1}`,
			}),
		);

		const responses = await Promise.all(requests);

		const created = responses.filter((r) => r.statusCode === 201);
		const conflicts = responses.filter((r) => r.statusCode === 409);

		assert.equal(
			created.length,
			1,
			`Ровно 1 запись для пациента должна быть создана (201). Получено: ${created.length}`,
		);
		assert.equal(
			conflicts.length,
			concurrencyCount - 1,
			`Все конкурирующие ${concurrencyCount - 1} запросов должны получить 409 Conflict`,
		);

		for (const conf of conflicts) {
			const body = conf.json() as { code: string; message: string; reason: string };
			assert.equal(body.code, "AppointmentCreateRejected");
			assert.equal(body.reason, "resource_overlap");
			assert.match(
				body.message,
				/(У пациента уже есть запись в это время|У врача уже есть запись в это время|Кресло уже занято другой записью в это время)/i,
			);
		}

		// Verify database state: strictly 1 appointment in DB for Patient Beta in this interval
		const dbAppointments = await withFixtureTenant(ORG_ID, async (tx) => {
			return await tx
				.select()
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, ORG_ID),
						eq(appointments.patientId, PATIENT_BETA_ID),
						eq(appointments.startsAt, new Date(startsAt)),
					),
				);
		});

		assert.equal(
			dbAppointments.length,
			1,
			"В базе данных PostgreSQL создана строго 1 запись для пациента (Zero Double-Booking)",
		);
	});

	it("1.4 Assistant Collision Defense: 15 concurrent bookings for Assistant Alpha yield exactly 1 x 201, 14 x 409", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2029-01-15T14:00:00.000Z";
		const endsAt = "2029-01-15T14:45:00.000Z";
		const concurrencyCount = 15;

		const requests = Array.from({ length: concurrencyCount }, (_, idx) =>
			injectCreateAppointment({
				doctorUserId: idx % 2 === 0 ? DOCTOR_ALPHA_ID : DOCTOR_BETA_ID,
				chairId: idx % 2 === 0 ? CHAIR_SURGERY_ID : CHAIR_THERAPY_ID,
				assistantUserId: ASSISTANT_ALPHA_ID,
				patientId: PATIENT_IDS[idx]!,
				startsAt,
				endsAt,
				reason: `Гонка за ассистента #${idx + 1}`,
			}),
		);

		const responses = await Promise.all(requests);

		const created = responses.filter((r) => r.statusCode === 201);
		const conflicts = responses.filter((r) => r.statusCode === 409);

		assert.equal(created.length, 1, "Ровно 1 запись с ассистентом Альфа успешна (201)");
		assert.equal(conflicts.length, concurrencyCount - 1, "Остальные 14 запросов отклонены (409 Conflict)");

		const dbAppointments = await withFixtureTenant(ORG_ID, async (tx) => {
			return await tx
				.select()
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, ORG_ID),
						eq(appointments.assistantUserId, ASSISTANT_ALPHA_ID),
						eq(appointments.startsAt, new Date(startsAt)),
					),
				);
		});

		assert.equal(dbAppointments.length, 1, "В БД ровно 1 запись с ассистентом");
	});
});
