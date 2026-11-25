/**
 * apps/api/src/tests/routes/patientPatchMedicalCardPersistence.test.ts
 *
 * PROOF OF PERSISTENCE:
 * 1. PUT /api/patients/:patientId updates core fields and administrativeProfile in real PostgreSQL 18.
 * 2. PUT /api/patients/:patientId/administrative-profile updates passport & safety profile in PostgreSQL 18.
 * 3. Multi-tenant IDOR protection: Org A doctor cannot update Org B patient (404).
 * 4. Validation: non-UUID returns 400.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { type FastifyInstance } from "fastify";
import { sql, eq } from "drizzle-orm";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import {
	fixtureUuid,
	withFixtureTenant,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { organizations, users, patients } from "../../db/schema.js";

const FIXTURE = "patientPatchMedCard";
const ORG_A_ID = fixtureUuid(FIXTURE, 1);
const ORG_B_ID = fixtureUuid(FIXTURE, 2);

const DOCTOR_A_ID = fixtureUuid(FIXTURE, 10);
const DOCTOR_B_ID = fixtureUuid(FIXTURE, 20);

const PATIENT_A_ID = fixtureUuid(FIXTURE, 31);
const PATIENT_B_ID = fixtureUuid(FIXTURE, 32);

describe("PATIENT PATCH & MEDICAL CARD PERSISTENCE SUITE (Real PostgreSQL 18)", () => {
	let app: FastifyInstance;
	let tokenDoctorA: string;
	let tokenDoctorB: string;
	let dbAvailable = true;

	before(async () => {
		try {
			await withFixtureTenant(ORG_A_ID, async (tx) => {
				await tx.execute(sql`SELECT 1`);
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				console.warn("[PATCH_TEST] PostgreSQL unavailable, skipping suite");
				return;
			}
			throw err;
		}

		await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);

		await withFixtureTenant(ORG_A_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_A_ID,
				name: "Клиника Альфа Тест",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			await tx.insert(users).values({
				id: DOCTOR_A_ID,
				organizationId: ORG_A_ID,
				email: "doctorA_patch@dente.ru",
				fullName: "Д-р Тестов А.А.",
				role: "doctor",
				createdAt: new Date(),
			});
			await tx.insert(patients).values({
				id: PATIENT_A_ID,
				organizationId: ORG_A_ID,
				fullName: "Пациент Альфа Изначальный",
				phone: "+79001112233",
				birthDate: "1988-03-15",
				status: "active",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		});

		await withFixtureTenant(ORG_B_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_B_ID,
				name: "Клиника Бета Тест",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			await tx.insert(users).values({
				id: DOCTOR_B_ID,
				organizationId: ORG_B_ID,
				email: "doctorB_patch@dente.ru",
				fullName: "Д-р Бетов Б.Б.",
				role: "doctor",
				createdAt: new Date(),
			});
			await tx.insert(patients).values({
				id: PATIENT_B_ID,
				organizationId: ORG_B_ID,
				fullName: "Пациент Бета Чужой",
				phone: "+79004445566",
				birthDate: "1992-07-20",
				status: "active",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		});

		app = createTenantTestApp();
		await registerPatientRoutes(app);

		const secret = authTokenSecret();
		tokenDoctorA = signToken({
			userId: DOCTOR_A_ID,
			organizationId: ORG_A_ID,
			role: "doctor",
		}, secret, 3600);

		tokenDoctorB = signToken({
			userId: DOCTOR_B_ID,
			organizationId: ORG_B_ID,
			role: "doctor",
		}, secret, 3600);
	});

	after(async () => {
		if (app) await app.close();
		if (dbAvailable) {
			await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
		}
	});

	it("1. PUT /api/patients/:patientId updates core & administrative profile in real PostgreSQL 18", async (t) => {
		if (!dbAvailable) return t.skip("Database unavailable");

		const res = await app.inject({
			method: "PUT",
			url: `/api/patients/${PATIENT_A_ID}`,
			headers: {
				authorization: `Bearer ${tokenDoctorA}`,
				"x-dente-clinic-token": tokenDoctorA,
				"x-dente-staff-token": tokenDoctorA,
				"x-dente-tenant-id": ORG_A_ID,
				"content-type": "application/json",
			},
			payload: {
				phone: "+79009998877",
				notes: "Жалобы на острую зубную боль",
				administrativeProfile: {
					snils: "123-456-789 00",
					identityDocument: "Паспорт РФ 4510 123456",
					registrationAddress: "г. Москва, ул. Ленина, д. 5",
					clinicalSafetyProfile: {
						allergies: "Амоксициллин, Лидокаин",
						somaticDiseases: "Гипертоническая болезнь II ст.",
						somaticNotes: "АД 130/85, принимает индапамид",
					},
					somaticAlerts: ["Амоксициллин, Лидокаин"],
				},
			},
		});

		assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);
		const body = JSON.parse(res.body);
		assert.strictEqual(body.phone, "+79009998877");
		assert.strictEqual(body.notes, "Жалобы на острую зубную боль");
		assert.strictEqual(body.administrativeProfile?.snils, "123-456-789 00");
		assert.strictEqual(body.administrativeProfile?.identityDocument, "Паспорт РФ 4510 123456");
		assert.strictEqual(body.administrativeProfile?.clinicalSafetyProfile?.allergies, "Амоксициллин, Лидокаин");

		// Проверяем прямое чтение из PostgreSQL 18
		await withFixtureTenant(ORG_A_ID, async (tx) => {
			const [row] = await tx
				.select()
				.from(patients)
				.where(eq(patients.id, PATIENT_A_ID));
			assert.ok(row, "Patient row must exist in DB");
			assert.strictEqual(row.phone, "+79009998877");
			assert.strictEqual(row.notes, "Жалобы на острую зубную боль");
			const admin = row.administrativeProfile as Record<string, unknown> | null;
			assert.strictEqual(admin?.snils, "123-456-789 00");
			assert.strictEqual(admin?.identityDocument, "Паспорт РФ 4510 123456");
			const safety = admin?.clinicalSafetyProfile as Record<string, unknown> | undefined;
			assert.strictEqual(safety?.allergies, "Амоксициллин, Лидокаин");
		});
	});

	it("2. PUT /api/patients/:patientId + /administrative-profile updates passport & clinical safety payload", async (t) => {
		if (!dbAvailable) return t.skip("Database unavailable");

		const headers = {
			authorization: `Bearer ${tokenDoctorA}`,
			"x-dente-clinic-token": tokenDoctorA,
			"x-dente-staff-token": tokenDoctorA,
			"x-dente-tenant-id": ORG_A_ID,
			"content-type": "application/json",
		};

		const coreRes = await app.inject({
			method: "PUT",
			url: `/api/patients/${PATIENT_A_ID}`,
			headers,
			payload: {
				fullName: "Пациент Альфа Обновленный",
				phone: "+79007776655",
				notes: "Реакция на холодное и горячее",
			},
		});
		assert.strictEqual(coreRes.statusCode, 200, `Expected 200, got ${coreRes.statusCode}: ${coreRes.body}`);

		const res = await app.inject({
			method: "PUT",
			url: `/api/patients/${PATIENT_A_ID}/administrative-profile`,
			headers,
			payload: {
				identityDocument: "Паспорт РФ 4510 999888",
				registrationAddress: "г. Санкт-Петербург, Невский пр. 1",
				snils: "987-654-321 99",
				insurancePolicyNumber: "1234567890123456",
				clinicalSafetyProfile: {
					allergies: "Ультракаин Д-С",
					somaticDiseases: "Сахарный диабет 2 типа",
					somaticNotes: "Глюкоза 5.8 ммоль/л",
				},
			},
		});

		assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);
		const body = JSON.parse(res.body);
		assert.strictEqual(body.fullName, "Пациент Альфа Обновленный");
		assert.strictEqual(body.phone, "+79007776655");
		assert.strictEqual(body.notes, "Реакция на холодное и горячее");
		assert.strictEqual(body.administrativeProfile?.snils, "987-654-321 99");
		assert.strictEqual(body.administrativeProfile?.registrationAddress, "г. Санкт-Петербург, Невский пр. 1");
		assert.strictEqual(body.administrativeProfile?.clinicalSafetyProfile?.allergies, "Ультракаин Д-С");
	});

	it("3. Cross-Tenant IDOR: Doctor from Org A cannot PUT patient from Org B (returns 404)", async (t) => {
		if (!dbAvailable) return t.skip("Database unavailable");

		const res = await app.inject({
			method: "PUT",
			url: `/api/patients/${PATIENT_B_ID}`,
			headers: {
				authorization: `Bearer ${tokenDoctorA}`,
				"x-dente-clinic-token": tokenDoctorA,
				"x-dente-staff-token": tokenDoctorA,
				"x-dente-tenant-id": ORG_A_ID,
				"content-type": "application/json",
			},
			payload: {
				phone: "+79990000000",
			},
		});

		assert.strictEqual(res.statusCode, 404, "Cross-tenant patient mutation must be rejected with 404");
	});

	it("4. Non-UUID patientId returns 400 validation error", async (t) => {
		if (!dbAvailable) return t.skip("Database unavailable");

		const res = await app.inject({
			method: "PUT",
			url: "/api/patients/not-a-valid-uuid",
			headers: {
				authorization: `Bearer ${tokenDoctorA}`,
				"x-dente-clinic-token": tokenDoctorA,
				"x-dente-staff-token": tokenDoctorA,
				"x-dente-tenant-id": ORG_A_ID,
				"content-type": "application/json",
			},
			payload: {
				phone: "+79990000000",
			},
		});

		assert.strictEqual(res.statusCode, 400, "Invalid UUID must return 400");
	});
});
