import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
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

const NAMESPACE = "scheduleConcurrencyRace";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);

const DOCTOR_1_ID = fixtureUuid(NAMESPACE, 10);
const DOCTOR_2_ID = fixtureUuid(NAMESPACE, 11);

const ASSISTANT_1_ID = fixtureUuid(NAMESPACE, 20);
const ASSISTANT_2_ID = fixtureUuid(NAMESPACE, 21);

const CHAIR_1_ID = fixtureUuid(NAMESPACE, 30);
const CHAIR_2_ID = fixtureUuid(NAMESPACE, 31);

const PATIENT_1_ID = fixtureUuid(NAMESPACE, 40);
const PATIENT_2_ID = fixtureUuid(NAMESPACE, 41);

const ADMIN_SECRET_HEADER = "x-dente-admin-secret";
const SECRET_VARIABLE = "DENTE_SCHEDULE_ADMIN_SECRET";

describe("Schedule Concurrency Race & 4D Collision Prevention", () => {
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
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника конкурентного расписания",
				});
				await tx.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Главный филиал",
				});
				await tx.insert(users).values([
					{
						id: DOCTOR_1_ID,
						organizationId: ORG_ID,
						fullName: "Врач Гончаров Андрей",
						role: "doctor",
						isActive: true,
					},
					{
						id: DOCTOR_2_ID,
						organizationId: ORG_ID,
						fullName: "Врач Соколова Елена",
						role: "doctor",
						isActive: true,
					},
					{
						id: ASSISTANT_1_ID,
						organizationId: ORG_ID,
						fullName: "Ассистент Белов Максим",
						role: "assistant",
						isActive: true,
					},
					{
						id: ASSISTANT_2_ID,
						organizationId: ORG_ID,
						fullName: "Ассистент Орлова Ольга",
						role: "assistant",
						isActive: true,
					},
				]);
				await tx.insert(chairs).values([
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
				]);
				await tx.insert(patients).values([
					{
						id: PATIENT_1_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Кузнецов Игорь",
						status: "active",
					},
					{
						id: PATIENT_2_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Морозова Анна",
						status: "active",
					},
				]);
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

	async function makeCreateRequest(payload: {
		patientId: string;
		doctorUserId: string;
		chairId: string;
		assistantUserId?: string;
		startsAt: string;
		endsAt: string;
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
				...payload,
				status: "planned",
				reason: "Первичный осмотр",
			},
		});
	}

	test("Гонка врачей: при одновременной записи к одному врачу ровно одна успешна (201), вторая отклонена (409)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2028-11-01T09:00:00.000Z";
		const endsAt = "2028-11-01T09:45:00.000Z";

		const [resA, resB] = await Promise.all([
			makeCreateRequest({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				assistantUserId: ASSISTANT_1_ID,
				patientId: PATIENT_1_ID,
				startsAt,
				endsAt,
			}),
			makeCreateRequest({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_2_ID,
				assistantUserId: ASSISTANT_2_ID,
				patientId: PATIENT_2_ID,
				startsAt,
				endsAt,
			}),
		]);

		const statusCodes = [resA.statusCode, resB.statusCode].sort();
		assert.deepEqual(
			statusCodes,
			[201, 409],
			`Ожидались статусы [201, 409], получены [${resA.statusCode}, ${resB.statusCode}]`,
		);

		const rejectionRes = resA.statusCode === 409 ? resA : resB;
		const body = rejectionRes.json() as {
			code: string;
			reason: string;
			message: string;
		};
		assert.equal(body.code, "AppointmentCreateRejected");
		assert.equal(body.reason, "resource_overlap");
		assert.equal(body.message, "У врача уже есть запись в это время");
	});

	test("Гонка кресел: при одновременной записи в одно кресло ровно одна успешна (201), вторая отклонена (409)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2028-11-01T10:00:00.000Z";
		const endsAt = "2028-11-01T10:45:00.000Z";

		const [resA, resB] = await Promise.all([
			makeCreateRequest({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				assistantUserId: ASSISTANT_1_ID,
				patientId: PATIENT_1_ID,
				startsAt,
				endsAt,
			}),
			makeCreateRequest({
				doctorUserId: DOCTOR_2_ID,
				chairId: CHAIR_1_ID,
				assistantUserId: ASSISTANT_2_ID,
				patientId: PATIENT_2_ID,
				startsAt,
				endsAt,
			}),
		]);

		const statusCodes = [resA.statusCode, resB.statusCode].sort();
		assert.deepEqual(
			statusCodes,
			[201, 409],
			`Ожидались статусы [201, 409], получены [${resA.statusCode}, ${resB.statusCode}]`,
		);

		const rejectionRes = resA.statusCode === 409 ? resA : resB;
		const body = rejectionRes.json() as {
			code: string;
			reason: string;
			message: string;
		};
		assert.equal(body.code, "AppointmentCreateRejected");
		assert.equal(body.reason, "resource_overlap");
		assert.equal(
			body.message,
			"Кресло уже занято другой записью в это время",
		);
	});

	test("Гонка ассистентов: при одновременной записи одного ассистента ровно одна успешна (201), вторая отклонена (409)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2028-11-01T11:00:00.000Z";
		const endsAt = "2028-11-01T11:45:00.000Z";

		const [resA, resB] = await Promise.all([
			makeCreateRequest({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				assistantUserId: ASSISTANT_1_ID,
				patientId: PATIENT_1_ID,
				startsAt,
				endsAt,
			}),
			makeCreateRequest({
				doctorUserId: DOCTOR_2_ID,
				chairId: CHAIR_2_ID,
				assistantUserId: ASSISTANT_1_ID,
				patientId: PATIENT_2_ID,
				startsAt,
				endsAt,
			}),
		]);

		const statusCodes = [resA.statusCode, resB.statusCode].sort();
		assert.deepEqual(
			statusCodes,
			[201, 409],
			`Ожидались статусы [201, 409], получены [${resA.statusCode}, ${resB.statusCode}]`,
		);

		const rejectionRes = resA.statusCode === 409 ? resA : resB;
		const body = rejectionRes.json() as {
			code: string;
			reason: string;
			message: string;
		};
		assert.equal(body.code, "AppointmentCreateRejected");
		assert.equal(body.reason, "resource_overlap");
		assert.equal(body.message, "У ассистента уже есть запись в это время");
	});

	test("Гонка пациентов: при одновременной записи одного пациента ровно одна успешна (201), вторая отклонена (409)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2028-11-01T12:00:00.000Z";
		const endsAt = "2028-11-01T12:45:00.000Z";

		const [resA, resB] = await Promise.all([
			makeCreateRequest({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				assistantUserId: ASSISTANT_1_ID,
				patientId: PATIENT_1_ID,
				startsAt,
				endsAt,
			}),
			makeCreateRequest({
				doctorUserId: DOCTOR_2_ID,
				chairId: CHAIR_2_ID,
				assistantUserId: ASSISTANT_2_ID,
				patientId: PATIENT_1_ID,
				startsAt,
				endsAt,
			}),
		]);

		const statusCodes = [resA.statusCode, resB.statusCode].sort();
		assert.deepEqual(
			statusCodes,
			[201, 409],
			`Ожидались статусы [201, 409], получены [${resA.statusCode}, ${resB.statusCode}]`,
		);

		const rejectionRes = resA.statusCode === 409 ? resA : resB;
		const body = rejectionRes.json() as {
			code: string;
			reason: string;
			message: string;
		};
		assert.equal(body.code, "AppointmentCreateRejected");
		assert.equal(body.reason, "resource_overlap");
		assert.equal(body.message, "У пациента уже есть запись в это время");
	});
});
