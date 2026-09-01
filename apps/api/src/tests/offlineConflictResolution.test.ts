import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { computePayloadHash } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	organizations,
	patients,
	toothStateHistory,
	toothStates,
	users,
} from "../db/schema.js";
import { registerOdontogramRoutes } from "../routes/odontogram.js";
import { registerScheduleRoutes } from "../routes/schedule.js";
import { registerSyncRoutes } from "../routes/sync.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "offlineConflictResolution";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);

const DOCTOR_ID = fixtureUuid(NAMESPACE, 10);
const CHAIR_ID = fixtureUuid(NAMESPACE, 30);
const PATIENT_1_ID = fixtureUuid(NAMESPACE, 40);
const PATIENT_2_ID = fixtureUuid(NAMESPACE, 41);

const ADMIN_SECRET_HEADER = "x-dente-admin-secret";
const SECRET_VARIABLE = "DENTE_SCHEDULE_ADMIN_SECRET";

describe("Offline CRDT & Conflict Resolution (Odontogram LWW + Schedule 409)", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let doctorToken: string;
	let databaseAvailable = true;
	const adminSecret = randomBytes(24).toString("base64url");

	before(async () => {
		process.env[SECRET_VARIABLE] = adminSecret;
		app = createTenantTestApp();
		await registerOdontogramRoutes(app);
		await registerScheduleRoutes(app);
		await registerSyncRoutes(app);
		await app.ready();

		clinicToken = signToken(
			{ organizationId: ORG_ID },
			authTokenSecret(),
		);
		doctorToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" },
			authTokenSecret(),
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника оффлайн-разрешения коллизий",
				});
				await tx.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Тестовое отделение",
				});
				await tx.insert(users).values([
					{
						id: DOCTOR_ID,
						organizationId: ORG_ID,
						fullName: "Доктор Оффлайн Проверен",
						role: "doctor",
						isActive: true,
					},
				]);
				await tx.insert(chairs).values([
					{
						id: CHAIR_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Кресло 1",
						isActive: true,
					},
				]);
				await tx.insert(patients).values([
					{
						id: PATIENT_1_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Зубной Конфликт",
						phone: "+79001112233",
					},
					{
						id: PATIENT_2_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Слот Конфликт",
						phone: "+79004445566",
					},
				]);
			});
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				databaseAvailable = false;
				return;
			}
			throw error;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
		await app.close();
	});

	test("1. Odontogram Split-Brain Tooth Mutation: LWW resolution with complete 043/u audit history", async () => {
		if (!databaseAvailable) return;

		const toothNumber = 36;
		const baseTime = Date.now() - 3600 * 1000;
		const timestampOlder = new Date(baseTime - 10 * 60 * 1000).toISOString();
		const timestampNewer = new Date(baseTime).toISOString();

		// Step A: Doctor B (offline, timestampNewer) sets tooth 36 to 'Pulpitis'
		const resDocB = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_1_ID}/tooth-states/batch`,
			headers: {
				"x-dente-staff-token": doctorToken,
				"x-dente-clinic-token": clinicToken,
				"content-type": "application/json",
			},
			payload: {
				toothNumbers: [toothNumber],
				state: "Pulpitis",
				notes: "Острый очаговый пульпит",
				updatedAt: timestampNewer,
				version: 2,
				reason: "Осмотр врача Б (оффлайн)",
			},
		});

		assert.equal(resDocB.statusCode, 200, "Doctor B update should succeed");
		const bodyB = JSON.parse(resDocB.body);
		assert.equal(bodyB.success, true);

		// Step B: Doctor A (offline sync catch-up with older timestamp) sets tooth 36 to 'Caries'
		const resDocA = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_1_ID}/tooth-states/batch`,
			headers: {
				"x-dente-staff-token": doctorToken,
				"x-dente-clinic-token": clinicToken,
				"content-type": "application/json",
			},
			payload: {
				toothNumbers: [toothNumber],
				state: "Caries",
				notes: "Глубокий кариес",
				updatedAt: timestampOlder,
				version: 1,
				reason: "Осмотр врача А (оффлайн)",
			},
		});

		assert.equal(resDocA.statusCode, 200, "Doctor A update should be accepted and archived");
		const bodyA = JSON.parse(resDocA.body);
		assert.equal(bodyA.success, true);

		// Step C: Verify Active Tooth State in DB follows LWW (remains 'Pulpitis')
		const currentActiveState = await db
			.select()
			.from(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, ORG_ID),
					eq(toothStates.patientId, PATIENT_1_ID),
					eq(toothStates.toothNumber, toothNumber),
				),
			);

		assert.equal(currentActiveState.length, 1, "Should have 1 active tooth state");
		assert.equal(currentActiveState[0]!.state, "Pulpitis", "Active state must be 'Pulpitis' via LWW");

		// Step D: Verify Complete 043/u Audit History (both transitions preserved)
		const history = await db
			.select()
			.from(toothStateHistory)
			.where(
				and(
					eq(toothStateHistory.organizationId, ORG_ID),
					eq(toothStateHistory.patientId, PATIENT_1_ID),
					eq(toothStateHistory.toothNumber, toothNumber),
				),
			);

		assert.ok(history.length >= 2, "Audit history must contain both mutations without data loss");
		const hasPulpitis = history.some((h) => h.newState === "Pulpitis");
		const hasCaries = history.some((h) => h.newState === "Caries");
		assert.ok(hasPulpitis, "Audit history must contain Pulpitis");
		assert.ok(hasCaries, "Audit history must contain Caries");
	});

	test("2. Schedule Double Booking 409 Conflict with Alternative Slot Suggestions", async () => {
		if (!databaseAvailable) return;

		const startsAt1400 = "2028-11-01T14:00:00.000Z";
		const endsAt1430 = "2028-11-01T14:30:00.000Z";

		// Step A: Device 1 books Doctor at 14:00 (HTTP 201)
		const resBooking1 = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: {
				authorization: `Bearer ${doctorToken}`,
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
				"content-type": "application/json",
			},
			payload: {
				patientId: PATIENT_1_ID,
				doctorUserId: DOCTOR_ID,
				chairId: CHAIR_ID,
				startsAt: startsAt1400,
				endsAt: endsAt1430,
				reason: "Плановый осмотр (Устройство 1)",
			},
		});

		assert.equal(resBooking1.statusCode, 201, "First booking at 14:00 must succeed with HTTP 201");

		// Step B: Device 2 (offline sync or concurrent request) tries to book Doctor at 14:00 -> HTTP 409 Conflict
		const resBooking2 = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: {
				authorization: `Bearer ${doctorToken}`,
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
				"content-type": "application/json",
			},
			payload: {
				patientId: PATIENT_2_ID,
				doctorUserId: DOCTOR_ID,
				chairId: CHAIR_ID,
				startsAt: startsAt1400,
				endsAt: endsAt1430,
				reason: "Конкурентная запись (Устройство 2)",
			},
		});

		assert.equal(resBooking2.statusCode, 409, "Second concurrent booking at 14:00 must be rejected with HTTP 409");
		const bodyConflict = JSON.parse(resBooking2.body);
		assert.equal(bodyConflict.error, "SlotConflict", "Error field must be SlotConflict");
		assert.equal(bodyConflict.code, "AppointmentCreateRejected");
		assert.ok(Array.isArray(bodyConflict.suggestedSlots), "suggestedSlots must be an array");
		assert.ok(bodyConflict.suggestedSlots.length > 0, "suggestedSlots must contain alternative slots");
		assert.ok(bodyConflict.suggestedSlots.includes("14:30"), "suggestedSlots should include 14:30");

		// Step C: Device 2 accepts suggested slot 14:30 and books successfully (HTTP 201)
		const startsAt1430 = "2028-11-01T14:30:00.000Z";
		const endsAt1500 = "2028-11-01T15:00:00.000Z";

		const resBookingRescheduled = await app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: {
				authorization: `Bearer ${doctorToken}`,
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
				"content-type": "application/json",
			},
			payload: {
				patientId: PATIENT_2_ID,
				doctorUserId: DOCTOR_ID,
				chairId: CHAIR_ID,
				startsAt: startsAt1430,
				endsAt: endsAt1500,
				reason: "Запись на предложенный альтернативный слот 14:30",
			},
		});

		assert.equal(resBookingRescheduled.statusCode, 201, "Rescheduled booking at 14:30 must succeed with HTTP 201");
	});

	test("3. Sync Gateway Push & Pull: Odontogram CRDT mutation merging and offline catch-up", async () => {
		if (!databaseAvailable) return;

		const toothNumber = 46;
		const timestampOlder = "2026-09-01T08:00:00.000Z";
		const timestampNewer = "2026-09-01T09:00:00.000Z";

		const payloadB = {
			patientId: PATIENT_1_ID,
			toothNumber,
			state: "Root_Canal_Treated",
			notes: "Эндодонтическое лечение (девайс Б)",
		};

		// Push mutation 1 from Device B (newer timestamp, 'Root_Canal_Treated')
		const pushResB = await app.inject({
			method: "POST",
			url: "/api/sync/gateway",
			headers: {
				"x-dente-staff-token": doctorToken,
				"x-dente-clinic-token": clinicToken,
				"content-type": "application/json",
			},
			payload: {
				syncBatchId: "batch-doc-b-1",
				clientId: "device-doctor-b",
				sentAt: new Date().toISOString(),
				mutations: [
					{
						mutationId: "mut-doc-b-1",
						idempotencyKey: "idem-doc-b-1",
						payloadHash: computePayloadHash(payloadB),
						entityKind: "odontogram_state",
						entityId: `${PATIENT_1_ID}-${toothNumber}`,
						action: "upsert",
						payload: payloadB,
						vectorClock: { "device-doctor-b": 2 },
						updatedAt: timestampNewer,
					},
				],
			},
		});

		assert.equal(pushResB.statusCode, 200, "Push mutation from Device B should succeed");
		const pushBodyB = JSON.parse(pushResB.body);
		assert.equal(pushBodyB.processedCount, 1);
		assert.equal(pushBodyB.results[0]?.error ?? "", "", `Mutation failed with: ${pushBodyB.results[0]?.error}`);
		assert.ok(pushBodyB.appliedCount === 1 || pushBodyB.mergedCount === 1);

		const payloadA = {
			patientId: PATIENT_1_ID,
			toothNumber,
			state: "Caries",
			notes: "Старый кариес (девайс А)",
		};

		// Push mutation 2 from Device A (older timestamp, 'Caries')
		const pushResA = await app.inject({
			method: "POST",
			url: "/api/sync/gateway",
			headers: {
				"x-dente-staff-token": doctorToken,
				"x-dente-clinic-token": clinicToken,
				"content-type": "application/json",
			},
			payload: {
				syncBatchId: "batch-doc-a-1",
				clientId: "device-doctor-a",
				sentAt: new Date().toISOString(),
				mutations: [
					{
						mutationId: "mut-doc-a-1",
						idempotencyKey: "idem-doc-a-1",
						payloadHash: computePayloadHash(payloadA),
						entityKind: "odontogram_state",
						entityId: `${PATIENT_1_ID}-${toothNumber}`,
						action: "upsert",
						payload: payloadA,
						vectorClock: { "device-doctor-a": 1 },
						updatedAt: timestampOlder,
					},
				],
			},
		});

		assert.equal(pushResA.statusCode, 200, "Push mutation from Device A should succeed");
		const pushBodyA = JSON.parse(pushResA.body);
		assert.equal(pushBodyA.processedCount, 1);

		// Verify active tooth 46 state remains 'Root_Canal_Treated'
		const tooth46 = await db
			.select()
			.from(toothStates)
			.where(
				and(
					eq(toothStates.organizationId, ORG_ID),
					eq(toothStates.patientId, PATIENT_1_ID),
					eq(toothStates.toothNumber, toothNumber),
				),
			);

		assert.equal(tooth46.length, 1);
		assert.equal(tooth46[0]!.state, "Root_Canal_Treated", "LWW must keep newer state Root_Canal_Treated");

		// Pull changes via /api/sync/pull
		const pullRes = await app.inject({
			method: "GET",
			url: "/api/sync/pull",
			headers: {
				"x-dente-staff-token": doctorToken,
				"x-dente-clinic-token": clinicToken,
			},
		});

		assert.equal(pullRes.statusCode, 200, "Pull changes should succeed");
		const pullBody = JSON.parse(pullRes.body);
		assert.ok(Array.isArray(pullBody.toothStates), "toothStates must be present in pull response");
		const pulledTooth46 = pullBody.toothStates.find(
			(t: { toothNumber: number }) => t.toothNumber === toothNumber,
		);
		assert.ok(pulledTooth46, "Tooth 46 must be included in pull payload");
		assert.equal(pulledTooth46.state, "Root_Canal_Treated");
	});
});
