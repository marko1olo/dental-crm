import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import type { TenantDb } from "../../db/rls.js";
import {
	chairs,
	clinics,
	communicationOutbox,
	organizations,
	patients,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	treatmentPlanStages,
	users,
	visits,
} from "../../db/schema.js";
import { applyAppointmentStatusTransitions } from "../../routes/appointments/appointmentsStatusRoutes.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import {
	batchSyncUpdatePlanItemsNew,
	batchSyncUpdatePlanStages,
	batchSyncUpdateTreatmentItems,
} from "../../routes/treatmentPlan/handlers/mutations/treatmentPlanBatchUpdate.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { applyReceipts } from "../../services/communications/deliveryReceipts.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "wave6AuditGaps";
const ORG_A = fixtureUuid(FIXTURE, 1);
const ORG_B = fixtureUuid(FIXTURE, 2);
const PATIENT_A = fixtureUuid(FIXTURE, 3);
const PATIENT_B = fixtureUuid(FIXTURE, 4);
const DOCTOR_A = fixtureUuid(FIXTURE, 5);
const CHAIR_A = fixtureUuid(FIXTURE, 6);
const PLAN_A = fixtureUuid(FIXTURE, 7);
const PLAN_B = fixtureUuid(FIXTURE, 8);
const VISIT_A = fixtureUuid(FIXTURE, 9);
const ACTIVE_SESSION_ID = fixtureUuid(FIXTURE, 10);
const STALE_SESSION_ID = fixtureUuid(FIXTURE, 11);

