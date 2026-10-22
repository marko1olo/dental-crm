import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	auditEvents,
	organizations,
	patientRecalls,
	patients,
	portalBudgetTokens,
	treatmentPlans,
} from "../../db/schema.js";
import { publicBudgetRoutes } from "../../routes/publicBudgetRoutes.js";
import { treatmentPlanRoutes } from "../../routes/treatmentPlanRoutes.js";
import {
	syncRecallOnAppointmentCompleted,
	syncRecallOnAppointmentCreated,
} from "../../services/patients/recallSyncService.js";
import { PortalBudgetService } from "../../services/portalBudgetService.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "pipelineAndBudgetTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 2);
const PLAN_1_ID = fixtureUuid(NAMESPACE, 3);
const PLAN_2_ID = fixtureUuid(NAMESPACE, 4);
const PLAN_3_ID = fixtureUuid(NAMESPACE, 5);
const PLAN_4_ID = fixtureUuid(NAMESPACE, 6);
const PATIENT_2_ID = fixtureUuid(NAMESPACE, 7);
const PATIENT_3_ID = fixtureUuid(NAMESPACE, 8);

describe("Treatment Pipeline, Remote Budget Signing & Reactive Recall", () => {
	let app: FastifyInstance;
	let budgetToken: string;

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		await app.register(publicBudgetRoutes);
		await app.register(treatmentPlanRoutes);
		await app.ready();

		try {
			await db.delete(portalBudgetTokens).where(eq(portalBudgetTokens.organizationId, ORG_ID));
			await db.delete(patientRecalls).where(eq(patientRecalls.organizationId, ORG_ID));
			await purgeFixtureOrganizations([ORG_ID]);

			await withFixtureTenant(ORG_ID, async () => {
				// Seed Organization, Patient
				await db
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Клиника ДЕНТЕ Тест",
					})
					.onConflictDoNothing();
				await db
					.insert(patients)
					.values({
						id: PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Соколов Дмитрий Сергеевич",
						phone: "+7 (999) 456-78-90",
					})
					.onConflictDoNothing();

				// Plan 1: Draft without budget (requires_budget)
				await db.insert(treatmentPlans).values({
					id: PLAN_1_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					name: "План терапевтического лечения",
					title: "План терапевтического лечения",
					status: "Draft",
					totalPriceRub: "15000",
					planDiscountRub: 1500,
				});

				// Plan 2: Approved plan (no_appointment initially)
				await db.insert(treatmentPlans).values({
					id: PLAN_2_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					name: "План ортопедического лечения",
					title: "План ортопедического лечения",
					status: "Approved",
					totalPriceRub: "45000",
					planDiscountRub: 0,
				});
			});

			// Generate public budget token for Plan 1
			const gen = await PortalBudgetService.generateBudgetPortalToken({
				planId: PLAN_1_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				patientPhone: "+7 (999) 456-78-90",
				patientFirstName: "Дмитрий",
				clinicName: "Клиника ДЕНТЕ Тест",
				doctorName: "Д-р Кузнецов",
				authMethod: "phone_last4",
				items: [
					{
						title: "Лечение глубокого кариеса",
						toothNumber: 46,
						priceRub: 7500,
					},
					{
						title: "Художественная реставрация",
						toothNumber: 46,
						priceRub: 7500,
						discountRub: 1500,
					},
				],
				totalPriceRub: 15000,
				discountRub: 1500,
			});
			budgetToken = gen.token;
		} catch (err) {
			console.error("Fixture setup failure:", err);
			throw err;
		}
	});

	after(async () => {
		try {
			await db.delete(portalBudgetTokens).where(eq(portalBudgetTokens.organizationId, ORG_ID));
			await db.delete(patientRecalls).where(eq(patientRecalls.organizationId, ORG_ID));
			await purgeFixtureOrganizations([ORG_ID]);
		} catch {
			// clean-up
		}
		await app.close();
	});

	test("1. GET /api/v1/public/budgets/:token — ZERO data leaks prior to phone 4-digits verification", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/v1/public/budgets/${budgetToken}`,
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.payload);

		// Verified metadata must be present
		assert.equal(body.token, budgetToken);
		assert.equal(body.clinicName, "Клиника ДЕНТЕ Тест");
		assert.equal(body.requiresVerification, true);
		assert.equal(body.isVerified, false);
		assert.equal(body.maskedPhone, "+7 *** *** 78-90");

		// ZERO LEAKS: items, prices, doctor name, patient name MUST NOT be exposed!
		assert.equal(body.items, undefined, "items must not be exposed prior to verification");
		assert.equal(body.totalPriceRub, undefined, "totalPriceRub must not be exposed");
		assert.equal(body.netTotalRub, undefined, "netTotalRub must not be exposed");
		assert.equal(body.doctorName, undefined, "doctorName must not be exposed");
		assert.equal(body.patientFirstName, undefined, "patientFirstName must not be exposed");
	});

	test("2. POST /api/v1/public/budgets/:token/verify — 3 attempts brute-force lockout protection", async () => {
		// Attempt 1: wrong phone digits (401)
		const fail1 = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/verify`,
			payload: { phoneDigits: "0000" },
		});
		assert.equal(fail1.statusCode, 401);
		const b1 = JSON.parse(fail1.payload);
		assert.equal(b1.remainingAttempts, 2);

		// Attempt 2: wrong phone digits (401)
		const fail2 = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/verify`,
			payload: { phoneDigits: "1111" },
		});
		assert.equal(fail2.statusCode, 401);
		const b2 = JSON.parse(fail2.payload);
		assert.equal(b2.remainingAttempts, 1);

		// Attempt 3: wrong phone digits -> triggers 429 lockout!
		const fail3 = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/verify`,
			payload: { phoneDigits: "2222" },
		});
		assert.equal(fail3.statusCode, 429);
		const b3 = JSON.parse(fail3.payload);
		assert.equal(b3.isLocked, true);
		assert.equal(b3.remainingAttempts, 0);

		// Subsequent attempt while locked -> 429
		const fail4 = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/verify`,
			payload: { phoneDigits: "7890" },
		});
		assert.equal(fail4.statusCode, 429);

		// Manually reset lockout in DB to simulate lockout expiry and test successful verification
		await db
			.update(portalBudgetTokens)
			.set({ failedAttempts: 0, isLocked: false, lockedUntil: null })
			.where(eq(portalBudgetTokens.token, budgetToken));

		// Correct verification with 7890 -> 200 + sessionToken
		const success = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/verify`,
			payload: { phoneDigits: "7890" },
		});
		assert.equal(success.statusCode, 200);
		const bSuccess = JSON.parse(success.payload);
		assert.equal(bSuccess.success, true);
		assert.equal(bSuccess.isVerified, true);
		assert.ok(bSuccess.sessionToken);

		// Now GET with sessionToken reveals full items and pricing breakdown
		const verifiedGet = await app.inject({
			method: "GET",
			url: `/api/v1/public/budgets/${budgetToken}`,
			headers: { authorization: `Bearer ${bSuccess.sessionToken}` },
		});
		assert.equal(verifiedGet.statusCode, 200);
		const vBody = JSON.parse(verifiedGet.payload);
		assert.equal(vBody.isVerified, true);
		assert.equal(vBody.patientFirstName, "Дмитрий");
		assert.equal(vBody.totalPriceRub, 15000);
		assert.equal(vBody.discountRub, 1500);
		assert.equal(vBody.netTotalRub, 13500);
		assert.ok(Array.isArray(vBody.items));
		assert.equal(vBody.items.length, 2);
	});

	test("3. POST /api/v1/public/budgets/:token/sign — remote digital signature approves treatment plan", async () => {
		// First verify to get session
		const verifyRes = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/verify`,
			payload: { phoneDigits: "7890" },
		});
		const sessionToken = JSON.parse(verifyRes.payload).sessionToken;

		const fakeSignature =
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

		const signRes = await app.inject({
			method: "POST",
			url: `/api/v1/public/budgets/${budgetToken}/sign`,
			headers: { authorization: `Bearer ${sessionToken}` },
			payload: {
				signaturePng: fakeSignature,
				signerName: "Соколов Д.С.",
			},
		});

		assert.equal(signRes.statusCode, 200);
		const signBody = JSON.parse(signRes.payload);
		assert.equal(signBody.success, true);
		assert.equal(signBody.status, "accepted");
		assert.ok(signBody.signedAt);
		assert.ok(signBody.documentHash);
		assert.equal(signBody.signerName, "Соколов Д.С.");

		// Verify linked treatment_plans was updated to 'Approved'
		const [updatedPlan] = await db
			.select({ status: treatmentPlans.status, approvedAt: treatmentPlans.approvedAt })
			.from(treatmentPlans)
			.where(eq(treatmentPlans.id, PLAN_1_ID));

		assert.equal(updatedPlan?.status, "Approved");
		assert.ok(updatedPlan?.approvedAt);
	});

	test("4. GET /api/v1/treatment-plans/pipeline — 5-column coordinator pipeline aggregator", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/v1/treatment-plans/pipeline",
			headers: { "x-organization-id": ORG_ID },
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.payload);

		assert.ok(body.pipeline);
		assert.ok(body.pipeline.requires_budget);
		assert.ok(body.pipeline.awaiting_decision);
		assert.ok(body.pipeline.no_appointment);
		assert.ok(body.pipeline.in_progress_abandoned);
		assert.ok(body.pipeline.completed);

		// Both Plan 1 (now signed/approved) and Plan 2 (approved) have no appointments booked yet
		// So they should be categorized in 'no_appointment'
		assert.ok(body.pipeline.no_appointment.length >= 1);
		assert.ok(body.summary.counts.total >= 2);
		assert.ok(body.summary.totalsRub.total > 0);
	});

	test("5. Reactive Visit <-> Recall Synchronization", async () => {
		const apptId = fixtureUuid(NAMESPACE, 10);
		const now = new Date();

		// 1. Create a pending recall in DB
		const [initialRecall] = await db
			.insert(patientRecalls)
			.values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				reason: "Плановый профилактический осмотр и гигиена",
				cohortType: "hygiene_therapy",
				status: "pending",
				dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // +7 days
			})
			.returning({ id: patientRecalls.id });

		assert.ok(initialRecall?.id);

		// 2. Create appointment in DB (just as createAppointmentInDb does in real flow)
		await db.insert(appointments).values({
			id: apptId,
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			startsAt: now,
			endsAt: new Date(now.getTime() + 30 * 60 * 1000),
			status: "planned",
		});

		// Simulate appointment creation hook -> pending recall moves to 'scheduled'
		await syncRecallOnAppointmentCreated(ORG_ID, {
			id: apptId,
			patientId: PATIENT_ID,
			reason: "Профгигиена и осмотр",
		});

		const [scheduledRecall] = await db
			.select({ status: patientRecalls.status, scheduledAppointmentId: patientRecalls.scheduledAppointmentId })
			.from(patientRecalls)
			.where(eq(patientRecalls.id, initialRecall.id));

		assert.equal(scheduledRecall?.status, "scheduled");
		assert.equal(scheduledRecall?.scheduledAppointmentId, apptId);

		// 3. Update appointment in DB to completed
		await db
			.update(appointments)
			.set({ status: "completed" })
			.where(eq(appointments.id, apptId));

		// 4. Simulate appointment completed -> recall moves to 'completed' & new recall scheduled (+180 days)
		await syncRecallOnAppointmentCompleted(ORG_ID, apptId);

		const [completedRecall] = await db
			.select({ status: patientRecalls.status, completedAt: patientRecalls.completedAt })
			.from(patientRecalls)
			.where(eq(patientRecalls.id, initialRecall.id));

		assert.equal(completedRecall?.status, "completed");
		assert.ok(completedRecall?.completedAt);

		// Verify new pending recall was created with dueDate approximately +180 days
		const allRecalls = await db
			.select({ id: patientRecalls.id, status: patientRecalls.status, dueDate: patientRecalls.dueDate })
			.from(patientRecalls)
			.where(eq(patientRecalls.patientId, PATIENT_ID));

		const newPending = allRecalls.find((r) => r.status === "pending" && r.id !== initialRecall.id);
		assert.ok(newPending, "New pending recall must be automatically scheduled in +180 days");
		assert.ok(new Date(newPending.dueDate).getTime() > now.getTime() + 170 * 24 * 60 * 60 * 1000);
	});

	test("6. POST /api/v1/treatment-plans/:id/transition-stage — immediate DB status update and audit log", async () => {
		// Transition PLAN_2_ID to 'Active'
		const res1 = await app.inject({
			method: "POST",
			url: `/api/v1/treatment-plans/${PLAN_2_ID}/transition-stage`,
			headers: { "x-organization-id": ORG_ID },
			payload: {
				status: "Active",
				reason: "Пациент начал комплексное лечение",
			},
		});

		assert.equal(res1.statusCode, 200);
		const b1 = JSON.parse(res1.payload);
		assert.equal(b1.success, true);
		assert.equal(b1.status, "Active");

		// Verify in DB
		const [planInDb1] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ status: treatmentPlans.status })
				.from(treatmentPlans)
				.where(eq(treatmentPlans.id, PLAN_2_ID)),
		);
		assert.equal(planInDb1?.status, "Active");

		// Transition via targetStage: 'completed'
		const res2 = await app.inject({
			method: "POST",
			url: `/api/v1/treatment-plans/${PLAN_2_ID}/transition-stage`,
			headers: { "x-organization-id": ORG_ID },
			payload: {
				targetStage: "completed",
			},
		});

		assert.equal(res2.statusCode, 200);
		const b2 = JSON.parse(res2.payload);
		assert.equal(b2.success, true);
		assert.equal(b2.status, "Completed");

		const [planInDb2] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ status: treatmentPlans.status })
				.from(treatmentPlans)
				.where(eq(treatmentPlans.id, PLAN_2_ID)),
		);
		assert.equal(planInDb2?.status, "Completed");
	});

	test("7. POST /api/v1/treatment-plans/dropout-prevention/run — batch generation of curator recall tasks", async () => {
		const pastDate = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000); // 21 days ago

		// Seed Patient 3 and Plan 3 without appointments: Approved 21 days ago
		await db
			.insert(patients)
			.values({
				id: PATIENT_3_ID,
				organizationId: ORG_ID,
				fullName: "Николаев Роман Игоревич",
				phone: "+7 (999) 777-88-99",
			})
			.onConflictDoNothing();

		await db.insert(treatmentPlans).values({
			id: PLAN_3_ID,
			organizationId: ORG_ID,
			patientId: PATIENT_3_ID,
			name: "Имплантация и протезирование",
			title: "Имплантация и протезирование",
			status: "Approved",
			approvedAt: pastDate,
			updatedAt: pastDate,
			createdAt: pastDate,
			totalPriceRub: "85000",
			planDiscountRub: 0,
		});

		// Trigger batch dropout check (threshold = 14 days)
		const res = await app.inject({
			method: "POST",
			url: "/api/v1/treatment-plans/dropout-prevention/run",
			headers: { "x-organization-id": ORG_ID },
			payload: { minDays: 14 },
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.payload);
		assert.equal(body.success, true);
		assert.ok(body.data.evaluatedPlans >= 1);
		assert.ok(body.data.dropoutRiskCount >= 1);
		assert.ok(body.data.tasksCreated >= 1);

		// Verify task in patientRecalls
		const recallsInDb = await db
			.select()
			.from(patientRecalls)
			.where(
				and(
					eq(patientRecalls.organizationId, ORG_ID),
					eq(patientRecalls.patientId, PATIENT_3_ID),
					eq(patientRecalls.cohortType, "treatment_plan_followup"),
				),
			);
		assert.ok(recallsInDb.length >= 1, "At least one recall task must be created for dropout plan");
		assert.equal(recallsInDb[0]?.status, "pending");
	});

	test("8. POST /api/v1/treatment-plans/:id/create-dropout-recall — 1-click single recall task with deduplication", async () => {
		// Seed Patient 2 and Plan 4
		await db
			.insert(patients)
			.values({
				id: PATIENT_2_ID,
				organizationId: ORG_ID,
				fullName: "Васильева Елена Павловна",
				phone: "+7 (999) 111-22-33",
			})
			.onConflictDoNothing();

		await db.insert(treatmentPlans).values({
			id: PLAN_4_ID,
			organizationId: ORG_ID,
			patientId: PATIENT_2_ID,
			name: "Ортодонтическое лечение",
			title: "Ортодонтическое лечение",
			status: "Approved",
			totalPriceRub: "120000",
			planDiscountRub: 5000,
		});

		// First creation: success 200
		const res1 = await app.inject({
			method: "POST",
			url: `/api/v1/treatment-plans/${PLAN_4_ID}/create-dropout-recall`,
			headers: { "x-organization-id": ORG_ID },
			payload: { notes: "Пациент взял паузу на раздумья, связаться" },
		});

		assert.equal(res1.statusCode, 200);
		const b1 = JSON.parse(res1.payload);
		console.log("TEST 6 b1:", b1);
		assert.equal(b1.success, true);
		assert.ok(b1.recallId);

		// Duplicate creation: idempotent 200 with existing recallId and message
		const res2 = await app.inject({
			method: "POST",
			url: `/api/v1/treatment-plans/${PLAN_4_ID}/create-dropout-recall`,
			headers: { "x-organization-id": ORG_ID },
			payload: { notes: "Повторная попытка" },
		});

		assert.equal(res2.statusCode, 200);
		const b2 = JSON.parse(res2.payload);
		assert.equal(b2.success, true);
		assert.equal(b2.recallId, b1.recallId);
		assert.ok(b2.message.includes("уже находится в очереди"));

		// Non-existent plan returns 400
		const nonExistentPlanId = fixtureUuid(NAMESPACE, 999);
		const res3 = await app.inject({
			method: "POST",
			url: `/api/v1/treatment-plans/${nonExistentPlanId}/create-dropout-recall`,
			headers: { "x-organization-id": ORG_ID },
		});
		assert.equal(res3.statusCode, 400);
		const b3 = JSON.parse(res3.payload);
		assert.equal(b3.success, false);
		assert.ok(b3.message.includes("не найден"));
	});

	test("9. Pipeline analytics and drop-out risk flags calculation", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/v1/treatment-plans/pipeline",
			headers: { "x-organization-id": ORG_ID },
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.payload);

		// Analytics block checks
		assert.ok(body.summary);
		assert.ok(body.summary.analytics);

		const { analytics } = body.summary;
		assert.equal(typeof analytics.acceptanceRatePercent, "number");
		assert.equal(Number.isNaN(analytics.acceptanceRatePercent), false);
		assert.ok(analytics.acceptanceRatePercent >= 0 && analytics.acceptanceRatePercent <= 100);

		assert.equal(typeof analytics.averagePlanRub, "number");
		assert.equal(Number.isNaN(analytics.averagePlanRub), false);
		assert.ok(analytics.averagePlanRub >= 0);

		assert.equal(typeof analytics.totalPipelineRub, "number");
		assert.equal(Number.isNaN(analytics.totalPipelineRub), false);
		assert.ok(analytics.totalPipelineRub > 0);

		assert.equal(typeof analytics.dropoutRiskCount, "number");
		assert.equal(typeof analytics.totalPlansCount, "number");
		assert.ok(analytics.totalPlansCount >= 3);

		// Verify cards have boolean isDropoutRisk and sanitized numbers
		const allCards = [
			...body.pipeline.requires_budget,
			...body.pipeline.awaiting_decision,
			...body.pipeline.no_appointment,
			...body.pipeline.in_progress_abandoned,
			...body.pipeline.completed,
		];

		assert.ok(allCards.length > 0);
		for (const card of allCards) {
			assert.equal(typeof card.isDropoutRisk, "boolean");
			assert.equal(Number.isNaN(card.totalPriceRub), false);
			assert.equal(Number.isNaN(card.daysSinceLastActivity), false);
		}
	});
});
