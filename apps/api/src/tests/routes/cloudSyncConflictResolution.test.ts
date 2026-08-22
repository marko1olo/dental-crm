import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
	computePayloadHash,
	createCompositeIdempotencyKey,
	type SyncPushBatchRequest,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	payments,
	syncEntityVectors,
	syncIdempotencyRecords,
	visitDiaries,
	visits,
} from "../../db/schema.js";
import { TOKEN_SECRET } from "../../routes/auth.js";
import { registerSyncRoutes } from "../../routes/sync.js";
import { SyncGatewayService } from "../../services/sync/syncGatewayService.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const TEST_NS = "cloudSyncConflictResolution";
const ORG_ID = fixtureUuid(TEST_NS, 1);
const PATIENT_ID = fixtureUuid(TEST_NS, 2);
const VISIT_ID = fixtureUuid(TEST_NS, 3);
const DIARY_ID = fixtureUuid(TEST_NS, 4);
const PAYMENT_ID = fixtureUuid(TEST_NS, 5);

function isDbErr(err: unknown): boolean {
	if (!err) return false;
	const msg = err instanceof Error ? err.message : String(err);
	const causeMsg =
		(err as { cause?: unknown })?.cause instanceof Error
			? ((err as { cause: Error }).cause.message ?? "")
			: String((err as { cause?: unknown })?.cause ?? "");
	const combined = `${msg} ${causeMsg}`;
	return (
		/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|getaddrinfo|Connection terminated|Client has encountered a connection error|password authentication failed/i.test(
			combined,
		) ||
		/database "[^"]*" does not exist/i.test(combined) ||
		/role "[^"]*" does not exist/i.test(combined)
	);
}

