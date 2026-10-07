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
	users,
	visits,
} from "../../db/schema.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
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

describe("Treatment Plan Closed-Loop Item & Stage Completion API", () => {
	let app: FastifyInstance;
	let databaseReady = true;
	let staffToken: string;

	before(async () => {
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
				name: "Клиника Жизненного Цикла Плана Лечения",
			});

			await db.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				fullName: "Д-р Иванов А.С.",
				role: "doctor",
				specialties: ["Терапия", "Ортопедия"],
				isActive: true,
			});

			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Пациент Тест Завершения Этапа",
				phone: "+79997778899",
			});

			await db.insert(visits).values({
				id: VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				status: "draft",
			});
		});

		staffToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" },
			authTokenSecret(),
		);

		app = createTenantTestApp();
		await registerOdontogramRoutes(app);
		await app.ready();
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_ID]).catch(() => {});
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

	test("POST complete-items completes remaining items and promotes plan to Completed", async (t) => {
		if (!databaseReady) return t.skip("Database unavailable");

		const planId = fixtureUuid(FIXTURE, 20);
		const itemId1 = fixtureUuid(FIXTURE, 21);

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(treatmentPlans).values({
				id: planId,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				name: "Одноэтапный план профгигиены",
				status: "Active",
				totalPrice: "4000",
				planDiscountRub: 0,
			});

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
			]);
		});

		// Завершаем по renderedServices
		const completeRes = await app.inject({
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

		assert.equal(completeRes.statusCode, 200, `Expected 200, got ${completeRes.statusCode}: ${completeRes.body}`);
		const body = completeRes.json();
		assert.equal(body.success, true);
		assert.equal(body.isFullyCompleted, true);

		// Проверяем статус плана в БД
		const [planInDb] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(treatmentPlans)
				.where(eq(treatmentPlans.id, planId)),
		);
		assert.ok(planInDb);
		assert.equal(planInDb.status, "Completed");
	});
});
