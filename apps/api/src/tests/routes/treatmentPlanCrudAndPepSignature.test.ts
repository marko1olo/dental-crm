import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import { treatmentPlanRoutes } from "../../routes/treatmentPlanRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "pepSignCrud";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const PATIENT_ID = fixtureUuid(FIXTURE, 2);
const DOCTOR_ID = fixtureUuid(FIXTURE, 3);

describe("Treatment Plan CRUD & PEP (SMS/QR) Digital Signature API", () => {
	let app: FastifyInstance;
	let databaseReady = true;
	let testHeaders: Record<string, string>;

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника ДЕНТЕ ПЭП Экспресс",
			}).onConflictDoNothing();

			await db.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				fullName: "Д-р Кузнецов И.В.",
				role: "doctor",
				specialties: ["Терапия", "Хирургия"],
				isActive: true,
			}).onConflictDoNothing();

			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Смирнов Алексей Павлович",
				phone: "+79991234567",
			}).onConflictDoNothing();
		});

		app = createTenantTestApp();
		await app.register(treatmentPlanRoutes);
		await app.ready();

		const signed = signToken(
			{
				userId: DOCTOR_ID,
				organizationId: ORG_ID,
				role: "doctor",
			},
			authTokenSecret(),
		);

		testHeaders = {
			authorization: `Bearer ${signed}`,
			"x-dente-staff-token": signed,
			"x-dente-organization-id": ORG_ID,
		};
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	test("1. POST /api/treatment-plans creates structured treatment plan with stages and items", async () => {
		if (!databaseReady) return;

		const response = await app.inject({
			method: "POST",
			url: "/api/treatment-plans",
			headers: testHeaders,
			payload: {
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				name: "Комплексная санация и имплантация",
				title: "План реабилитации зубного ряда",
				stages: [
					{
						stageOrder: 1,
						stageName: "Этап 1: Терапевтическая санация",
						completionPercentage: 0,
						items: [
							{
								priceId: "A16.07.002",
								name: "Препарирование и пломбирование зуба световым композитом",
								toothNumber: 16,
								quantity: 1,
								price: 6500,
								discount: 500,
							},
						],
					},
					{
						stageOrder: 2,
						stageName: "Этап 2: Дентальная имплантация",
						completionPercentage: 0,
						items: [
							{
								priceId: "A16.07.054",
								name: "Установка дентального имплантата Hiossen",
								toothNumber: 46,
								quantity: 1,
								price: 45000,
								discount: 0,
							},
						],
					},
				],
			},
		});

		assert.equal(response.statusCode, 201, `Failed to create plan: ${response.body}`);
		const body = JSON.parse(response.body);
		assert.equal(body.success, true);
		assert.ok(body.treatmentPlan?.id);
		assert.equal(body.treatmentPlan.name, "Комплексная санация и имплантация");
		assert.equal(body.treatmentPlan.status, "Draft");
		assert.equal(Number(body.treatmentPlan.totalPriceRub), 51000); // (6500 - 500) + 45000
		assert.equal(body.stages?.length, 2);
		assert.equal(body.itemsCount, 2);
	});

	test("2. PATCH /api/treatment-plans/:id/stages/:stageId updates stage status and progress", async () => {
		if (!databaseReady) return;

		// 1. Сначала создаем план
		const createRes = await app.inject({
			method: "POST",
			url: "/api/treatment-plans",
			headers: testHeaders,
			payload: {
				patientId: PATIENT_ID,
				name: "План ортопедии",
				stages: [
					{
						stageOrder: 1,
						stageName: "Подготовительный этап",
						items: [{ priceId: "A16.07.001", price: 3000 }],
					},
				],
			},
		});
		assert.equal(createRes.statusCode, 201);
		const createdBody = JSON.parse(createRes.body);
		const planId = createdBody.treatmentPlan.id;
		const stageId = createdBody.stages[0].id;

		// 2. Обновляем этап через PATCH
		const patchRes = await app.inject({
			method: "PATCH",
			url: `/api/treatment-plans/${planId}/stages/${stageId}`,
			headers: testHeaders,
			payload: {
				status: "completed",
				completionPercentage: 100,
				stageName: "Подготовительный этап (завершён)",
			},
		});

		assert.equal(patchRes.statusCode, 200, `Patch failed: ${patchRes.body}`);
		const patchBody = JSON.parse(patchRes.body);
		assert.equal(patchBody.success, true);
		assert.equal(patchBody.stage.stageName, "Подготовительный этап (завершён)");
		assert.equal(patchBody.stage.completionPercentage, 100);
		assert.equal(patchBody.stage.autoArchived, true);
	});

	test("3. POST /api/treatment-plans/:id/sign-pep request_code and confirm flow", async () => {
		if (!databaseReady) return;

		// 1. Создаем план
		const createRes = await app.inject({
			method: "POST",
			url: "/api/treatment-plans",
			headers: testHeaders,
			payload: {
				patientId: PATIENT_ID,
				name: "План с ПЭП",
				totalPriceRub: 25000,
			},
		});
		assert.equal(createRes.statusCode, 201);
		const planId = JSON.parse(createRes.body).treatmentPlan.id;

		// 2. Запрашиваем проверочный код по СМС
		const reqCodeRes = await app.inject({
			method: "POST",
			url: `/api/treatment-plans/${planId}/sign-pep`,
			headers: testHeaders,
			payload: {
				action: "request_code",
				method: "sms",
				phone: "+79991234567",
			},
		});

		assert.equal(reqCodeRes.statusCode, 200);
		const reqCodeBody = JSON.parse(reqCodeRes.body);
		assert.equal(reqCodeBody.success, true);
		assert.equal(reqCodeBody.smsSent, true);
		assert.equal(reqCodeBody.timeoutSeconds, 60);

		// 3. Подтверждаем подписание кодом
		const confirmRes = await app.inject({
			method: "POST",
			url: `/api/treatment-plans/${planId}/sign-pep`,
			headers: testHeaders,
			payload: {
				action: "confirm",
				method: "sms",
				code: "123456", // bypass/valid
				signerName: "Смирнов Алексей Павлович",
			},
		});

		assert.equal(confirmRes.statusCode, 200, `Sign PEP failed: ${confirmRes.body}`);
		const confirmBody = JSON.parse(confirmRes.body);
		assert.equal(confirmBody.success, true);
		assert.equal(confirmBody.signed, true);
		assert.ok(confirmBody.documentHash);
		assert.equal(confirmBody.signature.method, "pep_sms");
		assert.equal(confirmBody.signature.signerName, "Смирнов Алексей Павлович");
		assert.equal(confirmBody.treatmentPlan.status, "Approved");
	});

	test("4. GET /api/treatment-plans lists plans with patientId filter and organization isolation", async () => {
		if (!databaseReady) return;

		const listRes = await app.inject({
			method: "GET",
			url: `/api/treatment-plans?patientId=${PATIENT_ID}`,
			headers: testHeaders,
		});

		assert.equal(listRes.statusCode, 200);
		const listBody = JSON.parse(listRes.body);
		assert.equal(listBody.success, true);
		assert.ok(Array.isArray(listBody.plans));
		assert.ok(listBody.plans.length >= 1);
		assert.ok(listBody.plans.every((p: any) => p.patientId === PATIENT_ID));
	});

	test("5. PATCH /api/treatment-plans/:id updates plan fields", async () => {
		if (!databaseReady) return;

		const createRes = await app.inject({
			method: "POST",
			url: "/api/treatment-plans",
			headers: testHeaders,
			payload: {
				patientId: PATIENT_ID,
				name: "План для редактирования",
			},
		});
		assert.equal(createRes.statusCode, 201);
		const planId = JSON.parse(createRes.body).treatmentPlan.id;

		const updateRes = await app.inject({
			method: "PATCH",
			url: `/api/treatment-plans/${planId}`,
			headers: testHeaders,
			payload: {
				name: "Обновленный план лечения",
				planDiscountPercent: 10,
				planDiscountRub: 1500,
			},
		});

		assert.equal(updateRes.statusCode, 200);
		const updateBody = JSON.parse(updateRes.body);
		assert.equal(updateBody.success, true);
		assert.equal(updateBody.plan.name, "Обновленный план лечения");
		assert.equal(updateBody.plan.planDiscountPercent, 10);
	});

	test("6. POST /api/treatment-plans/:id/approve marks plan as Approved", async () => {
		if (!databaseReady) return;

		const createRes = await app.inject({
			method: "POST",
			url: "/api/treatment-plans",
			headers: testHeaders,
			payload: {
				patientId: PATIENT_ID,
				name: "План для согласования",
			},
		});
		assert.equal(createRes.statusCode, 201);
		const planId = JSON.parse(createRes.body).treatmentPlan.id;

		const approveRes = await app.inject({
			method: "POST",
			url: `/api/treatment-plans/${planId}/approve`,
			headers: testHeaders,
		});

		assert.equal(approveRes.statusCode, 200);
		const approveBody = JSON.parse(approveRes.body);
		assert.equal(approveBody.success, true);
		assert.equal(approveBody.plan.status, "Approved");
		assert.ok(approveBody.plan.approvedAt);
	});
});
