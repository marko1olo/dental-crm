/**
 * apps/api/src/tests/scheduleSlotLeaseStress.test.ts
 *
 * RED TEAM ACID CONCURRENCY & STRESS TEST SUITE: SLOT LEASE PROTOCOL (CORE-7)
 * Validates slot leasing, heartbeat extension, lease release, atomic consumption,
 * overbooking bypass, and 4D collision prevention.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	organizations,
	patients,
	scheduleSlotLeases,
	users,
} from "../db/schema.js";
import { registerScheduleRoutes } from "../routes/schedule.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "schedSlotLease";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);

const DOCTOR_ID = fixtureUuid(NAMESPACE, 10);
const CHAIR_ID = fixtureUuid(NAMESPACE, 30);
const PATIENT_ID = fixtureUuid(NAMESPACE, 40);

const ADMIN_SECRET_HEADER = "x-dente-admin-secret";
const SECRET_VARIABLE = "DENTE_SCHEDULE_ADMIN_SECRET";

describe("RED TEAM: Schedule Slot Lease Protocol & Concurrency Isolation (CORE-7)", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let databaseAvailable = true;
	const adminSecret = randomBytes(24).toString("base64url");
	const savedSecret = process.env[SECRET_VARIABLE];

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_READS = "1";
		process.env[SECRET_VARIABLE] = adminSecret;

		app = createTenantTestApp();
		await registerScheduleRoutes(app);
		await app.ready();

		clinicToken = signToken(
			{ organizationId: ORG_ID, role: "owner", scope: "clinic" },
			authTokenSecret(),
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Клиника Слот-Лизов и Бронирования",
					})
					.onConflictDoNothing();

				await tx
					.insert(clinics)
					.values({
						id: CLINIC_ID,
						organizationId: ORG_ID,
						name: "Центральное Отделение",
					})
					.onConflictDoNothing();

				await tx
					.insert(users)
					.values([
						{
							id: DOCTOR_ID,
							organizationId: ORG_ID,
							fullName: "Врач-Ортопед Соколов В.П.",
							role: "doctor",
							isActive: true,
						},
					])
					.onConflictDoNothing();

				await tx
					.insert(chairs)
					.values([
						{
							id: CHAIR_ID,
							organizationId: ORG_ID,
							clinicId: CLINIC_ID,
							name: "Кресло 1 (Ортопедия)",
							isActive: true,
						},
					])
					.onConflictDoNothing();

				await tx
					.insert(patients)
					.values([
						{
							id: PATIENT_ID,
							organizationId: ORG_ID,
							fullName: "Пациент Тестовый Т.Т.",
							phone: "+79991112233",
							status: "active",
						},
					])
					.onConflictDoNothing();
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
		await app?.close();
		if (savedSecret === undefined) delete process.env[SECRET_VARIABLE];
		else process.env[SECRET_VARIABLE] = savedSecret;

		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	async function acquireLease(payload: {
		startsAt: string;
		endsAt: string;
		holderSessionId: string;
		chairId?: string | null;
		doctorUserId?: string | null;
		patientId?: string | null;
		source?: string;
		durationSeconds?: number;
	}) {
		return app.inject({
			method: "POST",
			url: "/api/schedule/leases/acquire",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
			},
			payload,
		});
	}

	async function releaseLease(leaseToken: string) {
		return app.inject({
			method: "POST",
			url: "/api/schedule/leases/release",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
			},
			payload: { leaseToken },
		});
	}

	async function heartbeatLease(leaseToken: string, extensionSeconds = 60) {
		return app.inject({
			method: "POST",
			url: "/api/schedule/leases/heartbeat",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
			},
			payload: { leaseToken, extensionSeconds },
		});
	}

	async function createAppointment(payload: Record<string, unknown>) {
		return app.inject({
			method: "POST",
			url: "/api/appointments",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				[ADMIN_SECRET_HEADER]: adminSecret,
			},
			payload: {
				status: "planned",
				reason: "Плановый приём",
				...payload,
			},
		});
	}

	it("1.1 Successfully acquires slot lease and verifies DB record", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const res = await acquireLease({
			startsAt: "2029-03-01T10:00:00.000Z",
			endsAt: "2029-03-01T10:30:00.000Z",
			chairId: CHAIR_ID,
			doctorUserId: DOCTOR_ID,
			holderSessionId: "session-alpha",
			durationSeconds: 90,
		});

		assert.equal(res.statusCode, 201, `Expected 201 Created: ${res.body}`);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.ok(json.leaseToken, "leaseToken must be present");
		assert.equal(json.remainingSeconds, 90);

		// Verify in DB
		const [dbRecord] = await db
			.select()
			.from(scheduleSlotLeases)
			.where(
				and(
					eq(scheduleSlotLeases.organizationId, ORG_ID),
					eq(scheduleSlotLeases.leaseToken, json.leaseToken),
				),
			);

		assert.ok(dbRecord, "Lease must exist in database");
		assert.equal(dbRecord.holderSessionId, "session-alpha");
	});

	it("1.2 Conflicting acquire from another session returns 409 SLOT_LEASED", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Another session tries to acquire overlapping slot
		const res = await acquireLease({
			startsAt: "2029-03-01T10:15:00.000Z",
			endsAt: "2029-03-01T10:45:00.000Z",
			chairId: CHAIR_ID,
			doctorUserId: DOCTOR_ID,
			holderSessionId: "session-beta",
		});

		assert.equal(res.statusCode, 409, `Expected 409 Conflict: ${res.body}`);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "SLOT_LEASED");
		assert.ok(json.remainingSeconds > 0, "Remaining seconds must be positive");
		assert.ok(json.expiresAt, "expiresAt must be returned");
	});

	it("1.3 Same session renews lease smoothly (idempotent drag/edit)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const res = await acquireLease({
			startsAt: "2029-03-01T10:00:00.000Z",
			endsAt: "2029-03-01T10:30:00.000Z",
			chairId: CHAIR_ID,
			doctorUserId: DOCTOR_ID,
			holderSessionId: "session-alpha",
			durationSeconds: 120,
		});

		assert.equal(res.statusCode, 200, `Expected 200 OK: ${res.body}`);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.equal(json.renewed, true);
		assert.equal(json.remainingSeconds, 120);
	});

	it("1.4 Heartbeat extends lease expiration", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Get active token from alpha
		const [active] = await db
			.select()
			.from(scheduleSlotLeases)
			.where(
				and(
					eq(scheduleSlotLeases.organizationId, ORG_ID),
					eq(scheduleSlotLeases.holderSessionId, "session-alpha"),
				),
			)
			.limit(1);

		assert.ok(active, "Active lease for alpha must exist");

		const hbRes = await heartbeatLease(active.leaseToken, 80);
		assert.equal(hbRes.statusCode, 200, `Expected 200: ${hbRes.body}`);
		const hbJson = JSON.parse(hbRes.body);
		assert.equal(hbJson.success, true);
		assert.equal(hbJson.remainingSeconds, 80);

		// Heartbeat with nonexistent token fails
		const badHb = await heartbeatLease("fake-token-uuid-000", 60);
		assert.equal(badHb.statusCode, 409, `Expected 409 for bad token: ${badHb.body}`);
	});

	it("1.5 Release frees the slot immediately for other sessions", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const [active] = await db
			.select()
			.from(scheduleSlotLeases)
			.where(
				and(
					eq(scheduleSlotLeases.organizationId, ORG_ID),
					eq(scheduleSlotLeases.holderSessionId, "session-alpha"),
				),
			)
			.limit(1);

		assert.ok(active);

		const relRes = await releaseLease(active.leaseToken);
		assert.equal(relRes.statusCode, 200);
		const relJson = JSON.parse(relRes.body);
		assert.equal(relJson.released, true);

		// Now session-beta can acquire immediately
		const betaRes = await acquireLease({
			startsAt: "2029-03-01T10:00:00.000Z",
			endsAt: "2029-03-01T10:30:00.000Z",
			chairId: CHAIR_ID,
			doctorUserId: DOCTOR_ID,
			holderSessionId: "session-beta",
		});

		assert.equal(betaRes.statusCode, 201, `Expected 201 for beta after release: ${betaRes.body}`);

		// Clean up beta lease
		const betaJson = JSON.parse(betaRes.body);
		await releaseLease(betaJson.leaseToken);
	});

	it("1.6 10-thread concurrent acquire storm: exactly 1 wins, 9 receive 409 SLOT_LEASED", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2029-03-01T11:00:00.000Z";
		const endsAt = "2029-03-01T11:30:00.000Z";
		const concurrency = 10;

		const promises = Array.from({ length: concurrency }, (_, i) =>
			acquireLease({
				startsAt,
				endsAt,
				chairId: CHAIR_ID,
				doctorUserId: DOCTOR_ID,
				holderSessionId: `storm-session-${i}`,
			}),
		);

		const results = await Promise.all(promises);
		const successes = results.filter((r) => r.statusCode === 201);
		const conflicts = results.filter((r) => r.statusCode === 409);

		assert.equal(successes.length, 1, "Exactly 1 concurrent acquire must succeed");
		assert.equal(conflicts.length, concurrency - 1, "All other concurrent acquires must receive 409");

		// Clean up winning lease
		const winJson = JSON.parse(successes[0]!.body);
		await releaseLease(winJson.leaseToken);
	});

	it("1.7 Appointment creation atomically consumes and deletes the leaseToken", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2029-03-01T12:00:00.000Z";
		const endsAt = "2029-03-01T12:30:00.000Z";

		// 1. Acquire lease
		const acqRes = await acquireLease({
			startsAt,
			endsAt,
			chairId: CHAIR_ID,
			doctorUserId: DOCTOR_ID,
			patientId: PATIENT_ID,
			holderSessionId: "session-booking",
		});
		assert.equal(acqRes.statusCode, 201);
		const { leaseToken } = JSON.parse(acqRes.body);

		// 2. Create appointment with leaseToken
		const apptRes = await createAppointment({
			startsAt,
			endsAt,
			chairId: CHAIR_ID,
			doctorUserId: DOCTOR_ID,
			patientId: PATIENT_ID,
			leaseToken,
		});

		assert.equal(apptRes.statusCode, 201, `Expected 201: ${apptRes.body}`);

		// Await transaction commit to disk
		await new Promise((resolve) => setTimeout(resolve, 50));

		// 3. Verify lease is deleted in DB
		const [consumedLease] = await db
			.select()
			.from(scheduleSlotLeases)
			.where(
				and(
					eq(scheduleSlotLeases.organizationId, ORG_ID),
					eq(scheduleSlotLeases.leaseToken, leaseToken),
				),
			);

		assert.equal(consumedLease, undefined, "Lease must be deleted from DB after consumption");
	});

	it("1.8 Active lease blocks appointment creation from third parties without token", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2029-03-01T13:00:00.000Z";
		const endsAt = "2029-03-01T13:30:00.000Z";

		// Acquire lease by session-gamma
		const acqRes = await acquireLease({
			startsAt,
			endsAt,
			chairId: CHAIR_ID,
			doctorUserId: DOCTOR_ID,
			holderSessionId: "session-gamma",
		});
		assert.equal(acqRes.statusCode, 201);
		const { leaseToken } = JSON.parse(acqRes.body);

		// Another client attempts to book this slot without token
		const apptRes = await createAppointment({
			startsAt,
			endsAt,
			chairId: CHAIR_ID,
			doctorUserId: DOCTOR_ID,
			patientId: PATIENT_ID,
		});

		assert.equal(apptRes.statusCode, 409, `Expected 409 blocked by lease: ${apptRes.body}`);

		// Release lease
		await releaseLease(leaseToken);
	});

	it("1.9 Doctor overbooking bypasses lease block (Mandate 8e)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2029-03-01T14:00:00.000Z";
		const endsAt = "2029-03-01T14:30:00.000Z";

		// Session holds lease
		const acqRes = await acquireLease({
			startsAt,
			endsAt,
			chairId: CHAIR_ID,
			doctorUserId: DOCTOR_ID,
			holderSessionId: "session-delta",
		});
		assert.equal(acqRes.statusCode, 201);
		const { leaseToken } = JSON.parse(acqRes.body);

		// Doctor creates urgent overbooking appointment
		const apptRes = await createAppointment({
			startsAt,
			endsAt,
			chairId: CHAIR_ID,
			doctorUserId: DOCTOR_ID,
			patientId: PATIENT_ID,
			allowOverbooking: true,
			reason: "Экстренная острая боль (Mandate 8e)",
		});

		assert.equal(apptRes.statusCode, 201, `Overbooking must succeed: ${apptRes.body}`);

		// Clean up lease
		await releaseLease(leaseToken);
	});

	it("1.10 Acquire rejects slot if already occupied by approved appointment", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2029-03-01T15:00:00.000Z";
		const endsAt = "2029-03-01T15:30:00.000Z";

		// 1. Create approved appointment directly
		const apptRes = await createAppointment({
			startsAt,
			endsAt,
			chairId: CHAIR_ID,
			doctorUserId: DOCTOR_ID,
			patientId: PATIENT_ID,
			reason: "Подтвержденная запись",
		});
		assert.equal(apptRes.statusCode, 201);

		// 2. Attempt to acquire lease on occupied slot
		const acqRes = await acquireLease({
			startsAt,
			endsAt,
			chairId: CHAIR_ID,
			doctorUserId: DOCTOR_ID,
			holderSessionId: "session-late",
		});

		assert.equal(acqRes.statusCode, 409, `Expected 409 SLOT_OCCUPIED: ${acqRes.body}`);
		const json = JSON.parse(acqRes.body);
		assert.equal(json.error, "SLOT_OCCUPIED");
	});

	it("1.11 Releasing another session's lease without admin privileges is rejected with 403", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Acquire a lease from session-owner
		const acqRes = await acquireLease({
			startsAt: "2029-03-01T18:00:00.000Z",
			endsAt: "2029-03-01T18:30:00.000Z",
			chairId: CHAIR_ID,
			doctorUserId: DOCTOR_ID,
			holderSessionId: "session-owner-123",
		});
		assert.equal(acqRes.statusCode, 201);
		const { leaseToken } = JSON.parse(acqRes.body);

		// Non-privileged staff token (e.g. role "doctor")
		const doctorToken = signToken(
			{
				organizationId: ORG_ID,
				userId: DOCTOR_ID,
				role: "doctor",
				sessionId: "session-other-456",
			},
			authTokenSecret(),
		);

		// Attempt to release without matching session and as non-admin
		const relRes = await app.inject({
			method: "POST",
			url: "/api/schedule/leases/release",
			headers: {
				"content-type": "application/json",
				"x-staff-token": doctorToken,
				authorization: `Bearer ${doctorToken}`,
			},
			payload: {
				leaseToken,
				holderSessionId: "session-other-456",
			},
		});

		assert.equal(relRes.statusCode, 403);
		const json = JSON.parse(relRes.body);
		assert.equal(json.error, "PermissionDenied");

		// Clean up with owner token
		await releaseLease(leaseToken);
	});
});