describe("Cloud Sync Gateway & Conflict Resolution Tests", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	let databaseAvailable = true;

	before(async () => {
		app = createTenantTestApp();
		await registerSyncRoutes(app);

		clinicHeaders = {
			"x-dente-clinic-token": signToken(
				{ organizationId: ORG_ID },
				TOKEN_SECRET(),
			),
		};

		try {
			await SyncGatewayService.ensureSyncTablesExist();
			await purgeFixtureOrganizations([ORG_ID]);

			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_ID,
					name: "Cloud Sync Gateway Test Clinic",
				});

				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Соколов Дмитрий Сергеевич",
					phone: "+7 (999) 111-22-33",
					birthDate: "1988-04-12",
					notes: "Первичный пациент",
				});

				await db.insert(visits).values({
					id: VISIT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					status: "draft",
					complaint: "Периодическая ноющая боль",
					anamnesis: "Без аллергий",
				});

				await db.insert(visitDiaries).values({
					id: DIARY_ID,
					organizationId: ORG_ID,
					visitId: VISIT_ID,
					patientId: PATIENT_ID,
					anamnesis: "Без аллергий",
					statusLocalis: "Зуб 2.4 интактен",
					diagnosisIcd10: "K02.1",
					content: "Первичный осмотр полости рта",
				});
			});
		} catch (err) {
			if (!isDbErr(err)) throw err;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			try {
				await purgeFixtureOrganizations([ORG_ID]);
			} catch (err) {
				if (!isDbErr(err)) throw err;
			}
		}
		await app.close();
	});

	test("1. Idempotency: Financial payments with Idempotency-Key prevent duplicate billing and double spending", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const paymentMutationId = fixtureUuid(TEST_NS, 10);
		const paymentPayload = {
			patientId: PATIENT_ID,
			visitId: VISIT_ID,
			amountRub: 3500.5,
			method: "card",
			payerFullName: "Соколов Дмитрий Сергеевич",
			fiscalReceiptNumber: "ФН-1122334455",
			note: "Оплата терапевтического лечения",
		};

		const payloadHash = computePayloadHash(paymentPayload);
		const idempotencyKey = createCompositeIdempotencyKey(
			paymentMutationId,
			paymentPayload,
		);

		const batch1: SyncPushBatchRequest = {
			syncBatchId: fixtureUuid(TEST_NS, 11),
			clientId: "cabinet-dentist-1",
			sentAt: new Date().toISOString(),
			mutations: [
				{
					mutationId: paymentMutationId,
					idempotencyKey,
					payloadHash,
					entityKind: "payment",
					entityId: PAYMENT_ID,
					action: "create",
					payload: paymentPayload,
					updatedAt: "2026-08-22T12:00:00.000Z",
				},
			],
		};

		// 1. First Push: Creates payment row in database
		const res1 = await app.inject({
			method: "POST",
			url: "/api/sync/gateway",
			headers: clinicHeaders,
			payload: batch1,
		});

		assert.equal(res1.statusCode, 200);
		const body1 = res1.json();
		assert.equal(body1.appliedCount, 1);
		assert.equal(body1.duplicateCount, 0);
		assert.equal(body1.results[0]?.status, "applied");
		assert.equal(body1.results[0]?.entityKind, "payment");

		// Assert payments table has EXACTLY 1 payment row
		const paymentsInDb = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, idempotencyKey),
					),
				),
		);
		assert.equal(paymentsInDb.length, 1);
		assert.equal(Number(paymentsInDb[0]?.amountRub), 3500.5);

		// 2. Second Push (Repeated offline retry of identical packet): Must NOT create duplicate payment!
		const res2 = await app.inject({
			method: "POST",
			url: "/api/sync/gateway",
			headers: clinicHeaders,
			payload: batch1,
		});

		assert.equal(res2.statusCode, 200);
		const body2 = res2.json();
		assert.equal(body2.appliedCount, 0);
		assert.equal(body2.duplicateCount, 1);
		assert.equal(body2.results[0]?.status, "duplicate");

		// Assert payments table STILL has EXACTLY 1 payment row (zero duplicate charges!)
		const paymentsAfterRetry = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, idempotencyKey),
					),
				),
		);
		assert.equal(paymentsAfterRetry.length, 1);
		assert.equal(Number(paymentsAfterRetry[0]?.amountRub), 3500.5);

		// 3. Third Push with TAMPERED payload under the same Idempotency-Key: Must be REJECTED!
		const tamperedPayload = {
			...paymentPayload,
			amountRub: 99999.0, // Fraudulent amount alteration
		};
		const tamperedBatch: SyncPushBatchRequest = {
			syncBatchId: fixtureUuid(TEST_NS, 12),
			clientId: "cabinet-dentist-1",
			sentAt: new Date().toISOString(),
			mutations: [
				{
					mutationId: paymentMutationId,
					idempotencyKey,
					payloadHash: computePayloadHash(tamperedPayload),
					entityKind: "payment",
					entityId: PAYMENT_ID,
					action: "create",
					payload: tamperedPayload,
					updatedAt: "2026-08-22T12:05:00.000Z",
				},
			],
		};

		const res3 = await app.inject({
			method: "POST",
			url: "/api/sync/gateway",
			headers: clinicHeaders,
			payload: tamperedBatch,
		});

		assert.equal(res3.statusCode, 200);
		const body3 = res3.json();
		assert.equal(body3.rejectedCount, 1);
		assert.equal(body3.results[0]?.status, "rejected");
		assert.match(
			body3.results[0]?.error ?? "",
			/Idempotency-Key collision|hash mismatch|verification failed/i,
		);
	});

	test("2. Field-Level Merging & CRDT: Offline doctor edit (anamnesis) + online receptionist edit (phone) -> Both preserved without overwriting", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		// Baseline: Receptionist updates patient phone online at 14:00
		await withFixtureTenant(ORG_ID, async () => {
			await db
				.update(patients)
				.set({
					phone: "+7 (999) 777-88-99", // Receptionist updated phone online
					updatedAt: new Date("2026-08-22T14:00:00.000Z"),
				})
				.where(
					and(eq(patients.organizationId, ORG_ID), eq(patients.id, PATIENT_ID)),
				);

			await db.insert(syncEntityVectors).values({
				organizationId: ORG_ID,
				entityKind: "patient",
				entityId: PATIENT_ID,
				currentVersion: 2,
				vectorJson: {
					phone: {
						updatedAt: "2026-08-22T14:00:00.000Z",
						version: 2,
						authorId: "receptionist-user-id",
					},
					notes: {
						updatedAt: "2026-08-22T10:00:00.000Z",
						version: 1,
					},
				},
			});
		});

		// Doctor worked offline in Cabinet at 14:15, editing patient notes & visit anamnesis
		const doctorPatientPatch = {
			notes: "Особые указания: гипертонический криз в анамнезе, осторожно с адреналином!",
		};
		const doctorPatchHash = computePayloadHash(doctorPatientPatch);
		const doctorPatientMutationId = fixtureUuid(TEST_NS, 20);

		const doctorBatch: SyncPushBatchRequest = {
			syncBatchId: fixtureUuid(TEST_NS, 21),
			clientId: "cabinet-offline-tablet",
			sentAt: new Date().toISOString(),
			mutations: [
				{
					mutationId: doctorPatientMutationId,
					idempotencyKey: createCompositeIdempotencyKey(
						doctorPatientMutationId,
						doctorPatientPatch,
					),
					payloadHash: doctorPatchHash,
					entityKind: "patient",
					entityId: PATIENT_ID,
					action: "update",
					payload: doctorPatientPatch,
					updatedAt: "2026-08-22T14:15:00.000Z",
					mutationVector: {
						notes: {
							updatedAt: "2026-08-22T14:15:00.000Z",
							version: 2,
							authorId: "doctor-user-id",
						},
					},
				},
			],
		};

		// Push offline batch to sync gateway
		const res = await app.inject({
			method: "POST",
			url: "/api/sync/gateway",
			headers: clinicHeaders,
			payload: doctorBatch,
		});

		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.processedCount, 1);
		assert.ok(
			body.results[0]?.status === "merged" ||
				body.results[0]?.status === "conflict_resolved",
		);
		assert.deepEqual(body.results[0]?.mergedFields, ["notes"]);

		// VERIFICATION: Check database row directly!
		const [patientInDb] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(patients)
				.where(
					and(eq(patients.organizationId, ORG_ID), eq(patients.id, PATIENT_ID)),
				),
		);

		// CRITICAL INVARIANT:
		// 1. Receptionist's online phone update "+7 (999) 777-88-99" is KEPT intact!
		assert.equal(patientInDb?.phone, "+7 (999) 777-88-99");
		// 2. Doctor's offline notes update is MERGED and present!
		assert.equal(
			patientInDb?.notes,
			"Особые указания: гипертонический криз в анамнезе, осторожно с адреналином!",
		);
		// 3. Existing full name is preserved!
		assert.equal(patientInDb?.fullName, "Соколов Дмитрий Сергеевич");
	});

	test("3. Clinical Visit & Diary CRDT Merging: Anamnesis & status localis merge deterministically", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const diaryPatch = {
			anamnesis: "Отягощенный аллергоанамнез: отек Квинке на пенициллин",
			treatmentDescription: "Препарирование кариозной полости зуба 2.4, коффердам",
		};
		const diaryPatchHash = computePayloadHash(diaryPatch);
		const diaryMutationId = fixtureUuid(TEST_NS, 30);

		const batch: SyncPushBatchRequest = {
			syncBatchId: fixtureUuid(TEST_NS, 31),
			clientId: "cabinet-chair-1",
			sentAt: new Date().toISOString(),
			mutations: [
				{
					mutationId: diaryMutationId,
					idempotencyKey: createCompositeIdempotencyKey(
						diaryMutationId,
						diaryPatch,
					),
					payloadHash: diaryPatchHash,
					entityKind: "visit_diary",
					entityId: DIARY_ID,
					action: "update",
					payload: diaryPatch,
					updatedAt: "2026-08-22T15:00:00.000Z",
					mutationVector: {
						anamnesis: {
							updatedAt: "2026-08-22T15:00:00.000Z",
							version: 2,
						},
						treatmentDescription: {
							updatedAt: "2026-08-22T15:00:00.000Z",
							version: 1,
						},
					},
				},
			],
		};

		const res = await app.inject({
			method: "POST",
			url: "/api/sync/push",
			headers: clinicHeaders,
			payload: batch,
		});

		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.results[0]?.status, "merged");

		// Verify database row
		const [diaryInDb] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.organizationId, ORG_ID),
						eq(visitDiaries.id, DIARY_ID),
					),
				),
		);

		assert.equal(
			diaryInDb?.anamnesis,
			"Отягощенный аллергоанамнез: отек Квинке на пенициллин",
		);
		assert.equal(
			diaryInDb?.treatmentDescription,
			"Препарирование кариозной полости зуба 2.4, коффердам",
		);
		// Prior localis status preserved
		assert.equal(diaryInDb?.statusLocalis, "Зуб 2.4 интактен");
	});

	test("4. Pull Endpoint: Returns updated entities and vectors for offline client catch-up", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const res = await app.inject({
			method: "GET",
			url: "/api/sync/pull?since=2026-08-22T00:00:00.000Z",
			headers: clinicHeaders,
		});

		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.ok(Array.isArray(body.patients));
		assert.ok(Array.isArray(body.visits));
		assert.ok(Array.isArray(body.visitDiaries));
		assert.ok(Array.isArray(body.payments));
		assert.ok(Array.isArray(body.vectors));
		assert.ok(typeof body.serverTime === "string");

		// Assert patient and payment are in the pull delta
		const foundPatient = body.patients.find(
			(p: { id: string }) => p.id === PATIENT_ID,
		);
		assert.ok(foundPatient);
		assert.equal(foundPatient.phone, "+7 (999) 777-88-99");
	});
});
