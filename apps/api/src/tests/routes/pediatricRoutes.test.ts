import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	generatedDocuments,
	organizations,
	patients,
	toothStates,
	users,
} from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { registerPediatricDiplomaRoutes } from "../../routes/pediatric/pediatricDiplomaRoutes.js";
import { registerPediatricIndicesRoutes } from "../../routes/pediatric/pediatricIndicesRoutes.js";
import { registerPediatricPresetRoutes } from "../../routes/pediatric/pediatricPresets.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createIdempotentTenantTestApp, createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "pediatricRoutes";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const DOCTOR_ID = fixtureUuid(FIXTURE, 10);
const PATIENT_ID = fixtureUuid(FIXTURE, 20);

describe("Pediatric API Routes — PostgreSQL 18 & Data Integrity", () => {
	let app: FastifyInstance;
	let tokenDoctor: string;
	let dbAvailable = true;

	before(async () => {
		try {
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.execute(sql`SELECT 1`);
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				console.warn("[PEDIATRIC_TEST] Database unavailable, skipping integration suite");
				return;
			}
			throw err;
		}

		await withFixtureTenant(ORG_ID, async (tx) => {
			// Clean prior state
			await tx.delete(generatedDocuments).where(eq(generatedDocuments.organizationId, ORG_ID));
			await tx.delete(idempotencyKeys).where(eq(idempotencyKeys.clinicId, ORG_ID));
			await tx.delete(toothStates).where(eq(toothStates.organizationId, ORG_ID));
			await tx.delete(patients).where(eq(patients.organizationId, ORG_ID));
			await tx.delete(users).where(eq(users.organizationId, ORG_ID));
			await tx.delete(organizations).where(eq(organizations.id, ORG_ID));

			// Seed fixtures
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника DENTE Детство",
				email: "pediatric@test.local",
			}).onConflictDoNothing();

			await tx.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				email: "pediatrician@test.local",
				fullName: "Др. Детская А.В.",
				role: "doctor",
				isStaff: true,
				isActive: true,
			}).onConflictDoNothing();

			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Смирнов Михаил Александрович",
				birthDate: "2018-06-01",
			}).onConflictDoNothing();
		});

		app = await createIdempotentTenantTestApp();
		registerPediatricPresetRoutes(app);
		registerPediatricIndicesRoutes(app);
		registerPediatricDiplomaRoutes(app);

		const secret = authTokenSecret();
		tokenDoctor = signToken(
			{
				userId: DOCTOR_ID,
				organizationId: ORG_ID,
				role: "doctor",
			},
			secret,
			3600,
		);
	});

	after(async () => {
		if (app) {
			await app.close();
		}
	});

	it("1. Rejects unauthenticated request to bravery diploma audit", async () => {
		const testApp = await createTenantTestApp();
		registerPediatricDiplomaRoutes(testApp);

		const response = await testApp.inject({
			method: "GET",
			url: `/api/patients/${ORG_ID}/pediatric/bravery-diploma`,
		});

		assert.equal(response.statusCode, 401);
		await testApp.close();
	});

	it("2. Rejects invalid patient UUID for bravery diploma", async () => {
		const testApp = await createTenantTestApp();
		registerPediatricDiplomaRoutes(testApp);

		const secret = authTokenSecret();
		const staffToken = signToken(
			{
				userId: DOCTOR_ID,
				organizationId: ORG_ID,
				role: "doctor",
			},
			secret,
			3600,
		);

		const response = await testApp.inject({
			method: "GET",
			url: "/api/patients/not-a-valid-uuid/pediatric/bravery-diploma",
			headers: {
				"x-dente-staff-token": staffToken,
			},
		});

		assert.equal(response.statusCode, 400);
		await testApp.close();
	});

	it("3. Rejects non-clinical role for pediatric indices calculation", async () => {
		const testApp = await createTenantTestApp();
		registerPediatricIndicesRoutes(testApp);

		const secret = authTokenSecret();
		const accountantToken = signToken(
			{
				userId: DOCTOR_ID,
				organizationId: ORG_ID,
				role: "accountant",
			},
			secret,
			3600,
		);

		const response = await testApp.inject({
			method: "GET",
			url: `/api/patients/${ORG_ID}/pediatric/indices`,
			headers: {
				"x-dente-staff-token": accountantToken,
			},
		});

		assert.equal(response.statusCode, 403);
		await testApp.close();
	});

	it("4. Serves canonical pediatric presets via GET /api/pediatric/presets", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/pediatric/presets",
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.ok(body.count >= 6, "Expected at least 6 canonical presets");
		assert.ok(Array.isArray(body.presets));

		const ids = body.presets.map((p: { id: string }) => p.id);
		assert.ok(ids.includes("caries_primary"));
		assert.ok(ids.includes("pulpotomy_primary"));
		assert.ok(ids.includes("adaptation_visit"));
		assert.ok(ids.includes("fissure_sealing"));
		assert.ok(ids.includes("extraction_primary_exfoliation"));
	});

	it("5. Calculates honest kp/kpSurfaces indices with deciduous teeth 51–85 & Fedorov-Volodkina score", async (t) => {
		if (!dbAvailable) return t.skip();

		// Сеем молочные зубы:
		// Зуб 54: кариес на 2 поверхностях (O, M)
		// Зуб 55: пломба на 1 поверхности (O)
		// Зуб 64: удален преждевременно (Extracted)
		// Зуб 51: смена зуба по физиологической резорбции (НЕ должен идти в prematurelyExtracted)
		// Зубы 81, 71: с оценкой налета (plaqueScore)
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.delete(toothStates).where(
				and(eq(toothStates.organizationId, ORG_ID), eq(toothStates.patientId, PATIENT_ID)),
			);

			await tx.insert(toothStates).values([
				{
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					toothNumber: 54,
					state: "Caries",
					surfaces: ["O", "M"],
					notes: "Кариес дентина контактной и окклюзионной поверхности",
				},
				{
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					toothNumber: 55,
					state: "Filled",
					surfaces: ["O"],
					notes: "СИЦ пломба удовлетворительная",
				},
				{
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					toothNumber: 64,
					state: "Extracted",
					surfaces: [],
					notes: "Удален ранее по поводу периодонтита",
				},
				{
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					toothNumber: 51,
					state: "Missing",
					surfaces: [],
					notes: JSON.stringify({ resorptionStage: 100, isPhysiologicalResorption: true, text: "Физиологическая смена" }),
				},
				{
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					toothNumber: 71,
					state: "Healthy",
					surfaces: [],
					notes: JSON.stringify({ plaqueScore: 1 }),
				},
				{
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					toothNumber: 81,
					state: "Healthy",
					surfaces: [],
					notes: JSON.stringify({ plaqueScore: 2 }),
				},
			]);
		});

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/pediatric/indices`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.indices.primary.c, 1, "Кариозный молочный зуб 54");
		assert.equal(body.indices.primary.p, 1, "Пломбированный молочный зуб 55");
		assert.equal(body.indices.primary.prematurelyExtracted, 1, "Преждевременно удаленный молочный зуб 64");
		// Проверка формулы kp = c + p + prematurelyExtracted (1 + 1 + 1 = 3)
		assert.equal(body.indices.primary.kp, 3, "Индекс кпу(з) должен учитывать c, p и prematurelyExtracted");
		// Проверка поверхностей kpSurfaces = primarySurfacesC (2) + primarySurfacesP (1) = 3
		assert.equal(body.indices.primary.kpSurfaces, 3, "Индекс кп(п) поверхностей должен быть 3");
		// Проверка индекса Федорова-Володкиной
		assert.ok(body.indices.fedorovVolodkina !== undefined, "Индекс Федорова-Володкиной должен возвращаться");
		assert.ok(typeof body.indices.fedorovVolodkina.score === "number");
		assert.ok(body.indices.fedorovVolodkina.ratingText.length > 0);
	});

	it("6. Issues bravery diploma with Idempotency-Key support & replay defense (Mandates 8d, 8bo)", async (t) => {
		if (!dbAvailable) return t.skip();

		const idempotencyKey = "01950000-0000-7000-8000-000000000001";
		const payload = {
			patientName: "Миша Смирнов",
			patientAgeYears: 6,
			doctorName: "Др. Детская А.В.",
			clinicName: "Клиника DENTE",
			awardReasonRu: "За храбрость и дружбу с Зубной Феей",
		};

		// 1. Первый запрос: выпуск диплома
		const res1 = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/pediatric/bravery-diploma`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
				"idempotency-key": idempotencyKey,
			},
			payload,
		});

		assert.equal(res1.statusCode, 201);
		const body1 = JSON.parse(res1.body);
		assert.equal(body1.success, true);
		assert.equal(body1.diploma.patientName, "Миша Смирнов");
		assert.ok(body1.diploma.diplomaNumber.startsWith("ДИПЛОМ-ГЕРОЙ-"));
		assert.ok(body1.diploma.id);

		// 2. Повторный запрос с тем же Idempotency-Key: должен вернуть тот же диплом без создания дубля
		const res2 = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/pediatric/bravery-diploma`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
				"idempotency-key": idempotencyKey,
			},
			payload,
		});

		assert.equal(res2.statusCode, 201);
		assert.equal(res2.headers["idempotency-replayed"], "true");
		const body2 = JSON.parse(res2.body);
		assert.equal(body2.success, true);
		assert.equal(body2.diploma.id, body1.diploma.id, "ID диплома должен совпадать при реплее");
		assert.equal(body2.diploma.diplomaNumber, body1.diploma.diplomaNumber, "Номер диплома должен совпадать");

		// 3. GET аудит дипломов пациента
		const resGet = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/pediatric/bravery-diploma`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
			},
		});

		assert.equal(resGet.statusCode, 200);
		const bodyGet = JSON.parse(resGet.body);
		assert.equal(bodyGet.success, true);
		assert.ok(Array.isArray(bodyGet.diplomas));
		assert.equal(bodyGet.diplomas.length, 1, "В базе должен быть ровно 1 диплом благодаря идемпотентности");
		assert.equal(bodyGet.diplomas[0].id, body1.diploma.id);
	});

	it("7. Calculates patient age from birthDate when patientAgeYears is omitted", async (t) => {
		if (!dbAvailable) return t.skip();

		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/pediatric/bravery-diploma`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
				"idempotency-key": "01950000-0000-7000-8000-000000000002",
			},
			payload: {
				awardReasonRu: "За выдающуюся смелость при осмотре",
			},
		});

		assert.equal(res.statusCode, 201);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.diploma.patientName, "Смирнов Михаил Александрович");
		assert.ok(typeof body.diploma.patientAgeYears === "number", "Возраст должен быть вычислен из birthDate");
		assert.ok(body.diploma.patientAgeYears >= 7, "Пациент с birthDate 2018 должен быть не моложе 7 лет");
	});
});
