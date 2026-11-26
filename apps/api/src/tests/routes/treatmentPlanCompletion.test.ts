import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	treatmentPlanStages,
	users,
	visits,
} from "../../db/schema.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
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

const FIXTURE = "planCompletion";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const PATIENT_ID = fixtureUuid(FIXTURE, 2);
const DOCTOR_ID = fixtureUuid(FIXTURE, 3);
const VISIT_ID = fixtureUuid(FIXTURE, 4);
const OTHER_ORG_ID = fixtureUuid(FIXTURE, 99);
const OTHER_DOCTOR_ID = fixtureUuid(FIXTURE, 98);

describe("Treatment Plan Closed-Loop Item & Stage Completion API", () => {
	let app: FastifyInstance;
	let databaseReady = true;
	let staffToken: string;
	let otherOrgStaffToken: string;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID, OTHER_ORG_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORG_ID, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Клиника Жизненного Цикла Плана Лечения",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Д-р Иванов А.С.",
					role: "doctor",
					specialties: ["Терапия", "Ортопедия"],
					isActive: true,
				})
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Пациент Тест Завершения Этапа",
					phone: "+79997778899",
				})
				.onConflictDoNothing();

			await db
				.insert(visits)
				.values({
					id: VISIT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					status: "draft",
				})
				.onConflictDoNothing();
		});

		await withFixtureTenant(OTHER_ORG_ID, async () => {
			await db
				.insert(organizations)
				.values({
					id: OTHER_ORG_ID,
					name: "Чужая клиника изоляции",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values({
					id: OTHER_DOCTOR_ID,
					organizationId: OTHER_ORG_ID,
					fullName: "Д-р Чужой Б.Б.",
					role: "doctor",
					specialties: ["Терапия"],
					isActive: true,
				})
				.onConflictDoNothing();
		});

		staffToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" },
			authTokenSecret(),
		);
		otherOrgStaffToken = signToken(
			{ organizationId: OTHER_ORG_ID, userId: OTHER_DOCTOR_ID, role: "doctor" },
			authTokenSecret(),
		);

		app = createTenantTestApp();
		await registerOdontogramRoutes(app);
		await app.register(treatmentPlanRoutes);
		await app.ready();
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_ID, OTHER_ORG_ID]).catch(() => {});
		}
	});

	test("POST complete-items by phase marks stage items completed and updates plan to Active", async (t) => {
		if (!databaseReady) return t.skip("Database unavailable");

		const planId = fixtureUuid(FIXTURE, 10);
		const itemId1 = fixtureUuid(FIXTURE, 11);
		const itemId2 = fixtureUuid(FIXTURE, 12);
		const itemId3 = fixtureUuid(FIXTURE, 13);

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(treatmentPlans).values({
				id: planId,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				name: "Комплексный 2-этапный план",
				status: "Draft",
				totalPrice: "15000",
				planDiscountRub: 0,
			});

			await db.insert(treatmentPlanItemsNew).values([
				{
					id: itemId1,
					planId,
					organizationId: ORG_ID,
					priceId: "A16.07.002::Лечение кариеса 16",
					phase: 1,
					toothNumber: 16,
					quantity: 1,
					price: "5000",
					discount: "0",
				},
				{
					id: itemId2,
					planId,
					organizationId: ORG_ID,
					priceId: "A16.07.030::Эндодонтия 16",
					phase: 1,
					toothNumber: 16,
					quantity: 1,
					price: "6000",
					discount: "0",
				},
				{
					id: itemId3,
					planId,
					organizationId: ORG_ID,
					priceId: "A16.07.004::Коронка цирконий 16",
					phase: 2,
					toothNumber: 16,
					quantity: 1,
					price: "18000",
					discount: "0",
				},
			]);
		});

		// Завершаем этап 1 (phase: 1)
		const completeRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planId}/complete-items`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Content-Type": "application/json",
			},
			payload: {
				phase: 1,
				visitId: VISIT_ID,
			},
		});

		assert.equal(completeRes.statusCode, 200, `Expected 200, got ${completeRes.statusCode}: ${completeRes.body}`);
		const body = completeRes.json();
		assert.equal(body.success, true);
		assert.equal(body.isFullyCompleted, false);
		assert.equal(body.completedItemIds.length, 2);

		// Проверяем, что статус плана стал Active
		const [updatedPlan] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(treatmentPlans)
				.where(eq(treatmentPlans.id, planId)),
		);
		assert.ok(updatedPlan);
		assert.equal(updatedPlan.status, "Active");

		// Проверяем, что в treatment_items созданы записи со статусом completed
		const ledgerRows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(treatmentItems)
				.where(eq(treatmentItems.patientId, PATIENT_ID)),
		);
		assert.equal(ledgerRows.length, 2);
		assert.ok(ledgerRows.every((r) => r.status === "completed"));
		assert.ok(ledgerRows.every((r) => r.visitId === VISIT_ID));
		assert.ok(ledgerRows.every((r) => r.treatmentPlanId === planId));
		const completedItemIds = new Set(ledgerRows.map((r) => r.treatmentPlanItemId));
		assert.ok(completedItemIds.has(itemId1));
		assert.ok(completedItemIds.has(itemId2));

		// Проверяем, что GET /api/patients/:patientId/treatment-plans возвращает isCompleted = true для первых 2
		const listRes = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/treatment-plans`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
		});
		assert.equal(listRes.statusCode, 200);
		const plansList = listRes.json().plans;
		const currentPlan = plansList.find((p: any) => p.id === planId);
		assert.ok(currentPlan);
		assert.equal(currentPlan.items[0].isCompleted, true);
		assert.equal(currentPlan.items[0].status, "completed");
		assert.equal(currentPlan.items[1].isCompleted, true);
		assert.equal(currentPlan.items[1].status, "completed");
		assert.equal(currentPlan.items[2].isCompleted, false);
		assert.equal(currentPlan.items[2].status, "planned");
	});

	test("POST complete-items completes remaining items, updates stage percentages in batch, preserves existing visitId and rejects cross-org/invalid inputs", async (t) => {
		if (!databaseReady) return t.skip("Database unavailable");

		const planId = fixtureUuid(FIXTURE, 20);
		const itemId1 = fixtureUuid(FIXTURE, 21);
		const itemId2 = fixtureUuid(FIXTURE, 22);
		const stage1Id = fixtureUuid(FIXTURE, 23);
		const stage2Id = fixtureUuid(FIXTURE, 24);
		const ledgerId1 = fixtureUuid(FIXTURE, 25);
		const clinicOnlyOtherToken = signToken(
			{ organizationId: OTHER_ORG_ID },
			authTokenSecret(),
		);

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(treatmentPlans).values({
				id: planId,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				name: "Двухэтапный план профгигиены и терапии",
				status: "Active",
				totalPrice: "9000",
				planDiscountRub: 0,
			});

			await db.insert(treatmentPlanStages).values([
				{
					id: stage1Id,
					planId,
					organizationId: ORG_ID,
					stageOrder: 1,
					stageName: "Этап 1",
					completionPercentage: 0,
				},
				{
					id: stage2Id,
					planId,
					organizationId: ORG_ID,
					stageOrder: 2,
					stageName: "Этап 2",
					completionPercentage: 0,
				},
			]);

			await db.insert(treatmentPlanItemsNew).values([
				{
					id: itemId1,
					planId,
					organizationId: ORG_ID,
					priceId: "A16.07.051::Комплексная гигиена",
					phase: 1,
					quantity: 1,
					price: "4000",
					discount: "0",
				},
				{
					id: itemId2,
					planId,
					organizationId: ORG_ID,
					priceId: "A16.07.002::Пломба",
					phase: 2,
					quantity: 1,
					price: "5000",
					discount: "0",
				},
			]);

			// Предсуществующая строка леджера с привязанным visitId: завершение без visitId обязано сохранить visitId.
			await db.insert(treatmentItems).values({
				id: ledgerId1,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				treatmentPlanId: planId,
				treatmentPlanItemId: itemId1,
				title: "Комплексная гигиена",
				quantity: "1",
				priceRub: 4000,
				unitPriceRub: 4000,
				priceKopecks: 400000n,
				unitPriceKopecks: 400000n,
				status: "in_progress",
			});
		});

		// Негативные проверки: невалидный phase / лишнее поле -> 400
		const invalidPhaseRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planId}/complete-items`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Content-Type": "application/json",
			},
			payload: { phase: -1 },
		});
		assert.equal(invalidPhaseRes.statusCode, 400);

		const extraFieldRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planId}/complete-items`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Content-Type": "application/json",
			},
			payload: { phase: 1, unexpectedExtraField: true },
		});
		assert.equal(extraFieldRes.statusCode, 400);

		// Невалидный Idempotency-Key -> 400
		const badKeyRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planId}/complete-items`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Idempotency-Key": "not-a-uuid",
				"Content-Type": "application/json",
			},
			payload: { phase: 1 },
		});
		assert.equal(badKeyRes.statusCode, 400);

		// Голый токен клиники без сотрудника -> 401
		const clinicOnlyCrossRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planId}/complete-items`,
			headers: {
				"x-dente-clinic-token": clinicOnlyOtherToken,
				"Content-Type": "application/json",
			},
			payload: { phase: 1 },
		});
		assert.equal(clinicOnlyCrossRes.statusCode, 401);

		// Чужой тенант со staff-токеном -> 404 (не модифицирует данные нашей клиники)
		const crossOrgRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planId}/complete-items`,
			headers: {
				"x-dente-clinic-token": otherOrgStaffToken,
				"x-dente-staff-token": otherOrgStaffToken,
				"Content-Type": "application/json",
			},
			payload: { phase: 1 },
		});
		assert.equal(crossOrgRes.statusCode, 404);

		// Завершаем этап 1 по renderedServices БЕЗ visitId в payload
		const completeStage1Res = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planId}/complete-items`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Content-Type": "application/json",
			},
			payload: {
				renderedServices: [
					{
						code: "A16.07.051",
						name: "Комплексная гигиена",
					},
				],
			},
		});

		assert.equal(
			completeStage1Res.statusCode,
			200,
			`Expected 200, got ${completeStage1Res.statusCode}: ${completeStage1Res.body}`,
		);
		const stage1Body = completeStage1Res.json();
		assert.equal(stage1Body.success, true);
		assert.equal(stage1Body.isFullyCompleted, false);

		const [preservedItem] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(treatmentItems)
				.where(eq(treatmentItems.id, ledgerId1)),
		);
		assert.equal(preservedItem?.status, "completed");
		assert.equal(preservedItem?.visitId, VISIT_ID);

		const stagesAfter1 = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(treatmentPlanStages)
				.where(eq(treatmentPlanStages.planId, planId)),
		);
		const s1After1 = stagesAfter1.find((s) => s.id === stage1Id);
		const s2After1 = stagesAfter1.find((s) => s.id === stage2Id);
		assert.equal(s1After1?.completionPercentage, 100);
		assert.equal(s2After1?.completionPercentage, 0);

		// Завершаем оставшийся этап 2 -> план становится Completed, оба этапа 100%
		const completeStage2Res = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planId}/complete-items`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Content-Type": "application/json",
			},
			payload: {
				itemIds: [itemId2],
			},
		});

		assert.equal(
			completeStage2Res.statusCode,
			200,
			`Expected 200, got ${completeStage2Res.statusCode}: ${completeStage2Res.body}`,
		);
		const stage2Body = completeStage2Res.json();
		assert.equal(stage2Body.success, true);
		assert.equal(stage2Body.isFullyCompleted, true);

		// Проверяем статус плана и этапов в БД
		const [planInDb] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(treatmentPlans)
				.where(eq(treatmentPlans.id, planId)),
		);
		assert.ok(planInDb);
		assert.equal(planInDb.status, "Completed");

		const stagesAfter2 = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(treatmentPlanStages)
				.where(eq(treatmentPlanStages.planId, planId)),
		);
		assert.ok(stagesAfter2.every((s) => s.completionPercentage === 100));
	});
});
