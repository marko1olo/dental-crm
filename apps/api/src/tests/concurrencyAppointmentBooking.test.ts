/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASTIFY CONCURRENCY AUDIT: APPOINTMENT BOOKING CONFLICT & RACE CONDITION SUITE
 * Mandate 8n, 8e: Zero Double-Booking, Deterministic 409 Conflict, Suggested Slots
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	organizations,
	patients,
	users,
} from "../db/schema.js";
import { registerAppointmentsRoutes } from "../routes/appointments/appointmentsMutationRoutes.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "concurrencyAppointmentBooking";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_1_ID = fixtureUuid(NAMESPACE, 3);
const DOCTOR_2_ID = fixtureUuid(NAMESPACE, 4);
const CHAIR_1_ID = fixtureUuid(NAMESPACE, 5);
const CHAIR_2_ID = fixtureUuid(NAMESPACE, 6);
const PATIENT_1_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_2_ID = fixtureUuid(NAMESPACE, 11);
const PATIENT_3_ID = fixtureUuid(NAMESPACE, 12);

describe("Fastify Concurrency: Appointment Booking Slot Lock & Anti-Double-Booking", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		await purgeFixtureOrganizations([ORG_ID]);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Клиника Конкурентного Расписания Fastify",
				})
				.onConflictDoNothing();

			await tx
				.insert(clinics)
				.values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Главное Отделение",
					timezone: "Europe/Moscow",
				})
				.onConflictDoNothing();

			await tx
				.insert(users)
				.values([
					{
						id: DOCTOR_1_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Стресс-Тестов 1",
						role: "doctor",
						isActive: true,
					},
					{
						id: DOCTOR_2_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Стресс-Тестов 2",
						role: "doctor",
						isActive: true,
					},
				])
				.onConflictDoNothing();

			await tx
				.insert(chairs)
				.values([
					{
						id: CHAIR_1_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло 1 (Хирургия)",
						isActive: true,
					},
					{
						id: CHAIR_2_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло 2 (Терапия)",
						isActive: true,
					},
				])
				.onConflictDoNothing();

			await tx
				.insert(patients)
				.values([
					{
						id: PATIENT_1_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Альфа",
						phone: "+79990000001",
						status: "active",
					},
					{
						id: PATIENT_2_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Бета",
						phone: "+79990000002",
						status: "active",
					},
					{
						id: PATIENT_3_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Гамма",
						phone: "+79990000003",
						status: "active",
					},
				])
				.onConflictDoNothing();
		});

		app = createTenantTestApp();
		await registerAppointmentsRoutes(app);
		await app.ready();

		clinicToken = signToken(
			{
				organizationId: ORG_ID,
				role: "owner",
				scope: "clinic",
			},
			authTokenSecret(),
		);

		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: DOCTOR_1_ID,
				role: "admin",
				scope: "staff",
				permissions: [
					"schedule.write",
					"schedule.read",
					"appointments.write",
					"appointments.read",
					"patients.read",
				],
			},
			authTokenSecret(),
		);
	});

	after(async () => {
		await app.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	test("1. Two concurrent requests to book identical slot: exactly 1 wins (201 Created), 1 receives structured 409 Conflict", async () => {
		const startsAt = "2026-11-20T10:00:00.000Z";
		const endsAt = "2026-11-20T10:30:00.000Z";

		const [resA, resB] = await Promise.all([
			app.inject({
				method: "POST",
				url: "/api/appointments",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					patientId: PATIENT_1_ID,
					doctorUserId: DOCTOR_1_ID,
					chairId: CHAIR_1_ID,
					startsAt,
					endsAt,
					status: "planned",
					reason: "Консультация ортопеда А",
				},
			}),
			app.inject({
				method: "POST",
				url: "/api/appointments",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					patientId: PATIENT_2_ID,
					doctorUserId: DOCTOR_1_ID,
					chairId: CHAIR_1_ID,
					startsAt,
					endsAt,
					status: "planned",
					reason: "Консультация ортопеда Б",
				},
			}),
		]);

		const statusCodes = [resA.statusCode, resB.statusCode].sort((a, b) => a - b);
		assert.deepEqual(
			statusCodes,
			[201, 409],
			"Ровно один запрос обязан вернуть 201 Created, а второй — 409 Conflict",
		);

		const conflictRes = resA.statusCode === 409 ? resA : resB;
		const conflictBody = JSON.parse(conflictRes.body);

		assert.equal(conflictBody.code, "AppointmentCreateRejected");
		assert.equal(conflictBody.reason, "resource_overlap");
		assert.equal(conflictBody.collisionCode, "CHAIR_OVERBOOKING_COLLISION");
		assert.equal(conflictBody.error, "SlotConflict");
		assert.ok(
			Array.isArray(conflictBody.suggestedSlots),
			"Конфликтный ответ обязан содержать массив альтернативных окон suggestedSlots",
		);

		const dbAppointments = await db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ORG_ID),
					eq(appointments.chairId, CHAIR_1_ID),
					eq(appointments.startsAt, new Date(startsAt)),
				),
			);

		assert.equal(
			dbAppointments.length,
			1,
			"В базе данных должна существовать ровно 1 запись на этот интервал (Zero Double-Booking)",
		);
	});

	test("2. High-concurrency storm: 10 parallel booking attempts for the same chair and doctor slot", async () => {
		const startsAt = "2026-11-20T11:00:00.000Z";
		const endsAt = "2026-11-20T11:45:00.000Z";

		const responses = await Promise.all(
			Array.from({ length: 10 }, (_, idx) =>
				app.inject({
					method: "POST",
					url: "/api/appointments",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: {
						patientId: idx % 2 === 0 ? PATIENT_1_ID : PATIENT_2_ID,
						doctorUserId: DOCTOR_1_ID,
						chairId: CHAIR_1_ID,
						startsAt,
						endsAt,
						status: "planned",
						reason: `Параллельная запись #${idx + 1}`,
					},
				}),
			),
		);

		const created = responses.filter((r) => r.statusCode === 201);
		const conflicts = responses.filter((r) => r.statusCode === 409);

		assert.equal(
			created.length,
			1,
			"Из 10 параллельных запросов на один слот ровно 1 обязан успешно создаться (201 Created)",
		);
		assert.equal(
			conflicts.length,
			9,
			"Остальные 9 запросов обязаны получить детерминированный отказ 409 Conflict",
		);

		for (const conf of conflicts) {
			const body = JSON.parse(conf.body);
			assert.equal(body.code, "AppointmentCreateRejected");
			assert.equal(body.reason, "resource_overlap");
			assert.equal(body.collisionCode, "CHAIR_OVERBOOKING_COLLISION");
		}

		const slotAppointments = await db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ORG_ID),
					eq(appointments.chairId, CHAIR_1_ID),
					eq(appointments.startsAt, new Date(startsAt)),
				),
			);

		assert.equal(
			slotAppointments.length,
			1,
			"В базе данных гарантированно создана ровно 1 запись (Zero Phantom Appointments)",
		);
	});

	test("3. Doctor overlap guard: same doctor cannot be booked simultaneously in two different chairs", async () => {
		const startsAt = "2026-11-20T14:00:00.000Z";
		const endsAt = "2026-11-20T14:30:00.000Z";

		const [resChair1, resChair2] = await Promise.all([
			app.inject({
				method: "POST",
				url: "/api/appointments",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					patientId: PATIENT_1_ID,
					doctorUserId: DOCTOR_1_ID,
					chairId: CHAIR_1_ID,
					startsAt,
					endsAt,
					status: "planned",
					reason: "Приём у доктора 1 в кресле 1",
				},
			}),
			app.inject({
				method: "POST",
				url: "/api/appointments",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					patientId: PATIENT_2_ID,
					doctorUserId: DOCTOR_1_ID,
					chairId: CHAIR_2_ID, // Другое кресло, но тот же врач!
					startsAt,
					endsAt,
					status: "planned",
					reason: "Приём у доктора 1 в кресле 2",
				},
			}),
		]);

		const statusCodes = [resChair1.statusCode, resChair2.statusCode].sort((a, b) => a - b);
		assert.deepEqual(
			statusCodes,
			[201, 409],
			"Врач не может быть записан в два разных кресла одновременно",
		);

		const conflictRes = resChair1.statusCode === 409 ? resChair1 : resChair2;
		const conflictBody = JSON.parse(conflictRes.body);
		assert.equal(conflictBody.reason, "resource_overlap");
		assert.match(conflictBody.message, /врач/i);
	});

	test("4. Non-overlapping concurrency: 4 parallel requests on distinct slots and chairs succeed (201 Created)", async () => {
		const slotTimes = [
			{ startsAt: "2026-11-20T15:00:00.000Z", endsAt: "2026-11-20T15:30:00.000Z", chairId: CHAIR_1_ID, doctorId: DOCTOR_1_ID, patientId: PATIENT_1_ID },
			{ startsAt: "2026-11-20T15:30:00.000Z", endsAt: "2026-11-20T16:00:00.000Z", chairId: CHAIR_1_ID, doctorId: DOCTOR_1_ID, patientId: PATIENT_2_ID },
			{ startsAt: "2026-11-20T15:00:00.000Z", endsAt: "2026-11-20T15:30:00.000Z", chairId: CHAIR_2_ID, doctorId: DOCTOR_2_ID, patientId: PATIENT_3_ID },
			{ startsAt: "2026-11-20T15:30:00.000Z", endsAt: "2026-11-20T16:00:00.000Z", chairId: CHAIR_2_ID, doctorId: DOCTOR_2_ID, patientId: PATIENT_1_ID },
		];

		const responses = await Promise.all(
			slotTimes.map((s, idx) =>
				app.inject({
					method: "POST",
					url: "/api/appointments",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: {
						patientId: s.patientId,
						doctorUserId: s.doctorId,
						chairId: s.chairId,
						startsAt: s.startsAt,
						endsAt: s.endsAt,
						status: "planned",
						reason: `Свободный слот #${idx + 1}`,
					},
				}),
			),
		);

		for (const r of responses) {
			assert.equal(r.statusCode, 201, `Слот без наложений обязан успешно создаться (201 Created): ${r.body}`);
		}
	});
});