describe("Wave 6: Plan Batch VALUES Updates, Schedule Auth/Session Guard, Status Guard & Receipt Batching", () => {
	let app: FastifyInstance;
	let databaseReady = true;
	let validStaffToken = "";
	let staleStaffToken = "";
	let nullSessionStaffToken = "";
	let clinicToken = "";
	let capturedRequest: FastifyRequest | undefined;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORG_A, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORG_A,
					name: "Клиника Волна 6 А",
				})
				.onConflictDoNothing();

			await db
				.insert(clinics)
				.values({
					id: ORG_A,
					organizationId: ORG_A,
					name: "Филиал Волна 6 А",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values({
					id: DOCTOR_A,
					organizationId: ORG_A,
					fullName: "Д-р Волна А.А.",
					role: "doctor",
					isActive: true,
					currentSessionId: ACTIVE_SESSION_ID,
				})
				.onConflictDoUpdate({
					target: users.id,
					set: {
						isActive: true,
						currentSessionId: ACTIVE_SESSION_ID,
					},
				});

			await db
				.insert(chairs)
				.values({
					id: CHAIR_A,
					organizationId: ORG_A,
					clinicId: ORG_A,
					name: "Кабинет 1",
					isActive: true,
				})
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_A,
					organizationId: ORG_A,
					fullName: "Пациент Волна А",
					phone: "+79990001122",
				})
				.onConflictDoNothing();

			await db
				.insert(visits)
				.values({
					id: VISIT_A,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					status: "signed",
				})
				.onConflictDoNothing();

			await db
				.insert(treatmentPlans)
				.values({
					id: PLAN_A,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					name: "План Волна А",
					status: "Active",
					totalPrice: "10000",
					planDiscountRub: 0,
				})
				.onConflictDoNothing();
		});

		await withFixtureTenant(ORG_B, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORG_B,
					name: "Клиника Волна 6 Б",
				})
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_B,
					organizationId: ORG_B,
					fullName: "Пациент Волна Б",
					phone: "+79990003344",
				})
				.onConflictDoNothing();

			await db
				.insert(treatmentPlans)
				.values({
					id: PLAN_B,
					organizationId: ORG_B,
					patientId: PATIENT_B,
					name: "План Волна Б",
					status: "Active",
					totalPrice: "5000",
					planDiscountRub: 0,
				})
				.onConflictDoNothing();
		});

		const secret = authTokenSecret();
		validStaffToken = signToken(
			{
				organizationId: ORG_A,
				userId: DOCTOR_A,
				role: "doctor",
				sessionId: ACTIVE_SESSION_ID,
			},
			secret,
		);
		staleStaffToken = signToken(
			{
				organizationId: ORG_A,
				userId: DOCTOR_A,
				role: "doctor",
				sessionId: STALE_SESSION_ID,
			},
			secret,
		);
		nullSessionStaffToken = signToken(
			{
				organizationId: ORG_A,
				userId: DOCTOR_A,
				role: "doctor",
			},
			secret,
		);
		clinicToken = signToken({ organizationId: ORG_A }, secret);

		app = createTenantTestApp();
		app.addHook("onRequest", async (req) => {
			capturedRequest = req;
		});
		await registerScheduleRoutes(app);
		await app.ready();
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_A, ORG_B]).catch(() => {});
		}
	});

	test("batchSyncUpdateTreatmentItems executes 0 queries on empty input and 1 FOR UPDATE + 1 UPDATE...VALUES batch with cross-org isolation", async (t) => {
		if (!databaseReady) return t.skip("Database unavailable");

		// 1. Empty array guard: zero DB calls inside real TenantDb
		let emptyCalls = 0;
		await withFixtureTenant(ORG_A, async (tx) => {
			const spyEmptyTx: TenantDb = new Proxy(tx, {
				get(target, prop, receiver) {
					if (prop === "select" || prop === "execute") {
						emptyCalls += 1;
					}
					return Reflect.get(target, prop, receiver);
				},
			});
			await batchSyncUpdateTreatmentItems(spyEmptyTx, ORG_A, []);
		});
		assert.equal(emptyCalls, 0);

		// 2. Seed items in ORG_A and ORG_B (out-of-order UUIDs + duplicate entry in payload)
		const idPool = [randomUUID(), randomUUID(), randomUUID()].sort((a, b) =>
			a.localeCompare(b),
		);
		const itemALow = idPool[0] as string;
		const itemBCrossOrg = idPool[1] as string;
		const itemAHigh = idPool[2] as string;

		await withFixtureTenant(ORG_A, async () => {
			await db.insert(treatmentItems).values([
				{
					id: itemAHigh,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					treatmentPlanId: PLAN_A,
					title: "Старая пломба 1",
					quantity: "1",
					priceRub: 1000,
					unitPriceRub: 1000,
					priceKopecks: 100000n,
					unitPriceKopecks: 100000n,
					status: "proposed",
				},
				{
					id: itemALow,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					treatmentPlanId: PLAN_A,
					title: "Старая пломба 2",
					quantity: "1",
					priceRub: 2000,
					unitPriceRub: 2000,
					priceKopecks: 200000n,
					unitPriceKopecks: 200000n,
					status: "proposed",
				},
			]);
		});

		await withFixtureTenant(ORG_B, async () => {
			await db.insert(treatmentItems).values({
				id: itemBCrossOrg,
				organizationId: ORG_B,
				patientId: PATIENT_B,
				treatmentPlanId: PLAN_B,
				title: "Чужой зубной имплант",
				quantity: "1",
				priceRub: 9900,
				unitPriceRub: 9900,
				priceKopecks: 990000n,
				unitPriceKopecks: 990000n,
				status: "proposed",
			});
		});

		const executedSqlStrings: string[] = [];
		await withFixtureTenant(ORG_A, async (tx) => {
			const originalExecute = tx.execute.bind(tx);
			const wrappedTx: TenantDb = new Proxy(tx, {
				get(target, prop, receiver) {
					if (prop === "execute") {
						return (query: Parameters<TenantDb["execute"]>[0]) => {
							const text =
								typeof query === "object" &&
								query !== null &&
								"queryChunks" in query
									? JSON.stringify(query)
									: String(query);
							executedSqlStrings.push(text);
							return originalExecute(query);
						};
					}
					return Reflect.get(target, prop, receiver);
				},
			});

			// Pass items unsorted + duplicate itemAHigh + foreign itemBCrossOrg
			await batchSyncUpdateTreatmentItems(wrappedTx, ORG_A, [
				{
					id: itemAHigh,
					serviceId: null,
					toothCode: "16",
					title: "Устаревший дубль",
					quantity: "1",
					priceRub: 10,
					unitPriceRub: 10,
					discountRub: 0,
					priceKopecks: 1000n,
					unitPriceKopecks: 1000n,
					discountKopecks: 0n,
					status: "proposed",
					plannedDoctorUserId: null,
					treatmentPlanItemId: null,
				},
				{
					id: itemBCrossOrg,
					serviceId: null,
					toothCode: "99",
					title: "ВЗЛОМ ЧУЖОЙ ОРГАНИЗАЦИИ",
					quantity: "1",
					priceRub: 1,
					unitPriceRub: 1,
					discountRub: 0,
					priceKopecks: 100n,
					unitPriceKopecks: 100n,
					discountKopecks: 0n,
					status: "approved",
					plannedDoctorUserId: null,
					treatmentPlanItemId: null,
				},
				{
					id: itemALow,
					serviceId: null,
					toothCode: "26",
					title: "Новая пломба 2",
					quantity: "2",
					priceRub: 5000,
					unitPriceRub: 2500,
					discountRub: 0,
					priceKopecks: 500000n,
					unitPriceKopecks: 250000n,
					discountKopecks: 0n,
					status: "approved",
					plannedDoctorUserId: DOCTOR_A,
					treatmentPlanItemId: null,
				},
				{
					id: itemAHigh,
					serviceId: null,
					toothCode: "16",
					title: "Финальная пломба 1",
					quantity: "1",
					priceRub: 3500,
					unitPriceRub: 3500,
					discountRub: 0,
					priceKopecks: 350000n,
					unitPriceKopecks: 350000n,
					discountKopecks: 0n,
					status: "approved",
					plannedDoctorUserId: DOCTOR_A,
					treatmentPlanItemId: null,
				},
			]);
		});

		// Verify single batch UPDATE...VALUES SQL was executed (not 1 per row)
		const updateStatements = executedSqlStrings.filter((s) =>
			s.includes("UPDATE treatment_items AS t"),
		);
		assert.equal(updateStatements.length, 1);

		const orgARows = await withFixtureTenant(ORG_A, async () =>
			db
				.select()
				.from(treatmentItems)
				.where(
					and(
						eq(treatmentItems.organizationId, ORG_A),
						inArray(treatmentItems.id, [itemALow, itemAHigh]),
					),
				),
		);
		const rowLow = orgARows.find((r) => r.id === itemALow);
		const rowHigh = orgARows.find((r) => r.id === itemAHigh);
		assert.equal(rowLow?.title, "Новая пломба 2");
		assert.equal(rowLow?.priceKopecks, 500000n);
		assert.equal(rowLow?.status, "approved");
		assert.equal(rowHigh?.title, "Финальная пломба 1");
		assert.equal(rowHigh?.priceKopecks, 350000n);

		// ORG_B row MUST remain completely untouched
		const [orgBRow] = await withFixtureTenant(ORG_B, async () =>
			db
				.select()
				.from(treatmentItems)
				.where(eq(treatmentItems.id, itemBCrossOrg)),
		);
		assert.equal(orgBRow?.title, "Чужой зубной имплант");
		assert.equal(orgBRow?.priceKopecks, 990000n);
		assert.equal(orgBRow?.status, "proposed");
	});

	test("batchSyncUpdatePlanStages and batchSyncUpdatePlanItemsNew update rows in batch with tenant isolation", async (t) => {
		if (!databaseReady) return t.skip("Database unavailable");

		const stageA = randomUUID();
		const stageB = randomUUID();
		const planItemA = randomUUID();
		const planItemB = randomUUID();

		await withFixtureTenant(ORG_A, async () => {
			await db.insert(treatmentPlanStages).values({
				id: stageA,
				planId: PLAN_A,
				organizationId: ORG_A,
				stageOrder: 1,
				stageName: "Старое имя этапа",
				completionPercentage: 0,
			});
			await db.insert(treatmentPlanItemsNew).values({
				id: planItemA,
				planId: PLAN_A,
				organizationId: ORG_A,
				stageId: stageA,
				priceId: "A16.07.002::Старая",
				phase: 1,
				toothNumber: 11,
				quantity: 1,
				price: "1000",
				discount: "0",
			});
		});

		await withFixtureTenant(ORG_B, async () => {
			await db.insert(treatmentPlanStages).values({
				id: stageB,
				planId: PLAN_B,
				organizationId: ORG_B,
				stageOrder: 1,
				stageName: "Этап чужой клиники",
				completionPercentage: 10,
			});
			await db.insert(treatmentPlanItemsNew).values({
				id: planItemB,
				planId: PLAN_B,
				organizationId: ORG_B,
				stageId: stageB,
				priceId: "A16.07.002::Чужая",
				phase: 1,
				toothNumber: 21,
				quantity: 1,
				price: "8000",
				discount: "0",
			});
		});

		await withFixtureTenant(ORG_A, async (tx) => {
			await batchSyncUpdatePlanStages(tx, ORG_A, [
				{ id: stageA, stageName: "Новое имя этапа", completionPercentage: 75 },
				{ id: stageB, stageName: "ВЗЛОМ ЭТАПА", completionPercentage: 100 },
			]);
			await batchSyncUpdatePlanItemsNew(tx, ORG_A, [
				{
					id: planItemA,
					stageId: stageA,
					toothNumber: 12,
					priceId: "A16.07.002::Обновлённая",
					name: "Обновлённая пломба",
					quantity: 2,
					price: "4200",
					discount: "200",
					priceKopecks: 420000n,
					discountKopecks: 20000n,
					commissionKopecks: 50000n,
					phase: 2,
					isBundle: true,
					doctorId: DOCTOR_A,
				},
				{
					id: planItemB,
					stageId: stageB,
					toothNumber: 99,
					priceId: "HACK",
					name: "HACK",
					quantity: 1,
					price: "1",
					discount: "0",
					priceKopecks: 100n,
					discountKopecks: 0n,
					commissionKopecks: 0n,
					phase: 1,
					isBundle: false,
					doctorId: null,
				},
			]);
		});

		const [updatedStageA] = await withFixtureTenant(ORG_A, async () =>
			db
				.select()
				.from(treatmentPlanStages)
				.where(eq(treatmentPlanStages.id, stageA)),
		);
		const [untouchedStageB] = await withFixtureTenant(ORG_B, async () =>
			db
				.select()
				.from(treatmentPlanStages)
				.where(eq(treatmentPlanStages.id, stageB)),
		);
		assert.equal(updatedStageA?.stageName, "Новое имя этапа");
		assert.equal(updatedStageA?.completionPercentage, 75);
		assert.equal(untouchedStageB?.stageName, "Этап чужой клиники");
		assert.equal(untouchedStageB?.completionPercentage, 10);

		const [updatedItemA] = await withFixtureTenant(ORG_A, async () =>
			db
				.select()
				.from(treatmentPlanItemsNew)
				.where(eq(treatmentPlanItemsNew.id, planItemA)),
		);
		const [untouchedItemB] = await withFixtureTenant(ORG_B, async () =>
			db
				.select()
				.from(treatmentPlanItemsNew)
				.where(eq(treatmentPlanItemsNew.id, planItemB)),
		);
		assert.equal(updatedItemA?.priceKopecks, 420000n);
		assert.equal(updatedItemA?.commissionKopecks, 50000n);
		assert.equal(updatedItemA?.isBundle, true);
		assert.equal(untouchedItemB?.priceId, "A16.07.002::Чужая");
	});

	test("Schedule routes reject revoked & missing-sessionId staff tokens with 401 invalid_session while allowing active staff & clinic tokens", async (t) => {
		if (!databaseReady) return t.skip("Database unavailable");

		const prevReads = process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		const prevMutations = process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
		const prevSchedUnguarded =
			process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS;
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "0";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "0";
		process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS = "0";

		try {
			const readEndpoints = [
				"/api/appointments",
				`/api/appointments/${fixtureUuid(FIXTURE, 77)}`,
				"/api/schedule/workplaces",
				"/api/schedule/slots",
				"/api/schedule/shifts",
				"/api/schedule/clipboard-items",
				"/api/schedule/urgent-schedule-requests",
			];

			for (const url of readEndpoints) {
				const staleRes = await app.inject({
					method: "GET",
					url,
					headers: { "x-dente-staff-token": staleStaffToken },
				});
				assert.equal(
					staleRes.statusCode,
					401,
					`Expected 401 for stale token on ${url}: ${staleRes.body}`,
				);
				assert.equal(
					staleRes.json().error,
					"invalid_session",
					`Expected invalid_session on ${url}`,
				);

				const nullSessRes = await app.inject({
					method: "GET",
					url,
					headers: { "x-dente-staff-token": nullSessionStaffToken },
				});
				assert.equal(
					nullSessRes.statusCode,
					401,
					`Expected 401 for null sessionId on ${url}: ${nullSessRes.body}`,
				);
				assert.equal(
					nullSessRes.json().error,
					"invalid_session",
					`Expected invalid_session on ${url}`,
				);
			}

			// Mutating endpoints must also reject revoked staff session
			const stalePostShift = await app.inject({
				method: "POST",
				url: "/api/schedule/shifts",
				headers: { "x-dente-staff-token": staleStaffToken },
				payload: { shifts: [] },
			});
			assert.equal(stalePostShift.statusCode, 401);
			assert.equal(stalePostShift.json().error, "invalid_session");

			const stalePatchStatus = await app.inject({
				method: "PATCH",
				url: `/api/appointments/${fixtureUuid(FIXTURE, 77)}/status`,
				headers: { "x-dente-staff-token": staleStaffToken },
				payload: { status: "completed" },
			});
			assert.equal(stalePatchStatus.statusCode, 401);
			assert.equal(stalePatchStatus.json().error, "invalid_session");

			// Valid active staff session succeeds on schedule reads
			const validWorkplacesRes = await app.inject({
				method: "GET",
				url: "/api/schedule/workplaces",
				headers: { "x-dente-staff-token": validStaffToken },
			});
			assert.equal(validWorkplacesRes.statusCode, 200, validWorkplacesRes.body);
			assert.equal(validWorkplacesRes.json().count, 1);

			// Valid clinic-only token (no userId) still permitted for cabinet/solo reads
			const clinicWorkplacesRes = await app.inject({
				method: "GET",
				url: "/api/schedule/workplaces",
				headers: { "x-dente-clinic-token": clinicToken },
			});
			assert.equal(
				clinicWorkplacesRes.statusCode,
				200,
				clinicWorkplacesRes.body,
			);
		} finally {
			if (prevReads === undefined)
				delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
			else process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = prevReads;
			if (prevMutations === undefined)
				delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
			else
				process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = prevMutations;
			if (prevSchedUnguarded === undefined)
				delete process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS;
			else
				process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS =
					prevSchedUnguarded;
		}
	});

	test("POST /api/appointments with includeDashboard returns committed appointment and applyAppointmentStatusTransitions avoids duplicate BOM lookup when already completed", async (t) => {
		if (!databaseReady) return t.skip("Database unavailable");

		// 1. POST /api/appointments?includeDashboard=true returns post-COMMIT dashboard with new appointment
		const uniqueFutureOffsetDays = 30 + Math.floor(Math.random() * 900);
		const startsAt = new Date(
			Date.now() + uniqueFutureOffsetDays * 24 * 3600_000,
		);
		const endsAt = new Date(startsAt.getTime() + 30 * 60_000);

		const createRes = await app.inject({
			method: "POST",
			url: "/api/appointments?includeDashboard=true",
			headers: {
				"x-dente-staff-token": validStaffToken,
				"Content-Type": "application/json",
			},
			payload: {
				patientId: PATIENT_A,
				doctorUserId: DOCTOR_A,
				chairId: CHAIR_A,
				startsAt: startsAt.toISOString(),
				endsAt: endsAt.toISOString(),
				reason: "Первичный осмотр Волна 6",
			},
		});
		assert.equal(
			createRes.statusCode,
			201,
			`Expected 201, got ${createRes.statusCode}: ${createRes.body}`,
		);
		const createJson = createRes.json();
		assert.ok(createJson.appointment?.id);
		assert.ok(
			createJson.dashboard,
			"includeDashboard=true must include post-COMMIT dashboard",
		);
		assert.ok(capturedRequest, "onRequest hook should capture FastifyRequest");

		// 2. applyAppointmentStatusTransitions skips redundant fallback visit SELECT / BOM writeoff when already completed
		let selectCountWhenAlreadyCompleted = 0;
		await withFixtureTenant(ORG_A, async (tx) => {
			const spyTx = new Proxy(tx, {
				get(target, prop, receiver) {
					if (prop === "select") {
						selectCountWhenAlreadyCompleted += 1;
					}
					return Reflect.get(target, prop, receiver);
				},
			});
			await applyAppointmentStatusTransitions(
				spyTx,
				capturedRequest as FastifyRequest,
				ORG_A,
				createJson.appointment.id,
				"completed",
				"completed",
			);
		});
		assert.equal(selectCountWhenAlreadyCompleted, 0);

		// Contrast: transitioning FROM planned TO completed MUST perform the visit lookup
		let selectCountWhenTransitioning = 0;
		await withFixtureTenant(ORG_A, async (tx) => {
			const spyTx = new Proxy(tx, {
				get(target, prop, receiver) {
					if (prop === "select") {
						selectCountWhenTransitioning += 1;
					}
					return Reflect.get(target, prop, receiver);
				},
			});
			await applyAppointmentStatusTransitions(
				spyTx,
				capturedRequest as FastifyRequest,
				ORG_A,
				createJson.appointment.id,
				"completed",
				"planned",
			);
		});
		assert.ok(selectCountWhenTransitioning >= 1);
	});

	test("applyReceipts batches updates per organization and enforces delivered > failed precedence on duplicate IDs", async (t) => {
		if (!databaseReady) return t.skip("Database unavailable");

		const runSuffix = randomUUID().slice(0, 8);
		const outboxA1 = randomUUID();
		const outboxA2 = randomUUID();
		const outboxB1 = randomUUID();
		const msgA1 = `wave6-msg-${runSuffix}-a1`;
		const msgA2 = `wave6-msg-${runSuffix}-a2`;
		const msgB1 = `wave6-msg-${runSuffix}-b1`;
		const now = new Date();

		await withFixtureTenant(ORG_A, async () => {
			await db.insert(communicationOutbox).values([
				{
					id: outboxA1,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					channel: "sms",
					intent: "appointment_confirmation",
					recipientAddress: "79990001122",
					body: "Сообщение A1",
					status: "sent",
					providerMessageId: msgA1,
					dedupeKey: `wave6:${runSuffix}:a1`,
				},
				{
					id: outboxA2,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					channel: "sms",
					intent: "appointment_confirmation",
					recipientAddress: "79990001122",
					body: "Сообщение A2",
					status: "sent",
					providerMessageId: msgA2,
					dedupeKey: `wave6:${runSuffix}:a2`,
				},
			]);
		});

		await withFixtureTenant(ORG_B, async () => {
			await db.insert(communicationOutbox).values({
				id: outboxB1,
				organizationId: ORG_B,
				patientId: PATIENT_B,
				channel: "sms",
				intent: "appointment_confirmation",
				recipientAddress: "79990003344",
				body: "Сообщение B1",
				status: "sent",
				providerMessageId: msgB1,
				dedupeKey: `wave6:${runSuffix}:b1`,
			});
		});

		const report = await applyReceipts(
			[
				// Duplicate providerMessageId: delivered first, failed second -> delivered MUST win
				{
					providerMessageId: msgA1,
					state: "delivered",
					detail: "SMS.RU: Доставлено",
				},
				{
					providerMessageId: msgA1,
					state: "failed",
					detail: "SMS.RU: Поздний ложный сбой",
				},
				{
					providerMessageId: msgA2,
					state: "failed",
					detail: "SMS.RU: Не доставлено (код 106)",
				},
				{
					providerMessageId: msgB1,
					state: "delivered",
					detail: "SMS.RU: Доставлено B1",
				},
				{
					providerMessageId: `wave6-unknown-${runSuffix}`,
					state: "delivered",
					detail: "Missing",
				},
			],
			now,
		);

		assert.deepEqual(report, {
			applied: 3,
			delivered: 2,
			failed: 1,
			unmatched: 1,
			ignored: 0,
		});

		const [rowA1, rowA2] = await withFixtureTenant(ORG_A, async () =>
			db
				.select()
				.from(communicationOutbox)
				.where(inArray(communicationOutbox.id, [outboxA1, outboxA2])),
		);
		const byRowId = new Map(
			[rowA1, rowA2]
				.filter((r): r is NonNullable<typeof r> => Boolean(r))
				.map((r) => [r.id, r]),
		);
		assert.equal(byRowId.get(outboxA1)?.status, "delivered");
		assert.equal(byRowId.get(outboxA1)?.receiptDetail, "SMS.RU: Доставлено");
		assert.equal(byRowId.get(outboxA2)?.status, "failed");
		assert.equal(byRowId.get(outboxA2)?.lastErrorClass, "not_delivered");

		const [rowB1] = await withFixtureTenant(ORG_B, async () =>
			db
				.select()
				.from(communicationOutbox)
				.where(eq(communicationOutbox.id, outboxB1)),
		);
		assert.equal(rowB1?.status, "delivered");
		assert.equal(rowB1?.receiptDetail, "SMS.RU: Доставлено B1");
	});
});
